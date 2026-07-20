# Research Dump 02 — 两个官方 Perfetto Skill 的批判性审查

## Reviewed files

- `profilers/perfetto-sql/SKILL.md`
- `profilers/perfetto-trace-analysis/SKILL.md`
- `profilers/perfetto-trace-analysis/references/sql.md`
- Six hint files: CPU, graphics, I/O, IPC, memory, power
- Both bundled `perfetto-stdlib.md` copies

The two stdlib files are byte-identical:
`08dba63c0fd843fe0cd8c16d17f276853f15540106c4ff2ea2b304f38191e629`.

## High-value method

1. Search stdlib concepts before writing custom SQL.
2. Verify every selected table, module and column with bounded reads.
3. Prefer stable `upid`/`utid` identity over recycled PID/TID.
4. Normalize `dur = -1` before end-time arithmetic or aggregation.
5. Use overlap predicates for interval windows.
6. Make reusable SQL idempotent.
7. Keep the SQL validation loop bounded.
8. Start broad, then narrow by evidence.
9. Split slice wall time into Running/Runnable/Sleeping/D-state.
10. Follow blockers across thread and process boundaries.
11. Record facts separately from hypotheses.
12. Search for a second independent bottleneck before closing an open-ended
    investigation.

SmartPerfetto already implements most of 1–11. Item 12 exists only partially:
`global_trace_sanity_check` is routed at the beginning, but the portable
workflow does not require a bounded closing sweep or an explicit waiver.

## SQL claims that must be corrected

### `SPAN_JOIN`

Google says overlapping inputs “will crash” and recommends `PARTITIONED` as the
remedy. Current Perfetto v57.2 documentation says:

- spans in the same input and same partition must not overlap;
- Perfetto does not detect this condition;
- the result can be silently incorrect;
- `PARTITIONED` separates identities, but does not merge or remove overlaps
  inside one partition.

SmartPerfetto's current guardrail is more careful: it recommends stable
partition keys to avoid cross-entity joins and separately enforces idempotent
virtual-table setup. The missing check is a reviewed precondition or test that
proves each input is non-overlapping within its partition.

### `GLOB` versus `LIKE`

Google prohibits `LIKE` globally. The underscore wildcard risk is real, but the
performance and correctness claim depends on pattern, collation and intent.
Current SmartPerfetto correctly keeps this as an opt-in advisory rule, not a
default validation failure. Public Perfetto-Skills should copy that severity
model, not Google's blanket prohibition.

### User-provided SQL

The official protocol says to execute user SQL without modification, then
validate it. A safe product must still apply resource bounds, destination
controls, processor identity, schema capability checks and report provenance.
The public Perfetto-Skills runtime already does this and is stronger than the
official wrapper protocol.

### Unversioned stdlib reference

The bundled stdlib snapshot contains current-looking names such as
`android_binder_txns`, `android_network_packets`,
`android_power_rails_counters`, and `android_suspend_state`, but its file does
not state a Perfetto version or commit. Several hint files contradict that same
snapshot. SmartPerfetto and Perfetto-Skills should continue using the locked
source tree and binary identity rather than importing this Markdown file.

## Audit of 71 domain hints

The hints are useful as hypothesis prompts, but not as executable specifications.
They fall into three practical groups:

### A. Stable intent, already covered

- long slice plus exact-window thread-state decomposition;
- recursive child/self-time analysis;
- global process/thread expansion after target-local dead ends;
- runnable latency and CPU contention;
- CPU topology, placement, frequency and idle context;
- startup D-state/blocked-function investigation;
- frame timeline, main/render thread and SurfaceFlinger analysis;
- Binder storms, server attribution and dependency chains;
- LMK, RSS/swap, PSI/reclaim, DMA-BUF and heap-retainer analysis;
- suspend, wakelock, network/modem and energy attribution.

Existing representative Skills include `global_trace_sanity_check`,
`cpu_analysis`, `sched_latency_in_range`, `startup_detail`,
`jank_frame_detail`, `binder_analysis`, `binder_storm_detection`,
`block_io_analysis`, `memory_analysis`, `dmabuf_analysis`,
`android_heap_dominator_path_extract`, `suspend_wakeup_analysis`,
`network_analysis`, `power_rails_energy_breakdown` and
`battery_drain_attribution`.

### B. Valid ideas that need a new deterministic definition or stronger gate

- wake-to-run delay correlated with IRQ occupancy on the same CPU;
- hardware kernel thread real-time policy/priority audit;
- catch-up storm detection: inactivity gap followed by a bounded high-density
  execution burst;
- user-versus-kernel sampled time, with explicit source/symbol rules;
- page-cache event aggregation by inode and controlled cold/warm comparison;
- graphics CPU/GPU double-accounting when both evidence sources are available;
- a closing cross-domain sweep for independent bottlenecks.

These are candidates only after defining schema, capability states, thresholds,
expected output, missing-data behavior and owned semantic fixtures.

### C. Stale names or overclaimed causality

Examples found by comparing the hints with their own stdlib snapshot and
current Perfetto v57.2:

| Hint wording | Current/correct boundary |
|---|---|
| `binder_transaction` | current stdlib table is `android_binder_txns` |
| `service_name` in Binder grouping | use `interface`/`aidl_name` plus `method_name` |
| `cpu_slice` | current compatibility view is `sched_slice` |
| `android_graphics_allocs` | absent from the bundled snapshot and current v57.2 stdlib |
| `actual_frame_timeline_frame` | current prelude exposes `actual_frame_timeline_slice` |
| `android_bitmaps` | current heap object table is `heap_graph_bitmaps`; counter tables are `android_bitmap_*` |
| `power_rails` track with `power_ma * duration` | use `android_power_rails_counters.energy_delta` or unit-correct average power integration |
| `suspend_state` | use `android_suspend_state` |
| `kernel_wakelock` | use `android_kernel_wakelocks` |
| `network_packets` | use `android_network_packets` |

Overclaims that must remain hypotheses include:

- missing/stuck frequency data proves a governor kernel bug;
- a long `do_page_fault` proves storage contention;
- temporal proximity to a kworker proves the kernel dependency;
- longer buffer swap proves a large damage area;
- frame duration correlated with GPU memory proves memory-pressure jank;
- identical bitmap dimensions/properties prove duplicate content;
- a second launch becoming faster proves page-cache cold start.

## Scratchpad assessment

The facts-only scratchpad is a good conceptual separation, but the prescribed
file beside the trace should not be copied:

- it creates files in a user data directory;
- it lacks trace hash, processor identity and schema;
- it can become stale across reruns;
- another agent may mistake it for trusted evidence;
- the final report points to an uncontrolled side artifact.

SmartPerfetto's plan, evidence rows, claim verification, report and snapshot
surfaces are the correct architectural replacement. Public Perfetto-Skills
already produces evidence sidecars and a report schema.
