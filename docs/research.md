# Research Notes

## Question

Can a small learning repository use Commonware to demonstrate a credible BFT consensus path for a decision log?

## Sources Checked

- Commonware repository: https://github.com/commonwarexyz/monorepo
- `commonware-consensus` crate: https://docs.rs/commonware-consensus
- Simplex module docs: https://docs.rs/commonware-consensus/latest/commonware_consensus/simplex/
- Simplex Consensus paper: https://eprint.iacr.org/2023/463.pdf

## Findings

- Commonware is a Rust framework for building distributed systems in adversarial environments.
- `commonware-consensus` focuses on ordering opaque messages in a Byzantine environment.
- `commonware_consensus::simplex` is the relevant primitive for this lab.
- The application still owns payload validity. Commonware can order/certify/finalize payloads, but the app must define what a valid payload means.
- The realistic first slice is not a full production network. It is a deterministic payload and validator-set boundary that can later be wired into the Commonware engine.

## Goal Reset

Original broad goal:

```text
Implement BFT consensus with Commonware.
```

Feasible first goal:

```text
Build a public learning repo that prepares deterministic decision-log payloads for Commonware Simplex, documents the BFT model, runs CI, and records limitations.
```

## Next Research Questions

- Which Commonware runtime and p2p examples are best suited for a 4-validator local devnet?
- What key scheme should this lab use for validator identity and certificates?
- What persistence path should be exposed in the lab so restart recovery is observable?
- Which fault simulations are small enough for CI and still meaningful?
