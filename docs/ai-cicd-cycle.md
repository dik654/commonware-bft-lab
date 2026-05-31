# AI CI/CD Cycle

This repository owns its CI/CD. context-manager can observe and bootstrap the cycle, but GitHub Actions and pull requests in this repository are the source of truth.

## Repository Cycle

| Stage | Repository evidence | Current setup |
|---|---|---|
| Scope | PR changed files, local diff, issue/task link | Track the intended change before implementation. |
| Attach CI/CD | `.github/workflows/ai-ci.yml`, `scripts/ai-quality-gates.mjs`, `ai-cicd.config.json` | Installed by `ai-cicd-bootstrap`. |
| Run Gates | GitHub Actions checks and local commands | Profile: `rust`. |
| Review | PR review, AI review hook, risk notes | AI review workflow enabled. |
| Evidence | benchmark artifacts, baseline/current/delta notes | Benchmark workflow enabled. |
| Merge / Deploy | protected branch, environment approval, deploy workflow | Deployment remains manual until a target is configured. |

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

Every AI-assisted PR should include:

- Change intent
- Files changed
- Local commands run
- GitHub Actions result
- AI review or human review notes
- Benchmark/evidence link when the change claims an improvement
- Remaining risk and rollback plan

## Extension Points

- Add new gates by editing `ai-cicd.config.json` and `.github/workflows/ai-ci.yml`.
- Add AI review by setting the `AI_REVIEW_WEBHOOK_URL` repository secret.
- Add improvement tracking by saving benchmark artifacts and linking them from the PR.
