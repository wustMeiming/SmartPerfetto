# Research Dump 04 — 公开 Perfetto-Skills 同步边界

## Current public baseline

- Repository: `/Users/chris/Code/SmartPerfetto/Perfetto-Skills`
- Commit: `718c5dcdd5de2feb920ce8719f69c8108f9f8317`
- Generated Skill references: 234
- Workflow documents: 15
- Locked processor: Perfetto v57.2 / RPC API 14
- Existing upstream inputs:
  - pinned SmartPerfetto export;
  - pinned Google Perfetto Skill subtree;
  - pinned official PerfettoSQL stdlib.

The public runtime already provides:

- processor checksum/identity validation;
- schema/capability probe;
- safe parameter and result binding;
- output-size bounds;
- evidence sidecars;
- report schema;
- API 28–37 capability classification;
- static, runtime, execution and semantic validation axes;
- project-owned real trace fixtures.

It should not be replaced by Google's download-and-run wrapper.

## What should sync

### 1. A second independent upstream lock

Proposed files/concepts:

- `upstreams/android-skills.lock.json`
- `upstreams/android-skill-decisions.json`
- `tools/sync_android_skills.py`
- `upstreams/reports/android-skills-gap.json`

Track only the two `profilers/` subtrees. Require exact source commit, path and
SHA-256. Decisions should reuse:

- `adopted`
- `already_covered`
- `not_applicable`
- `pending_review`

An `adopted` or `already_covered` decision must name the local implementation,
stable test and exact reviewed upstream commit. This mirrors the existing
Google Perfetto gap checker but must remain a separate source.

### 2. Portable SQL guardrail methodology and validator

Public documentation should explain corrected rules:

- exact/current module and schema lookup;
- `upid`/`utid` identity;
- open-ended duration normalization;
- overlap window predicates;
- idempotent objects;
- typed argument extraction;
- SPAN_JOIN partition plus non-overlap precondition;
- GLOB/LIKE as an advisory intent check, not a blanket failure.

The executable implementation should be native to Perfetto-Skills, likely a
small Python validator used by `validate_all_queries.py`. Do not export the
SmartPerfetto TypeScript file as a runtime dependency. Preserve advisory versus
blocking severity and explicit per-query exemptions.

### 3. Bounded closing sweep in public workflow methodology

Extend `trace-overview.md` or add a shared analysis-closure reference. This is
portable because it only composes already-public Skills:

- `global_trace_sanity_check`
- selected domain workflow evidence
- independent top CPU/Runnable/D-state/long-slice checks
- explicit limitations/waiver

Do not tell the agent to execute all 71 hints. Use route relevance and a budget.

### 4. Future atomic Skills after proof

The IRQ correlation, RT-policy audit and catch-up-storm detector are portable
only after they exist as deterministic SmartPerfetto YAML, pass owned fixtures,
and are included by `backend/skills/public-export.yaml`. They should follow the
normal SmartPerfetto-first projection path rather than be authored independently
in generated public files.

## What should not sync

- Android CLI device automation as a mandatory public dependency.
- Play policy, Compose, CameraX, Billing, AppFunctions, identity, Wear or XR
  domain instructions.
- Provider/session pinning, frontend chat, DataEnvelope, internal report
  storage or multi-runtime product semantics.
- The official unversioned stdlib Markdown snapshot.
- The scratchpad beside the trace.
- Raw Google wording for stale tables or overclaimed causality.
- SmartPerfetto's TypeScript guardrail engine itself.

## Licensing/provenance

The source is Apache-2.0. Engineering reuse is possible if the distributed
derivative retains the required license, attribution and change notices. The
lowest-risk design is to store hashes, decisions and original-source links,
then implement corrected behavior independently with tests. If text or scripts
are copied or adapted, update Perfetto-Skills `NOTICE` and retain the applicable
license notices. This is an engineering recommendation, not legal advice.

## Suggested sequence

1. Add the second source lock and dry-run gap report.
2. Classify every file in the two profiler subtrees.
3. Correct and publish the SQL guardrail reference.
4. Add public validator tests, then connect it to query validation.
5. Add the bounded analysis-closure workflow test.
6. Prototype each new atomic Skill in SmartPerfetto with fixtures.
7. Run `check:perfetto-skills-impact`; export approved portable assets.
8. Run both repositories' documented full gates before landing.
