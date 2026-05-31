# ADR 0001: Commonware Simplex BFT Learning Boundary

## Status

Accepted for the learning repository.

## Goal

Build a small public repository that demonstrates the full engineering loop:

1. define a target;
2. collect implementation, paper, and community information;
3. reset the target to a realistic first slice;
4. implement the slice;
5. add CI/CD checks;
6. evaluate the result against the target.

The concrete target is a deterministic decision-log payload boundary that can be proposed to a Commonware Simplex BFT validator set.

## Research Notes

- `commonware-consensus` orders opaque messages in a Byzantine environment.
- `commonware_consensus::simplex` is a BFT agreement protocol inspired by Simplex Consensus.
- Commonware Simplex exposes application-defined payloads through automaton traits and supports certification before finalization.
- The docs describe optimistic finality, full finalization, lazy verification, pluggable cryptography, authenticated p2p assumptions, and WAL-backed persistence.
- The crate should be treated as evolving software. This repository is a lab, not a production deployment.

Primary references:

- https://docs.rs/commonware-consensus
- https://docs.rs/commonware-consensus/latest/commonware_consensus/simplex/
- https://github.com/commonwarexyz/monorepo
- https://eprint.iacr.org/2023/463.pdf

## Decision

Use Commonware Simplex as the consensus primitive and keep this first slice intentionally narrow:

- define a validator-set config;
- enforce the `n >= 3f + 1` and `2f + 1` quorum model;
- serialize decision events deterministically;
- hash payload bytes before they are proposed;
- document the missing pieces needed for a real multi-node devnet.

## Non-Goals

- no production deployment claim;
- no custom consensus protocol;
- no ad hoc networking layer;
- no validator key-generation workflow yet;
- no claim that local payload preparation alone is equivalent to finalized BFT consensus.

## Improvement Over A Single-Writer Log

A local single-writer log is easy to operate but trusts one process and one filesystem. The Commonware boundary moves the design toward:

- quorum-based finality instead of local append-only trust;
- fault tolerance with `f = floor((n - 1) / 3)`;
- deterministic application validation before finalization;
- recovery-oriented storage once the Commonware engine is wired;
- external proof paths through certificates in later slices.

## Evaluation Criteria

This slice is successful when:

- `cargo fmt --check` passes;
- `cargo test` passes;
- the CLI can generate a validator config;
- the CLI can prepare and hash a decision payload;
- README explains the goal, process, run commands, and current limitations.

The next slice should add a local multi-validator devnet and fault simulation.
