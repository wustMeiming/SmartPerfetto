# Google Android Skills Gap Implementation Plan

## Objective

Convert the source-backed review of `android/skills` into verified improvements
for SmartPerfetto and the independent Perfetto-Skills repository. Preserve the
existing separation between deterministic trace evidence, investigation
methodology, product runtime behavior, and portable Agent Skill assets.

The reviewed Android Skills source is pinned at
`47e1dff74a5cde5d0128c5d15e74e000323135ea`. Only
`profilers/perfetto-sql` and `profilers/perfetto-trace-analysis` are in scope.
The other upstream Skills are not imported.

## Delivery order

1. Implement and verify the SmartPerfetto source changes.
2. Commit that source state so the public review has an immutable input.
3. Implement the native portable methodology and validator in Perfetto-Skills.
4. Commit the portable implementation, then use that immutable commit as the
   evidence reference for the Android Skills decisions.
5. Generate the Android upstream metadata-only lock, decisions, and reviewed
   gap report through the synchronizer; run the public complete gate and commit
   the result. Do not persist an upstream source inventory or source body.
6. Before the public governance commit, run the public impact gate against the
   exact SmartPerfetto source HEAD and record its fingerprint in that commit
   message.
7. Run SmartPerfetto's paired-impact gate against the exact final public HEAD.
8. Record the SmartPerfetto paired evidence, run the SmartPerfetto PR gate,
   commit, merge both feature branches to `main`, verify the merged trees, and
   push both `main` branches.

This two-stage public commit sequence avoids a circular provenance claim:
review decisions reference a real commit that already contains the cited local
path and test.

## SmartPerfetto changes

### 1. Make SPAN_JOIN non-overlap proof explicit

Modify:

- `backend/src/services/sqlGuardrailAnalyzer.ts`
- `backend/src/services/__tests__/sqlGuardrailAnalyzer.test.ts`

Add a default validation rule for the invariant that every SPAN_JOIN input must
be non-overlapping within its effective partition. `PARTITIONED` scopes entity
matching but does not prove this invariant.

The rule accepts a non-empty, immediately adjacent annotation:

```sql
-- perfetto-span-join-non-overlap-proof: <fixture, assertion, or witness query>
CREATE VIRTUAL TABLE ...
USING SPAN_JOIN(...);
```

The annotation makes the review decision explicit; it is not itself runtime
proof. Tests must cover missing proof, accepted proof, comments/literals that
must not count, multiple SPAN_JOIN statements, and compatibility with existing
ignore directives. The existing rule continues to check partitioning and
idempotent virtual-table setup. It must not adopt the upstream blanket claim
that every input must be a materialized table, because Perfetto's own stdlib
contains legitimate view-backed inputs.

### 2. Bound the open-ended closing sweep

Modify:

- `backend/strategies/general.strategy.md`
- add a focused strategy contract test under `backend/src/agentv3/__tests__/`

For broad or open-ended investigations, require one bounded secondary sweep
after the primary evidence chain:

- inspect at most three still-unchecked, evidence-available domains;
- select them from observed signals, not from a fixed exhaustive checklist;
- stop when no high-impact independent anomaly is found, the next query would
  repeat evidence, required data is unavailable, or the query budget is spent;
- report checked domains, unresolved alternatives, and missing data;
- never weaken the verified primary finding because a secondary sweep is empty.

Specific, user-bounded questions do not incur the sweep.

### 3. Separate the Android Skills upstream

Modify:

- `backend/skills/docs/upstream-perfetto-ai-skill-translation.sop.md`

Document `android/skills` as a separate gap-check-only source from
`google/perfetto/ai/skills/perfetto`. Record the two reviewed subtrees, the
portable/product mapping rules, non-applicable Android CLI/scratchpad behavior,
and the fixture requirement for IRQ/runnable-delay, RT-policy, and catch-up
storm candidates.

### 4. Preserve research and paired evidence

Add:

- the completed `research/2026-07-20-*` report/materials;
- a final implementation validation record containing commands, change
  fingerprint, SmartPerfetto source commit, and exact Perfetto-Skills paired
  commit.

## Perfetto-Skills changes

### 1. Add a native portable SQL guardrail

Add:

- `skills/perfetto-performance-analysis/scripts/perfetto_sql_guardrails.py`
- `skills/perfetto-performance-analysis/references/evidence/sql-guardrails.md`
- focused unit tests

Modify:

- `tools/validate_all_queries.py`
- `skills/perfetto-performance-analysis/SKILL.md`

The standard-library-only module exposes a reusable analyzer plus CLI. It
reports structured rule id, severity, line, snippet, and message. The first
release covers:

- SPAN_JOIN non-overlap proof annotation;
- mismatched partition keys;
- idempotent virtual-table setup;
- advisory checks for LIKE, raw/open duration arithmetic, start-only interval
  filters, non-idempotent reusable creates, and direct `args` parsing.

The repository query gate fails on error-severity findings and records
advisories without turning the existing portable catalog into a cleanup task.
Since the current catalog has no SPAN_JOIN query, no baseline suppression is
required. The documentation includes a dynamic `LEAD` witness query and
explains that partitioning cannot merge overlapping intervals.

### 2. Add bounded analysis closure

Modify:

- `skills/perfetto-performance-analysis/references/workflows/trace-overview.md`
- the operating contract in `skills/perfetto-performance-analysis/SKILL.md`
- focused workflow contract tests

Use the same bounded secondary-sweep and stop-condition contract as
SmartPerfetto, expressed without product session/runtime dependencies.

### 3. Compare `android/skills` without persisting its corpus

Refactor/add:

