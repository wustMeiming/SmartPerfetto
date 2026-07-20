# Master Research — Google Android Skills × SmartPerfetto

## Research question

Google's official `android/skills` repository is theoretical and prompt-heavy.
Which parts reveal real SmartPerfetto gaps, and which portable parts should be
synchronized to `Gracker/Perfetto-Skills`?

## Locked inputs

| Input | Reviewed identity |
|---|---|
| Google Android Skills | `main@47e1dff74a5cde5d0128c5d15e74e000323135ea` |
| Latest tagged release | `v1.0.5@aaf42b970f9e6ee49e38aabd5cd0d00612e04a5a` |
| SmartPerfetto | `68b7fbfa4e635feacdd2a57510a26abcbae4f9eb` |
| Perfetto-Skills | `718c5dcdd5de2feb920ce8719f69c8108f9f8317` |
| Perfetto source | current SmartPerfetto submodule, v57.2 |

The two official Perfetto subtrees are unchanged between `v1.0.5` and reviewed
`main`. The only post-release Skill is `play-policy-insights`.

## Executive conclusion

Do not import the repository as a second runtime and do not copy its 20 Skills
wholesale. The correct use is:

1. treat it as an independent upstream gap signal;
2. translate durable query behavior into deterministic YAML/validator/tests;
3. translate investigation order into Strategy/workflow methodology;
4. keep product-specific Android content out of the public trace-analysis
   repository;
5. verify every concrete SQL/table/causal claim against the pinned Perfetto
   source and owned trace fixtures.

Google's best contribution is method: inventory before action, schema before
SQL, facts before hypotheses, wall time versus CPU state, dependency traversal,
quantitative path with an explicit fallback, deterministic phase artifacts and
a second-pass search. Its weakest area is executable proof: the Perfetto Skills
have no trace fixtures or semantic regression suite, bundle an unversioned
stdlib Markdown snapshot, and contain stale names and over-strong causal claims.

## Directly useful official Skills

### `perfetto-sql`

Useful:

- stdlib-first schema discovery;
- open-duration normalization;
- UPID/UTID identity;
- interval overlap filtering;
- idempotent SQL;
- typed args;
- bounded validation.

Already covered in SmartPerfetto:

- `sqlGuardrailAnalyzer.ts` and tests;
- pinned source/schema/binary;
- runtime query review and Skills validation.

Correction required:

- `PARTITIONED` does not repair overlapping inputs to SPAN_JOIN;
- overlapping intervals can silently produce wrong rows, not necessarily
  crash;
- `GLOB` should be advisory, not an unconditional ban on LIKE.

Public gap:

- Perfetto-Skills has strong runtime/schema/fixture validation, but no native
  public SQL guardrail checklist/validator equivalent to SmartPerfetto's six
  rules.

### `perfetto-trace-analysis`

Useful:

- facts-only evidence chain;
- broad-to-narrow investigation;
- metrics/overview before custom SQL;
- exact-window thread-state decomposition;
- blocker traversal across processes;
- independent second-bottleneck search.

Already covered:

- plan/hypothesis/claim verification;
- evidence versus report/snapshot separation;
- global trace sanity;
- scene reconstruction;
- blocker/Binder/lock/IO chains;
- five-state missing evidence semantics.

Real gap:

- there is no explicit bounded closing sweep in the public workflow. Add a
  budgeted secondary scan or an explicit waiver for open-ended analysis.

Rejected detail:

- do not create an uncontrolled `_analysis.md` beside each trace; use typed
  evidence sidecars and product artifacts.

## The 71 hints

### Already covered intent

Most core techniques already exist as deterministic Skills:

- scheduling latency, Runnable/Running split, CPU topology/frequency/idle;
- startup state/blocking and global sanity;
- frame timeline, main/render thread and SurfaceFlinger;
- Binder storms and dependency chains;
- page fault/block IO/blocked functions;
- LMK, RSS/swap, PSI, DMA-BUF and heap dominators;
- suspend/wakelock/network/modem/rails.

### Candidate gaps requiring fixtures

1. same-CPU IRQ occupancy around wake-to-run delays;
2. kernel/hardware real-time policy and priority audit;
3. formally defined catch-up storm;
4. source-gated user/kernel sampled-time split;
5. page-cache inode/cold-warm controlled comparison;
6. CPU/GPU double-memory accounting when both sources exist;
7. bounded secondary bottleneck sweep.

### Examples that cannot be copied as written

