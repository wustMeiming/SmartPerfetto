# SmartPerfetto Data Contract

[English](DATA_CONTRACT_DESIGN.en.md) | [中文](DATA_CONTRACT_DESIGN.md)

This document describes the implemented contract, not a migration plan. The
TypeScript source of truth is
[`backend/src/types/dataContract.ts`](../src/types/dataContract.ts).
`perfetto/ui/src/plugins/com.smartperfetto.AIAssistant/generated/data_contract.types.ts`
is generated and must not be edited manually.

## Contract Goal

The same analysis data is consumed by several product surfaces:

```text
TraceProcessor / YAML Skill / runtime direct evidence
  -> DataEnvelope
  -> SSE and frontend tables
  -> HTML report
  -> CLI turn artifacts
  -> analysis-result snapshot / comparison
  -> evidence, claim-verification, and identity sidecars
```

Each surface may project a different view, but it must not invent an
incompatible private shape. Chat may omit low-signal audit detail; reports,
snapshots, and CLI artifacts retain the provenance needed for review.

## DataEnvelope

`DataEnvelope<T>` has three parts:

```ts
interface DataEnvelope<T = DataPayload> {
  meta: DataEnvelopeMeta;
  data: T;
  display: DataEnvelopeDisplay;
}
```

- `meta`: data kind, schema version, source, timestamp, Skill/step, execution
  status, and evidence provenance.
- `data`: table, chart, text, or diagnostic payload.
- `display`: layer, format, title, column schema, visibility, and
  ordering/collapse hints.

`meta.executionStatus` distinguishes:

- `observed`: the query succeeded and produced an observed result;
- `empty`: the query succeeded with no matching rows;
- `optional_error`: an optional query was unavailable or failed.

Do not collapse `empty` and `optional_error` into "no issue." Comparison
envelopes also preserve `traceSide`, pane, trace id, query hash, and evidence
references. Process/thread evidence may carry an identity sidecar, and
plan-driven evidence may carry phase attribution. Those fields must remain
consistent across reports, snapshots, and verifier paths.

## Display Layers And Detail

Source constants validate the current display layers:

- `overview`: L1 summary;
- `list`: L2 list/detail;
- `session`: session- or interval-scoped results;
- `deep`: L3/L4 drill-down;
- `diagnosis`: deterministic diagnosis.

Detail levels are `none`, `debug`, `detail`, `summary`, `key`, and `hidden`.
Normal chat/table projections must not present `none` or `hidden` data as
visible evidence. Report and internal-audit retention follows each projection's
contract.

## Self-Describing Columns

`ColumnDefinition` is the table-rendering schema. Important fields include:

- `name` and `label`;
- `type`: `string`, `number`, `timestamp`, `duration`, `percentage`, `bytes`,
  `boolean`, `enum`, `json`, or `link`;
- `format` and `unit`;
- `clickAction`, including `navigate_timeline`, `navigate_range`, and `copy`;
- `durationColumn`, sorting, width, hidden state, and tooltip.

Skills should declare column semantics explicitly. Compatibility paths use
`inferColumnDefinition()` / `buildColumnDefinitions()` for common `ts`, `dur`,
`*_ms`, and `*_bytes` fields, but inference is not a reason for new Skills to
omit schema.

Timestamps and durations may use strings to preserve nanosecond precision.
Frontend formatting and navigation must not first coerce them through a lossy
JavaScript `number`.

## Skill Compatibility Bridge

SkillExecutor still produces `DisplayResult` / `LayeredSkillResult`. The current
bridge functions are:

- `displayResultToEnvelope()`;
- `layeredResultToEnvelopes()`;
- `envelopeToDisplayResult()`;
- `envelopesToLayeredResult()`.

They preserve compatibility with existing Skills and consumers; they do not
bypass DataEnvelope validation. New or changed Skills must retain
`display.layer`, `display.level`, column schema, execution status, and
synthesize output through conversion.

## UI Actions

A DataEnvelope may derive a bounded UI action proposal:

- `navigate_timeline`;
- `navigate_range`;
- `open_evidence_table`;
- `pin_evidence`.

Actions must reference existing evidence, artifacts, or Skill output. The
frontend executes only allowed typed actions, never arbitrary model-generated
scripts, SQL, or URLs.

## Generation And Verification

After changing the backend contract:

```bash
cd backend
npm run generate:frontend-types
npm run typecheck
npx jest src/types/__tests__/dataContract.test.ts \
  src/services/skillEngine/__tests__/displayContractValidator.test.ts \
  src/services/__tests__/htmlReportGenerator.test.ts --runInBand
```

The generator updates
`perfetto/ui/src/plugins/com.smartperfetto.AIAssistant/generated/data_contract.types.ts`.
If generated output changes, run the relevant Perfetto UI typecheck/tests and
update the committed `frontend/` prebuild according to
[`AGENTS.md`](../../AGENTS.md) and the
[frontend rules](../../.claude/rules/frontend.md).

Skill YAML changes additionally require:

```bash
cd backend
npm run validate:skills
npm run test:scene-trace-regression
```

Use the repository gate before landing:

```bash
npm run verify:pr
```

## Maintenance Checklist

- Backend types remain the only handwritten source; generated files were not
  edited directly.
- SSE, report, CLI, snapshot, comparison, and verifier projections were checked.
- `empty`, `optional_error`, and uncertainty were not collapsed into a
  deterministic conclusion.
- Current/reference and identity/provenance fields survive conversion.
- Column units, timestamp precision, and click actions match the real data.
- Chinese and English docs and contract tests are updated together.
