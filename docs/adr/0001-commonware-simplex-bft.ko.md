# ADR 0001: Commonware Simplex BFT 학습 경계

## 상태

학습용 레포의 기준 결정으로 채택.

## 목표

작은 공개 레포에서 다음 engineering loop를 보여준다:

1. 목표 정의;
2. 구현체, 논문, 커뮤니티 정보 수집;
3. 현실적인 첫 slice로 목표 재설정;
4. slice 구현;
5. CI/CD 검사 추가;
6. 목표 대비 결과 평가.

구체적인 목표는 Commonware Simplex BFT validator set에 proposal할 수 있는 deterministic decision-log payload boundary를 만드는 것입니다.

## 조사 기록

- `commonware-consensus`는 Byzantine environment에서 opaque message를 ordering합니다.
- `commonware_consensus::simplex`는 Simplex Consensus에서 영감을 받은 BFT agreement protocol입니다.
- Commonware Simplex는 automaton trait을 통해 application-defined payload를 노출하고 finalization 전 certification을 지원합니다.
- 문서상 optimistic finality, full finalization, lazy verification, pluggable cryptography, authenticated p2p assumptions, WAL-backed persistence를 다룹니다.
- crate는 계속 발전 중인 software로 다뤄야 합니다. 이 repository는 lab이지 production deployment가 아닙니다.

주요 참고 자료:

- https://docs.rs/commonware-consensus
- https://docs.rs/commonware-consensus/latest/commonware_consensus/simplex/
- https://github.com/commonwarexyz/monorepo
- https://eprint.iacr.org/2023/463.pdf

## 결정

Commonware Simplex를 consensus primitive로 사용하고, 첫 slice는 의도적으로 좁게 유지합니다:

- validator-set config 정의;
- `n >= 3f + 1` 및 `2f + 1` quorum model 적용;
- decision event를 deterministic하게 serialize;
- proposal 전 payload bytes hash 생성;
- 실제 multi-node devnet에 필요한 누락 요소 문서화.

## 비목표

- production deployment 주장 없음;
- custom consensus protocol 구현 없음;
- ad hoc networking layer 구현 없음;
- validator key-generation workflow는 아직 없음;
- local payload preparation만으로 finalized BFT consensus와 같다고 주장하지 않음.

## single-writer log 대비 개선점

local single-writer log는 운영이 쉽지만 하나의 process와 filesystem을 신뢰합니다. Commonware boundary는 설계를 다음 방향으로 이동시킵니다:

- local append-only trust 대신 quorum-based finality;
- `f = floor((n - 1) / 3)` fault tolerance;
- finalization 전 deterministic application validation;
- Commonware engine wiring 이후 recovery-oriented storage;
- 다음 slice에서 certificate 기반 external proof path.

## 평가 기준

이번 slice는 다음 조건을 만족하면 성공입니다:

- `cargo fmt --check` 통과;
- `cargo test` 통과;
- CLI가 validator config를 생성할 수 있음;
- CLI가 decision payload를 prepare/hash할 수 있음;
- README가 목표, 과정, 실행 명령, 현재 한계를 설명함.

다음 slice는 local multi-validator devnet과 fault simulation을 추가해야 합니다.
