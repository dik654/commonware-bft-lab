# Commonware BFT Lab

Commonware를 이용해 작은 BFT 컨센서스 경계를 구현하고, 목표 설정부터 조사, 목표 재설정, 구현, CI, 평가까지의 전체 흐름을 경험하기 위한 학습용 레포입니다.

이 레포는 production blockchain이나 완성된 validator network를 주장하지 않습니다. 현재 범위는 1차 slice입니다: 결정 로그 payload를 결정적으로 준비하고, validator set 규칙을 모델링하고, Commonware Simplex를 선택한 이유와 한계를 문서화합니다.

## 과정

```text
목표
  -> 구현체, 논문, 문서, 커뮤니티 신호 조사
  -> 가능한 1차 목표로 재설정
  -> 1차 목표 구현
  -> CI 검사 추가
  -> 결과 평가
```

## 목표

`commonware_consensus::simplex`를 이용해 단일 로컬 writer 모델에서 BFT replicated decision log 방향으로 이동하는 첫 경계를 만든다.

현실적인 1차 목표는 다음입니다:

- validator set 모델링;
- `f = floor((n - 1) / 3)` 및 `2f + 1` quorum 계산;
- decision-log payload를 결정적으로 직렬화;
- consensus proposal 전에 payload hash 생성;
- 이 경계가 Commonware Simplex와 어떻게 연결되는지 문서화.

## 조사 요약

Commonware는 adversarial environment에서 distributed system을 만들기 위한 Rust primitive를 제공합니다. `commonware-consensus` crate는 Byzantine 환경에서 opaque message ordering을 담당하고, `simplex` module은 Simplex Consensus 논문에서 영감을 받은 BFT agreement 구현입니다.

이 lab에서 유용한 속성은 다음입니다:

- application-defined payload format;
- finalization 전 certification;
- optimistic finality와 full finality 경로;
- pluggable cryptography 및 hashing;
- authenticated p2p 가정;
- engine wiring 이후 Commonware storage internals를 통한 persistence 지원.

참고 자료:

- Commonware repository: https://github.com/commonwarexyz/monorepo
- `commonware-consensus`: https://docs.rs/commonware-consensus
- Simplex module docs: https://docs.rs/commonware-consensus/latest/commonware_consensus/simplex/
- Simplex paper: https://eprint.iacr.org/2023/463.pdf

자세한 조사 기록은 `docs/research.ko.md`에 있습니다.

## 구현된 것

- `ConsensusConfig`: network id, storage directory, validator set, payload size limit.
- `Validator`: id, public key placeholder, network address.
- `DecisionPayload`: application-level decision event.
- `PreparedBlock`: payload bytes와 SHA-256 hash.
- CLI commands:
  - `init-config`
  - `prepare`
  - `runbook`
- quorum, validator validation, Commonware boundary, payload hashing 단위 테스트.
- format, test, clippy를 위한 GitHub Actions CI.

## 실행

4-validator local config 생성:

```bash
cargo run -- init-config > /tmp/commonware-bft-lab.json
```

decision payload 준비:

```bash
cargo run -- prepare \
  --config /tmp/commonware-bft-lab.json \
  --payload examples/decision-payload.json
```

다음 integration step 출력:

```bash
cargo run -- runbook --config /tmp/commonware-bft-lab.json
```

검증:

```bash
cargo fmt --check
cargo test
cargo clippy -- -D warnings
```

## 설계

```text
DecisionPayload
    |
    v
serde_json deterministic bytes
    |
    v
PreparedBlock { payload_hash, payload_bytes }
    |
    v
commonware_consensus::simplex::Engine
    |
    v
finalized replicated decision log
```

이 레포는 위 흐름의 상단 절반을 구현하고 Commonware integration point를 문서화합니다. 다음 구현 slice는 local multi-validator devnet입니다.

## 기존 single-writer 구조 대비 개선점

BFT 이전의 decision log는 단일 로컬 append-only file일 수 있습니다. 단순하지만 correctness와 availability가 하나의 writer에 집중됩니다.

Commonware BFT 방향으로 이동하면 다음이 가능해집니다:

- **Fault tolerance**: validator 4개는 Byzantine validator 1개, validator 7개는 2개까지 견딜 수 있습니다.
- **Quorum finality**: accepted decision을 `2f + 1` validator agreement로 뒷받침할 수 있습니다.
- **Deterministic validation**: honest node들이 finalization 전에 같은 payload validation을 실행할 수 있습니다.
- **Recovery path**: Commonware Simplex는 persistent consensus state를 전제로 설계되어 있습니다.
- **External proof path**: 다음 slice에서는 단일 process를 신뢰하라고 요구하는 대신 certificate를 노출할 수 있습니다.

## 현재 한계

- 학습용 lab이며 production deployment가 아닙니다.
- CLI는 payload를 준비하지만 live Commonware validator network를 아직 시작하지 않습니다.
- validator key는 placeholder입니다.
- p2p, storage, signer setup, deployment, fault simulation은 다음 slice입니다.

## 평가

이번 slice에서 완료한 것:

- 가능한 목표 재설정을 `docs/adr/0001-commonware-simplex-bft.ko.md`에 기록;
- 조사 기록을 `docs/research.ko.md`에 기록;
- Commonware dependency를 Rust crate에 연결;
- deterministic payload boundary 구현;
- consensus math 및 payload preparation test 추가;
- GitHub visibility를 위한 CI workflow 추가.

현재 결과 평가는 `docs/evaluation.ko.md`에 있습니다.

다음 slice:

1. local 4-validator devnet 구현;
2. restart recovery test 추가;
3. validator 1개 실패 simulation;
4. latency 및 finality 관찰 결과를 `docs/evaluation.ko.md`에 기록.
