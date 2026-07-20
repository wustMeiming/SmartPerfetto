# Research Dump 03 — SmartPerfetto 当前覆盖与缺口

## Current baseline

- SmartPerfetto commit:
  `68b7fbfa4e635feacdd2a57510a26abcbae4f9eb`
- YAML Skills: 239
- Strategy/template Markdown: 101
- Existing SQL guardrail implementation:
  `backend/src/services/sqlGuardrailAnalyzer.ts`
- Existing guardrail tests:
  `backend/src/services/__tests__/sqlGuardrailAnalyzer.test.ts`
- Existing broad triage:
  `backend/skills/composite/global_trace_sanity_check.skill.yaml`
- Existing upstream translation SOP:
  `backend/skills/docs/upstream-perfetto-ai-skill-translation.sop.md`

The SQL guardrail engine was introduced by commit
`8e34c0a82a50134f1f3f22898e55e24f24e35ac4` on 2026-05-16, two days after the
official Perfetto Skill's recorded last update. It already implements six
rules:

- prefer GLOB over LIKE, advisory;
- safe open-ended duration, advisory;
- overlap window filters, advisory;
- partitioned/idempotent SPAN_JOIN, default;
- idempotent CREATE, default;
- EXTRACT_ARG, default.

This means the official SQL checklist is mostly `already_covered`, not a new
feature request.

## Gap priorities

### P0 — Correctness/governance

#### G1. Track `android/skills` as a separate upstream

The current public upstream synchronizer tracks
`google/perfetto/ai/skills/perfetto`, not `github.com/android/skills`. Similar
names do not prove equivalent coverage. Add a separate lock and exact
path/hash decision set for:

- `profilers/perfetto-sql/**`
- `profilers/perfetto-trace-analysis/**`

Do not lock all 20 Skills into the performance repository. Keep stable release
promotion and main-branch canary separate.

#### G2. Prove SPAN_JOIN non-overlap, not just partitioning

Add a documented precondition and, where feasible, a fixture-backed check for
non-overlapping intervals within each partition. If input intervals may
overlap, normalize them with a current stdlib interval operation or avoid
SPAN_JOIN. A static regex cannot establish this property by itself.

### P1 — High-value executable gaps

#### G3. Bounded analysis-closure gate

For open-ended investigation only, after the primary hypothesis chain:

1. rerun or reuse global sanity evidence;
2. check the top independent CPU, Runnable, D-state and long-slice anomalies;
3. record either a second issue or an explicit no-material-secondary-signal
   result;
4. stop at a query/time budget.

This absorbs Google's “do not stop at the first bottleneck” idea without an
unbounded instruction to investigate every hint.

#### G4. Three candidate atomic Skills

1. `irq_runnable_delay_correlation`: prove same-CPU overlap between a target
   Runnable delay and IRQ/softirq occupancy.
2. `realtime_kernel_thread_policy_audit`: report sched policy/priority only
   when the required trace source exposes it.
3. `thread_catchup_storm_detection`: formally define the inactive gap, burst
   window, density baseline, target identity and false-positive exclusions.

Each requires a missing-data contract and semantic fixture before promotion.

### P2 — Product/process improvements

#### G5. Repro journey attached to capture

Use Android CLI's exact-step journey idea as an optional `smp capture`
companion:

- application/build/device identity;
- exact action and expected-state sequence;
- timestamped action boundaries or trace markers;
- layout/screenshot evidence when available;
- per-step pass/fail/skip output.

Do not make Google Android CLI a runtime dependency. Define an adapter boundary
and allow ADB/manual journey producers.

#### G6. Artifact validation before aggregation

Adopt the useful `play-policy-insights` orchestration rules for evaluation and
multi-runtime review:

- deterministic base artifact first;
- isolated output per worker/runtime;
- JSON/schema validation before aggregation;
- retry only missing or invalid artifacts;
- critic pass over claims and gaps;
- final provenance over every accepted artifact.

SmartPerfetto already has separate output surfaces; this is a process
strengthening, not a new prompt.

#### G7. Coverage matrix for trace corpus

Borrow the testing Skill's matrix thinking:

- capability/state dimensions rather than Android version alone;
- positive, recorded-empty, not-recorded, unsupported and unknown cases;
- query behavior separate from report rendering;
- small number of end-to-end scenarios, many deterministic unit/fixture cases.

## Explicit non-gaps

- Facts versus hypotheses: covered by plan/hypothesis and claim verification.
- Evidence provenance: covered by evidence/report/snapshot separation.
- Missing data: covered by five-state availability semantics.
- Target identity: covered by process identity resolver and identity gate.
- Broad initial scan: covered by trace overview/global sanity.
- Wall time versus CPU/thread states: strongly covered across startup, jank,
  ANR, CPU and selection workflows.
- Blocker traversal: covered by blocking-chain, Binder, lock and I/O Skills.
- Current stdlib/binary identity: stronger than the official repository.
