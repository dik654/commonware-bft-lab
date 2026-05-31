# Evaluation

## Target

Build a GitHub-readable learning repository that shows the path from goal to implementation for Commonware-backed BFT consensus.

## Completed

- Created a standalone Rust repository.
- Added `commonware-consensus = "2026.5.0"`.
- Selected `commonware_consensus::simplex` as the BFT primitive.
- Implemented a validator-set model.
- Implemented `f = floor((n - 1) / 3)` and `2f + 1` quorum calculation.
- Implemented deterministic JSON payload serialization.
- Implemented SHA-256 payload hashing.
- Added CLI commands for config generation, payload preparation, and runbook output.
- Added README, ADR, research notes, and evaluation notes.
- Added GitHub Actions CI.

## Milestone Evidence

| Milestone | Evidence | Command | Result |
|---|---|---|---|
| M0 payload boundary | `ConsensusConfig`, `DecisionPayload`, `PreparedBlock` | `cargo test --locked` | passed |
| M0 config CLI | generated 4-validator config | `cargo run -- init-config` | emits JSON config |
| M0 payload CLI | prepared example decision payload | `cargo run -- prepare --config /tmp/commonware-bft-lab.json --payload examples/decision-payload.json` | emits payload hash |
| docs navigation | docs index, Mermaid flow, milestone checklist | inspect `docs/README.md` and `docs/milestones.md` | present |

## Verification

Local checks:

```bash
cargo fmt --check
cargo test --locked
cargo clippy --locked -- -D warnings
```

Result:

```text
passed
```

## What Improved

Compared with a single local writer, this design makes the consensus boundary explicit:

- the validator set is first-class data;
- quorum math is tested;
- payload bytes are deterministic before proposal;
- the Commonware Simplex integration point is documented;
- limitations are visible instead of hidden behind a broad claim.

## What Is Still Missing

- A running Commonware Simplex validator network.
- Real validator key generation.
- Authenticated p2p configuration.
- Persistent finalized log output.
- Fault simulation for one failed or Byzantine validator.
- Measured finality latency.

## Next Acceptance Targets

| Next milestone | Concrete target | Required tests |
|---|---|---|
| M1 simulator | deterministic scheduler with delay/drop rules | `sim_replays_same_transcript_for_same_seed`, `sim_delays_messages_by_rule`, `sim_drops_messages_by_rule` |
| M2 PBFT | 4-validator PBFT baseline commits one block and rejects equivocation | `pbft_commits_with_four_validators_and_no_faults`, `pbft_never_commits_two_blocks_at_same_height` |
| M5 Commonware devnet | 4 local validators finalize one `DecisionPayload` | `commonware_payload_hash_matches_prepared_block`, `decision_log_appends_finalized_payload_once` |

## Verdict

The first slice is successful as a learning repository and design boundary. It is not yet a complete BFT consensus deployment.

The next meaningful milestone is a local 4-validator devnet that finalizes one `DecisionPayload` and survives one validator being stopped.
