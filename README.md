# Commonware BFT Lab

Korean version: `README.ko.md`

This is a learning repository for implementing a small BFT consensus boundary with Commonware and documenting the full engineering loop.

The repository does not claim to be a production blockchain or a complete validator network. It is a first slice: deterministic decision-log payloads, validator-set rules, Commonware Simplex as the selected consensus primitive, CI checks, and an explicit evaluation section.

## Process

```text
goal
  -> research implementations, papers, docs, and community signals
  -> reset to a feasible first target
  -> implement the first target
  -> add CI checks
  -> evaluate the result
```

## Goal

Use `commonware_consensus::simplex` to move from a single local writer model toward a BFT replicated decision log.

The realistic first target is:

- model a validator set;
- calculate `f = floor((n - 1) / 3)` and `2f + 1` quorum;
- serialize a decision-log payload deterministically;
- hash the payload before consensus proposal;
- document how this boundary connects to Commonware Simplex.

## Research Summary

Commonware provides Rust primitives for adversarial environments. Its `commonware-consensus` crate orders opaque messages in a Byzantine environment, and the `simplex` module is a BFT agreement implementation inspired by the Simplex Consensus paper.

The useful properties for this lab are:

- application-defined payload format;
- certification before finalization;
- optimistic and full finality paths;
- pluggable cryptography and hashing;
- authenticated p2p assumptions;
- persistence support through Commonware storage internals once the engine is wired.

References:

- Commonware repository: https://github.com/commonwarexyz/monorepo
- `commonware-consensus`: https://docs.rs/commonware-consensus
- Simplex module docs: https://docs.rs/commonware-consensus/latest/commonware_consensus/simplex/
- Simplex paper: https://eprint.iacr.org/2023/463.pdf

Longer notes are in `docs/research.md`.

## What Is Implemented

- `ConsensusConfig`: network id, storage directory, validator set, payload size limit.
- `Validator`: id, public key placeholder, network address.
- `DecisionPayload`: the application-level decision event.
- `PreparedBlock`: payload bytes plus SHA-256 hash.
- CLI commands:
  - `init-config`
  - `prepare`
  - `runbook`
- Unit tests for quorum, validator validation, commonware boundary, and payload hashing.
- GitHub Actions CI for format, tests, and clippy.

## Run

Generate a 4-validator local config:

```bash
cargo run -- init-config > /tmp/commonware-bft-lab.json
```

Prepare a decision payload:

```bash
cargo run -- prepare \
  --config /tmp/commonware-bft-lab.json \
  --payload examples/decision-payload.json
```

Print the next integration steps:

```bash
cargo run -- runbook --config /tmp/commonware-bft-lab.json
```

Run verification:

```bash
cargo fmt --check
cargo test
cargo clippy -- -D warnings
```

## Design

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

This repo implements the top half of that flow and documents the Commonware integration point. The next implementation slice is a local multi-validator devnet.

## Improvement Over The Existing Single-Writer Shape

Before BFT, a decision log can be a single local append-only file. That is simple, but it centralizes correctness and availability around one writer.

With a Commonware BFT direction:

- **Fault tolerance**: 4 validators can tolerate 1 Byzantine validator; 7 can tolerate 2.
- **Quorum finality**: accepted decisions can be backed by `2f + 1` validator agreement.
- **Deterministic validation**: honest nodes can run the same payload validation before finalization.
- **Recovery path**: Commonware Simplex is designed around persistent consensus state.
- **External proof path**: later slices can expose certificates instead of asking clients to trust one process.

## Current Limitations

- This is a learning lab, not a production deployment.
- The CLI prepares payloads; it does not yet start a live Commonware validator network.
- Validator keys are placeholders.
- p2p, storage, signer setup, deployment, and fault simulation are next slices.

## Evaluation

Completed in this slice:

- realistic goal reset documented in `docs/adr/0001-commonware-simplex-bft.md`;
- research notes documented in `docs/research.md`;
- Commonware dependency wired through the Rust crate;
- deterministic payload boundary implemented;
- tests added for the consensus math and payload preparation;
- CI workflow added for GitHub visibility.

The current result is recorded in `docs/evaluation.md`.

Next slice:

1. implement a local 4-validator devnet;
2. add restart recovery test;
3. simulate one failed validator;
4. record latency and finality observations in `docs/evaluation.md`.
