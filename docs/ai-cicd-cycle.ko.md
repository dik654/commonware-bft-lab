# AI CI/CD Cycle

이 repository는 자체 CI/CD를 가집니다. context-manager는 cycle을 관찰하고 bootstrap할 수 있지만, 이 repository의 GitHub Actions와 pull request가 진실원천입니다.

## Repository Cycle

| 단계 | Repository evidence | 현재 설정 |
|---|---|---|
| Scope | PR changed files, local diff, issue/task link | 구현 전 의도한 변경을 추적합니다. |
| Attach CI/CD | `.github/workflows/ai-ci.yml`, `scripts/ai-quality-gates.mjs`, `ai-cicd.config.json` | `ai-cicd-bootstrap`으로 설치됨. |
| Run Gates | GitHub Actions checks and local commands | Profile: `rust`. |
| Review | PR review, AI review hook, risk notes | AI review workflow 활성화. |
| Evidence | benchmark artifacts, baseline/current/delta notes | Benchmark workflow 활성화. |
| Merge / Deploy | protected branch, environment approval, deploy workflow | deployment target이 설정되기 전까지 manual. |

## Commands

| Gate | Command |
|---|---|
| Install | `rustup show` |
| Lint | `cargo fmt --check && cargo clippy --all-targets --all-features -- -D warnings` |
| Typecheck | `cargo check --all-targets --all-features` |
| Test | `cargo test --all-features` |
| Build | `cargo build --release` |
| Benchmark | `not configured` |
| Deploy | `not configured` |

## Pull Request Rule

AI-assisted PR은 다음을 포함해야 합니다:

- 변경 의도
- 변경 파일
- 로컬에서 실행한 명령
- GitHub Actions 결과
- AI review 또는 human review notes
- improvement를 주장하는 경우 benchmark/evidence link
- 남은 risk 및 rollback plan

## 확장 지점

- 새 gate는 `ai-cicd.config.json`과 `.github/workflows/ai-ci.yml`을 수정해 추가합니다.
- AI review는 `AI_REVIEW_WEBHOOK_URL` repository secret을 설정해 추가합니다.
- improvement tracking은 benchmark artifact를 저장하고 PR에서 링크해 추가합니다.
