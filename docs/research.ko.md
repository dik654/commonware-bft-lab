# 조사 기록

## 질문

작은 학습용 레포에서 Commonware를 이용해 decision log를 위한 credible BFT consensus 경로를 보여줄 수 있는가?

## 확인한 자료

- Commonware repository: https://github.com/commonwarexyz/monorepo
- `commonware-consensus` crate: https://docs.rs/commonware-consensus
- Simplex module docs: https://docs.rs/commonware-consensus/latest/commonware_consensus/simplex/
- Simplex Consensus paper: https://eprint.iacr.org/2023/463.pdf
- BFT consensus 구현·실험 로드맵: `docs/bft-consensus-roadmap.ko.md`

## 발견한 점

- Commonware는 adversarial environment에서 distributed system을 만들기 위한 Rust framework입니다.
- `commonware-consensus`는 Byzantine 환경에서 opaque message ordering을 담당합니다.
- `commonware_consensus::simplex`가 이 lab에 맞는 핵심 primitive입니다.
- payload validity는 application이 책임져야 합니다. Commonware는 payload를 order/certify/finalize할 수 있지만, 무엇이 valid payload인지는 application이 정의해야 합니다.
- 현실적인 첫 slice는 완전한 production network가 아닙니다. 이후 Commonware engine에 연결할 수 있는 deterministic payload 및 validator-set boundary를 만드는 것입니다.

## 목표 재설정

처음의 넓은 목표:

```text
Commonware로 BFT consensus를 구현한다.
```

가능한 첫 목표:

```text
Commonware Simplex에 제출할 deterministic decision-log payload를 준비하고, BFT model, CI, 한계를 문서화하는 공개 학습용 레포를 만든다.
```

## 다음 조사 질문

- 4-validator local devnet에는 어떤 Commonware runtime 및 p2p example이 가장 적합한가?
- validator identity와 certificate에는 어떤 key scheme을 사용할 것인가?
- restart recovery를 관찰 가능하게 하려면 어떤 persistence path를 lab에 노출해야 하는가?
- CI에서 실행할 만큼 작으면서도 의미 있는 fault simulation은 무엇인가?
- PBFT, Tendermint, HotStuff, DAG BFT, hybrid BFT를 같은 deterministic simulator에서 비교하려면 공통 message/step metric을 어떻게 정의할 것인가?