- `binder_transaction` → `android_binder_txns`
- `service_name` → `interface`/`aidl_name`
- `cpu_slice` → `sched_slice`
- `actual_frame_timeline_frame` → `actual_frame_timeline_slice`
- `android_bitmaps` → `heap_graph_bitmaps` or `android_bitmap_*`
- `power_rails` integration → `android_power_rails_counters` with correct units
- `suspend_state` → `android_suspend_state`
- `kernel_wakelock` → `android_kernel_wakelocks`
- `network_packets` → `android_network_packets`
- `android_graphics_allocs` is absent from both the bundled snapshot and
  current v57.2 stdlib.

Examples of overclaim:

- frequency anomalies prove a governor bug;
- page faults prove storage contention;
- temporal proximity proves a kworker dependency;
- buffer-swap duration proves damage area;
- GPU memory correlation proves jank cause;
- equal bitmap properties prove duplicate content;
- a warm rerun proves page-cache causality.

## Transferable methods from non-Perfetto Skills

| Source | Method | SmartPerfetto use |
|---|---|---|
| Android CLI | exact journeys, layout-first inspection, structured per-step result | optional capture/reproduction contract |
| R8 analyzer | quantitative first, named heuristic downgrade | evidence confidence/fallback |
| Play policy insights | deterministic phase 1, isolated validated artifacts, selective retry, critic | evaluation and multi-runtime orchestration |
| Testing setup | inventory, fakes, layered test matrix | trace corpus capability matrix |
| Compose migration/adaptive | baseline before transformation, behavior separate from screenshots | frontend and query regression discipline |
| Wear Compose | version-matched primary examples | upstream/source lock discipline |
| Intent security | decision tables and anti-pattern reports | validator/rule design |
| CameraX | lifecycle/hardware-diversity blueprints | camera capture/evidence planning |

## SmartPerfetto action matrix

| Priority | Action | Destination | Proof required |
|---|---|---|---|
| P0 | add `android/skills` as a distinct upstream | governance/docs/tooling | exact commit/path/hash decisions |
| P0 | document/prove SPAN_JOIN non-overlap within partition | SQL validator/docs/tests | source proof plus fixture |
| P1 | bounded analysis-closure gate | Strategy/workflow | routing test and trace evidence |
| P1 | IRQ Runnable-delay correlation | YAML Skill | capability state plus semantic fixture |
| P1 | RT kernel-thread policy audit | YAML Skill | source availability plus semantic fixture |
| P1 | catch-up-storm detector | YAML Skill | formal definition and negative fixtures |
| P2 | capture journey contract | CLI/capture product | adapter tests, no Google CLI dependency |
| P2 | artifact validation before aggregation | eval/orchestration | schema and retry tests |
| P2 | capability-state trace corpus matrix | tests/docs | owned fixture manifest |

## Public Perfetto-Skills action matrix

Sync:

1. a separate lock/synchronizer/decision report for the two official profiler
   subtrees;
2. a corrected portable SQL guardrail reference;
3. a native Python guardrail validator integrated into query validation;
4. a bounded analysis-closure workflow;
5. future deterministic Skills only after SmartPerfetto YAML + fixture proof.

Do not sync:

- Android product implementation Skills;
- Android CLI as a mandatory runtime;
- scratchpads beside traces;
- unversioned stdlib Markdown;
- Provider/session/frontend/DataEnvelope internals;
- raw Google table names or causal wording;
- SmartPerfetto TypeScript runtime code.

## Architecture rationale

The proposed split follows current repository boundaries:

```text
Google android/skills
        │  exact lock + gap decisions
        ▼
corrected method / candidate behavior
        │
        ├── deterministic evidence + fixtures ──> SmartPerfetto YAML Skills
        ├── investigation order ────────────────> SmartPerfetto Strategies
        ├── product orchestration/capture ──────> SmartPerfetto only
        └── portable proven projection ─────────> Perfetto-Skills
```

Public code should be independently executable and tested. SmartPerfetto
product semantics remain private to that product surface. Similar naming is
never enough to mark an upstream item covered.

## Reviewer fallback

The repository requires an independent read-only review for this non-trivial
task. The read-only reviewer timed out twice. Per project rules, the fallback
was a structured self-review:

1. read references and scripts, not only top-level `SKILL.md`;
2. include CLI/capture and public-project boundaries;
3. lock source identity and license;
4. require executable path, fixture/test and missing-data semantics before
   calling an item covered;
5. cross-check Google claims against current Perfetto v57.2 source;
6. distinguish direct portable content, SmartPerfetto-only method and
   not-applicable product content.

## Source index

See `references/source-manifest.md` for SHA-pinned upstream links and current
Perfetto files, plus dumps 00–04 for local evidence and detailed classification.
