# SmartPerfetto Skill System Guide

[English](skill-system.en.md) | [中文](skill-system.md)

SmartPerfetto Skills are YAML-defined trace analysis pipelines. They package performance expertise into reusable, composable, deterministic analysis units. The agent decides which Skill to use; the Skill engine handles SQL execution, iteration, conditional flow, display metadata, and layered output.

## Skill Inventory

The authoritative inventory is the `backend/skills/**/*.skill.yaml` file tree.
Do not hardcode a total count in code or durable docs. To inspect the current
inventory, run:

```bash
rg --files backend/skills | rg '\.skill\.yaml$' | wc -l
```

Directory roles:

| Type | Location | Description |
|---|---|---|
| Atomic | `backend/skills/atomic/` | Single SQL query or small query group |
| Composite | `backend/skills/composite/` | Multi-step orchestration |
| Comparison | `backend/skills/comparison/` | Multi-trace or multi-result comparison Skills |
| Deep | `backend/skills/deep/` | Deep analysis such as CPU profiling |
| Pipeline | `backend/skills/pipelines/` | Rendering pipeline detection and teaching content |
| Module | `backend/skills/modules/` | Modular app/framework/hardware/kernel analysis |
| Template | `backend/skills/_template/` | Authoring templates, not necessarily runtime analysis capability |

## YAML Structure

```yaml
name: consumer_jank_detection
version: "2.0"
type: atomic
category: rendering

meta:
  display_name: "Consumer jank detection"
  description: "Detects real jank from present_ts intervals"
  tags: [jank, consumer, surfaceflinger]

inputs:
  - name: package
    type: string
    required: false
    description: "Application package name"

steps:
  - id: frame_stats
    type: atomic
    sql: |
      SELECT COUNT(*) AS total_frames
      FROM actual_frame_timeline_slice
      WHERE process_name GLOB '${package}*'
    save_as: frame_stats
    display:
      layer: overview
      title: "Frame statistics"
```

## Input Types

| Type | Description | SQL default |
|---|---|---|
| `string` | String value | Empty string `''` |
| `number` | Floating number | `NULL` |
| `integer` | Integer | `NULL` |
| `boolean` | Boolean | `NULL` |
| `timestamp` | Nanosecond timestamp | `NULL` |
| `duration` | Nanosecond duration | `NULL` |

## Step Types

| Step type | Purpose |
|---|---|
| `atomic` | Execute one SQL query |
| `skill` / `skill_ref` | Call another Skill |
| `iterator` | Iterate over rows and run nested steps |
| `parallel` | Run independent child steps concurrently |
| `conditional` | Branch by expression |
| `diagnostic` | Emit rule-based findings |
| `pipeline` | Detect or describe rendering pipeline behavior |

## Parameter Substitution

Skill parameters use `${param|default}`. Resolution order is explicit input, saved prior step output, SmartPerfetto defaults, inline default, then type default. The engine escapes substituted values to reduce SQL injection risk.

## Display Configuration

Display metadata tells the frontend how to render results:

| Field | Purpose |
|---|---|
| `layer` | Logical output layer |
| `title` | Section title |
| `format` | Table, metric, chart, timeline, text, or summary |
| `columns` | Column definitions for table rendering |
| `highlights` | Conditional highlighting rules |
| `expandable` | Whether JSON/details can be expanded |

## Layered Results

| Layer | Meaning |
|---|---|
| L1 | Executive summary and primary conclusion |
| L2 | Key lists, sessions, frames, or slices |
| L3 | Drill-down evidence |
| L4 | Raw diagnostics or supporting detail |

## Development Workflow

1. Add or edit a YAML file under `backend/skills/`.
2. Keep prompt text out of TypeScript.
3. Prefer existing fragments/modules when possible.
4. Run validation:

```bash
cd backend
npm run validate:skills
npm run test:scene-trace-regression
```

## Skill Tiers And Validation Rules

Skills may declare top-level `tier: S | A | B` to express target complexity and
review expectations:

| Tier | Use case | Structural expectation |
|---|---|---|
| `S` | Flagship cross-domain analysis such as startup, scrolling, CPU, or scene reconstruction | `type: composite` or `deep`, usually multiple Perfetto stdlib modules and 5+ steps |
| `A` | Focused single-domain analysis that can produce diagnostic findings or key lists | Declares relevant `prerequisites.modules` and reusable display layers |
| `B` | Single-fact or helper data provider | Clear query boundary, fields, and missing-data semantics |

`npm run validate:skills` enforces these stable rules:

| Rule | Behavior |
|---|---|
| `skill-tier-must-match-declared` | Validates `tier` is `S/A/B` and reports structural gaps as migration warnings |
| `skill-stdlib-detected-vs-declared` | Scans SQL for Perfetto stdlib symbols and requires coverage in `prerequisites.modules` |
| `skill-include-budget-soft-cap` | Warns when `prerequisites.modules` exceeds 8 modules |
| `skill-step-id-uniqueness` | Requires unique step ids inside each Skill |
| `skill-vendor-override-runtime-conformant` | Requires vendor overrides to contain real `additional_steps`, vendor signatures, and a registered base Skill |

`backend/skills/_template/` contains authoring templates and is not loaded into
the runtime registry. After copying a template, remove placeholders, place the
Skill under a runtime Skill directory, then run `validate:skills` and the
matching trace regression.
