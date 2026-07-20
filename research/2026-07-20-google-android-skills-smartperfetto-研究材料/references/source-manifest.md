# Primary Source Manifest

All remote sources were reviewed before the offline synthesis phase.

## Google Android Skills

- Repository commit:
  `https://github.com/android/skills/tree/47e1dff74a5cde5d0128c5d15e74e000323135ea`
- README:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/README.md`
- Apache-2.0 license:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/LICENSE.txt`
- Perfetto SQL Skill:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-sql/SKILL.md`
- Perfetto trace-analysis Skill:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/SKILL.md`
- SQL reference:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/sql.md`
- CPU hints:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/hints_cpu.md`
- Graphics hints:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/hints_graphics.md`
- I/O hints:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/hints_io.md`
- IPC hints:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/hints_ipc.md`
- Memory hints:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/hints_memory.md`
- Power hints:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references/hints_power.md`
- Android CLI:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/devtools/android-cli/SKILL.md`
- Android CLI interaction:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/devtools/android-cli/references/interact.md`
- Android CLI journeys:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/devtools/android-cli/references/journeys.md`
- Testing setup:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/testing/testing-setup/SKILL.md`
- R8 analyzer:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/performance/r8-analyzer/SKILL.md`
- Play policy insights:
  `https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/play/play-policy-insights/SKILL.md`

## Current Perfetto source truth

The SmartPerfetto `perfetto/` submodule was inspected at its current v57.2
source. Relevant primary files:

- `perfetto/docs/analysis/perfetto-sql-getting-started.md`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/binder.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/bitmaps.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/memory/heap_graph/bitmap.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/network_packets.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/power_rails.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/kernel_wakelocks.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/android/suspend.sql`
- `perfetto/src/trace_processor/perfetto_sql/stdlib/intervals/overlap.sql`

## Local project truth

The exact local files used for SmartPerfetto and Perfetto-Skills mapping are
listed in dumps 00, 03 and 04. No conclusion relies only on filename
similarity; executable path, schema, tests and missing-data semantics were
checked where the report claims existing coverage.