- a shared exact Git subtree inventory and exact-path/hash decision module;
- `tools/sync_android_skills.py`;
- `tools/upstream_locks.py` Android lock validation;
- focused synchronizer and lock tests;
- `upstreams/android-skills.lock.json`;
- `upstreams/android-skills-decisions.json`;
- `upstreams/reports/android-skills-gap.json`;
- `docs/maintenance/upstream-sync.md`.
- `.github/workflows/upstream-sync.yml`;
- `.github/workflows/upstream-canary.yml`;
- workflow contract tests.

The schema-v2 lock pins only the repository, commit, two subtree paths, and
their Git tree IDs. The synchronizer inventories the pinned and candidate
commits inside the supplied disposable checkout, then writes only the minimal
reviewed classifications needed for the gap report. It never writes an
upstream source inventory or source body. The synchronizer remains dry-run by
default; `--apply` refuses unresolved decisions. Every changed upstream
path/hash becomes `pending_review` until an exact decision supplies local
evidence.

The eleven initial decisions classify SQL/analysis entrypoints as adopted and the
domain hint/stdlib references as already covered by named local paths/tests.
No Google runtime downloader, workspace scratchpad, or unversioned stdlib dump
becomes a product dependency.

The explicit sync workflow accepts an immutable Android Skills commit and
builds a disposable candidate. The scheduled canary compares Android Skills
`main` transiently without applying or retaining its corpus, so changed
path/hash pairs surface as unresolved review instead of being silently
adopted.

## Tests and gates

### Focused SmartPerfetto

```bash
cd backend
npx jest src/services/__tests__/sqlGuardrailAnalyzer.test.ts \
  src/agentv3/__tests__/generalStrategyContract.test.ts --runInBand
npx jest tests/skill-eval/sql_guardrail_span_join.eval.ts --runInBand \
  --testTimeout=120000 --forceExit
npm run validate:strategies
npm run test:scene-trace-regression
```

### Focused Perfetto-Skills

```bash
uv run python -m unittest \
  tests.unit.test_sql_guardrails \
  tests.unit.test_all_query_validation \
  tests.unit.test_android_skills_sync \
  tests.unit.test_upstream_locks \
  tests.unit.test_skill_contract \
  tests.integration.test_real_trace.RealTraceTest.test_guarded_span_join_executes_with_non_overlap_witnesses
```

Run synchronizer dry-run and apply from the pinned local Android Skills
checkout. The checkout is a transient comparison input; only the metadata-only
lock and reviewed gap report are committed.

### Complete gates

```bash
cd /Users/chris/Code/SmartPerfetto/Perfetto-Skills
uv run python tools/verify.py
uv run python tools/check_cross_repo_impact.py \
  --repository perfetto-skills \
  --base "$(git merge-base HEAD origin/main)" \
  --decision required \
  --reason "portable SQL guardrail, investigation closure, and Android upstream governance changed" \
  --paired-path /Users/chris/Code/SmartPerfetto/SmartPerfetto \
  --paired-ref <SMARTPERFETTO_SOURCE_COMMIT>

cd /Users/chris/Code/SmartPerfetto/SmartPerfetto
npm run check:perfetto-skills-impact -- \
  --base "$(git merge-base HEAD origin/main)" \
  --decision required \
  --reason "shared portable SQL guardrail, investigation closure, and upstream governance changed" \
  --paired-path /Users/chris/Code/SmartPerfetto/Perfetto-Skills \
  --paired-ref <PERFETTO_SKILLS_FINAL_COMMIT>
npm run verify:pr
```

Run the repository simplification path if available. Otherwise perform a
manual simplification review and `git diff --check`. After the last source
edit, obtain an independent read-only diff review and rerun affected gates.

## Structured plan review

The independent read-only plan reviewer remained active without returning a
result across more than two bounded waits, including a request to stop
expanding scope and return only blockers. It was interrupted and the
repository-authorized structured fallback was applied before implementation.

The fallback checked:

- every planned path and validation command against both live repositories;
- SmartPerfetto/public generated-file ownership;
- exact-HEAD requirements in both impact tools;
- the provenance sequence for source, portable implementation, decisions, and
  final paired evidence;
- release archive inclusion of the new native script;
- operational reachability through manual sync and scheduled canary workflows.

Confirmed revisions from that review:

1. Add the required `--repository perfetto-skills` argument to the public
   impact command.
2. Include both upstream GitHub workflows and their contract tests; a local
   synchronizer alone would leave the second upstream dormant.
3. Run and record the public impact decision before its governance commit,
   while the paired SmartPerfetto checkout exactly equals the source commit.
4. Record the later SmartPerfetto paired decision only in SmartPerfetto, so the
   public commit remains the immutable paired HEAD.
5. Keep missing SPAN_JOIN proof as a policy error but explicitly label the
   annotation as a reference to external fixture/witness evidence, not proof by
   assertion.

## Risks and mitigations

- **False confidence from annotations:** documentation and messages state that
  annotations record external proof; they do not prove data dynamically.
- **Validator noise:** only error-severity invariants fail the catalog gate;
  broader guidance remains advisory unless explicitly run in strict mode.
- **Open-ended analysis loops:** the closing sweep has a domain cap and explicit
  stop conditions.
- **Generated-file drift:** public generated references remain untouched; the
  Android lock/report are written by the synchronizer, and no Android source
  inventory or body is retained.
- **Paired provenance drift:** both impact tools receive immutable refs that
  exactly equal the paired checkout HEAD at validation time.
- **Unsupported new Skills:** IRQ/RT/catch-up candidates remain documented
  deferrals until data-present fixtures and semantic assertions exist.
