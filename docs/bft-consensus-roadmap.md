# BFT Consensus Implementation And Experiment Roadmap

Date: 2026-05-31

Korean version: `bft-consensus-roadmap.ko.md`

## Goal

Turn the BFT comparison topic into an executable lab.

The goal is not to build a production chain immediately. The goal is to reproduce the improvement ideas from PBFT-style protocols through HotStuff-style protocols, DAG BFT, and hybrid BFT in small Rust experiments, then compare latency, throughput, message count, and finality behavior under the same workload and fault model.

## Roadmap Flow

```mermaid
flowchart TD
    A[Current Commonware payload boundary] --> B[Deterministic simulation harness]
    B --> C[PBFT baseline]
    C --> D[Tendermint-style round and lock]
    D --> E[HotStuff-style chained voting]
    E --> F[DAG mempool and Bullshark-style ordering]
    F --> G[Hybrid fast path and DAG fallback]
    G --> H[Commonware integration with validated assumptions]

    C --> C1[Measure O(n^2) message growth]
    D --> D1[Test lock, nil vote, timeout]
    E --> E1[Measure QC aggregation and pipelining]
    F --> F1[Separate data availability from ordering]
    G --> G1[Test mode switch and attack surface]
```

## Blog Summary

The BFT comparison flow is:

- PBFT: prepare/commit all-to-all, `O(n^2)` normal path, expensive view change.
- Tendermint/CometBFT: propose/prevote/precommit rounds with lock and polka rules.
- HotStuff: leader aggregates votes for linear communication and chained commit.
- HotStuff-2: two-phase responsive BFT reduces happy-path latency.
- Narwhal/Bullshark: separates data availability from ordering and orders over a DAG.
- Mysticeti: DAG-based leaderless fast commit path.
- Autobahn: combines a leader fast path with a DAG fallback.
- Avalanche/Snowball: probabilistic finality through repeated sub-sampling, not deterministic quorum BFT.
- Filecoin F3/GossiPBFT: retrofits a BFT finality layer over a longest-chain family.

## First Implementation Scope

The implemented slice already covers:

- validator-set modeling;
- `f = floor((n - 1) / 3)` and `2f + 1` quorum;
- deterministic `DecisionPayload` serialization;
- payload hashing before proposal;
- documented Commonware Simplex integration point.

The next slice starts the experiment harness.

## Implementation Order

1. **Deterministic simulation harness**
   - Model nodes, network delay, drops, and Byzantine behavior in an in-memory event loop.
   - Start without cryptography and verify vote identity plus quorum math first.
   - Measure decided height, finality steps, message count, and timeout count.

2. **PBFT baseline**
   - Implement `pre-prepare -> prepare -> commit`.
   - Measure normal-path `O(n^2)` message growth for n=4/7/10/25.
   - Use Byzantine leader equivocation and slow replicas as fault cases.

3. **Tendermint-style round/lock**
   - Implement `propose -> prevote -> precommit -> commit` plus lock/unlock.
   - Test nil vote, proposer timeout, and higher-round polka behavior.
   - Lock safety invariants should be fixed as tests.

4. **HotStuff-style chained voting**
   - Implement QC, parent link, and 3-chain commit rule.
   - Compare message count and pipelining against PBFT/Tendermint.
   - Keep HotStuff-2 two-phase behavior as a later experiment branch.

5. **DAG mempool + Bullshark-style ordering**
   - Create validator batch vertices and round certificates.
   - Separate data availability DAG from the ordering layer.
   - Compare throughput advantage and latency penalty under the same workload.

6. **Hybrid experiment**
   - Use a leader/HotStuff-style fast path normally and a DAG path during congestion or faults.
   - Measure whether mode switching improves performance and whether attackers can force bad switches.

## Experiment Matrix

| Axis | Values |
| --- | --- |
| validator count | 4, 7, 10, 25 |
| fault count | 0, 1, f |
| fault type | crashed leader, slow replica, equivocating leader, delayed quorum, message drop |
| network | LAN-like fixed delay, WAN-like jitter, before/after partial synchrony GST |
| workload | 1 tx/block, 100 tx/block, large batch |
| metrics | finality latency, committed blocks/sec, messages/decision, bytes/decision, timeout count, view/round changes |

## Testing Principles

- Safety should be property-test-like: fail if two honest nodes commit different blocks at the same height.
- Liveness should be checked as eventual commit after GST in a deterministic scheduler.
- Compare simulated step/message count before wall-clock time.
- Add real Commonware integration after simulator invariants are stable.
- Every improvement idea must state which baseline metric it improves before implementation.

## Next PR Units

1. Add a `sim` module: node id, message, scheduler, network delay/drop model.
2. Implement PBFT baseline and 4-validator safety/liveness tests.
3. Add benchmark or snapshot output for message count by validator count.
4. Add PBFT baseline results to README/evaluation.
