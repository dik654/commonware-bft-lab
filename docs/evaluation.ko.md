# 결과 평가

## 목표

Commonware-backed BFT consensus를 목표 설정부터 구현까지 따라갈 수 있는 GitHub-readable 학습용 레포를 만든다.

## 완료한 것

- standalone Rust repository 생성.
- `commonware-consensus = "2026.5.0"` 추가.
- BFT primitive로 `commonware_consensus::simplex` 선택.
- validator-set model 구현.
- `f = floor((n - 1) / 3)` 및 `2f + 1` quorum 계산 구현.
- deterministic JSON payload serialization 구현.
- SHA-256 payload hashing 구현.
- config generation, payload preparation, runbook output CLI 추가.
- README, ADR, research notes, evaluation notes 작성.
- GitHub Actions CI 추가.

## 검증

로컬 검사:

```bash
cargo fmt --check
cargo test --locked
cargo clippy --locked -- -D warnings
```

결과:

```text
passed
```

## 개선된 점

single local writer와 비교하면, 이 설계는 consensus boundary를 명시적으로 만듭니다:

- validator set이 first-class data가 됨;
- quorum math가 test로 보호됨;
- proposal 전에 payload bytes가 deterministic해짐;
- Commonware Simplex integration point가 문서화됨;
- 넓은 주장 뒤에 숨기지 않고 limitation을 드러냄.

## 아직 부족한 점

- 실행 중인 Commonware Simplex validator network.
- 실제 validator key generation.
- authenticated p2p configuration.
- persistent finalized log output.
- failed 또는 Byzantine validator 1개에 대한 fault simulation.
- measured finality latency.

## 판정

첫 slice는 학습용 레포와 design boundary로는 성공입니다. 아직 complete BFT consensus deployment는 아닙니다.

다음 의미 있는 milestone은 local 4-validator devnet에서 하나의 `DecisionPayload`를 finalize하고, validator 1개를 중지해도 살아남는 것을 확인하는 것입니다.
