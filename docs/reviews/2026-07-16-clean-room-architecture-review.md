# SmartPerfetto clean-room architecture review (2026-07-16)

## Scope and method

This review covers the repository changes made during the previous week
(`609ac843^..e31ac8b`), the current uncommitted integration workspace, and the
matching Perfetto submodule changes. Before verification, generated build,
test, report, runtime, upload, and cache state was moved out of the workspace.
Every result recorded below was then produced again from the current source
tree; the 2026-07-15 report and its test results were not accepted as evidence.

The review followed the complete user path rather than reviewing each feature
in isolation:

1. trace upload and identity;
2. ordinary, Smart Profile, and dual-trace analysis;
3. source-only, external-RAG-only, combined, and no-private-context requests;
4. provider/runtime selection across OpenAI Agents SDK, Pi Agent Core,
   OpenCode, and Claude-compatible boundaries;
5. evidence, final result, report, snapshot, CLI, and frontend projection;
6. local, enterprise, Docker, npm CLI, and portable runtime storage;
7. Chinese/English, accessibility, responsive UI, and Windows/macOS/Linux
   packaging contracts.

Independent read-only reviews covered API/contracts, runtime architecture,
security/privacy, data/migrations, frontend/product behavior, scale,
maintainability, testing, and release/platform risk. Confirmed findings were
revised at their shared architectural boundary and re-tested.

## Architecture conclusion

The week's feature direction is consistent with the product architecture, but
the combined change set originally exposed cross-feature gaps that individual
feature tests did not catch. The landed commits close the confirmed runtime,
correctness, security, privacy, scale, localization, accessibility, platform,
Perfetto submodule, and public Perfetto-Skills integration defects. No known P0
or P1 functional or release-integration defect remains in the reviewed tree.

## Source and external-RAG composition

| User selection | Effective behavior |
| --- | --- |
| No source, no external RAG | Normal trace/Smart analysis; private lookup tools are unavailable. |
| Source only | The authorized codebase IDs and consent mode are pinned into the run specification; only the active indexed generation is queryable. |
| External RAG only | Authorized knowledge-source IDs are pinned independently; results retain source/license provenance. |
| Source + external RAG | Both allowlists remain independent and are composed into one private-context authorization fingerprint and projection boundary. |

Explicit private context forces a tool-capable full analysis path. Invalid IDs,
invalid analysis modes, disabled features, consent changes, generation changes,
or ownership changes fail with stable errors instead of silently degrading to a
different analysis. The UI preserves source-only or RAG-only operation if the
other API fails, distinguishes `metadata_only` from `provider_send`, and clears
stale selections without requiring the user to open Settings first.

## Confirmed fixes

### Runtime and analysis accuracy

- All four runtime adapters now consume the same provider-neutral run
  specification and comparison-context builder. Previously exposed but ignored
  stopping/concurrency controls are rejected rather than pretending to apply.
- Smart scene selection, scene presentation, final-report recovery, and runtime
  prompt methodology are registry/template-driven. Analysis policy is no
  longer duplicated as TypeScript prompt text.
- Final conclusions, claim verification, identity evidence, reports,
  snapshots, CLI output, and readable chat remain separate surfaces. Recovery
  no longer invents confidence or completeness after a partial/limited run.
- Real trace evidence and negative contracts were strengthened for heap,
  camera, rendering, kernel wait, SQL queue, and generated trace-corpus paths.

### Private context, security, and tenancy

- Source/RAG authorization is checked at selection, lookup, provider-send,
  persistence, replay, report, snapshot, and SSE projection boundaries. Private
  intermediate model text and unknown persisted fields are fail-closed.
- Provider requests use deployment-owned exact-origin allowlists with DNS/IP
  pinning, redirect revalidation, and absolute deadlines. Provider credentials
  require reconfirmation when endpoint origin changes.
- Public `/health` is limited to liveness/version. Runtime/provider diagnostics
  moved to authenticated `/api/runtime-health`; debug telemetry is protected.
- Default API authentication, host/CORS checks, API-key RBAC, last-admin and
  membership protections, local secret locking, output escaping/CSP, OpenCode
  bridge limits, and download limits are covered by regression tests.
- Enterprise resource access is scoped by tenant/workspace/user. API keys,
  reports, traces, source registries, external knowledge, and persisted sessions
  use the same ownership model.

### Data integrity and scale

- RAG schema migration uses resumable dual-read/cutover/rollback semantics,
  compare-and-swap backfill, and tokenizer-equivalent triggers during rolling
  deployment.
- Baseline, Case Library, and Case Graph writes use atomic DB/filesystem update
  boundaries and preserve corrupt files for diagnosis instead of overwriting
  them on the next mutation.
- Source ingestion uses leases, staged generations, bounded reads/chunks, root
  identity checks, and fail-closed license/vendor provenance for AOSP, kernel,
  and OEM sources.
- RAG size accounting is incremental; stats use SQL aggregates; registry
  dual-read listing batches database records instead of N+1 open/query cycles.
- Trace listing is cursor-paginated with a hard maximum and stable cursor;
  trace stats aggregate in storage and authorize only active processor/lease
  candidates.
- SQL processor queues have bounded task/byte admission, enqueue-to-completion
  deadlines, O(1) dequeue behavior, and disconnect cancellation. Reports use a
  byte-aware cache rather than retaining a day's unbounded HTML.
- Startup orphan cleanup is process-owner aware on Unix and Windows. A second
  active SmartPerfetto/CLI/test instance can no longer terminate the first
  instance's live `trace_processor_shell`; only children whose owner is gone
  are eligible for cleanup. Darwin uses exact process-name discovery plus
  parent-PID verification, avoiding the truncated `ps comm` representation.
- Port allocation now probes the operating system before claiming a candidate
  and retains the existing bind-race retry. Independent backend, CLI, and test
  processes therefore skip ports already held outside their in-memory pool.

### Contracts, UI, localization, and platform behavior

- Frontend `analysis_completed` types are generated from the backend contract;
  API timestamps and resource error codes no longer drift between handwritten
  interfaces.
- Source/RAG configuration, consent state, mode indicators, capability errors,
  settings tabs, dual-trace language inheritance, keyboard semantics, focus,
  ARIA roles, and narrow layouts were corrected in both Chinese and English.
- The frontend reads authenticated runtime status from `/api/runtime-health`;
  the public health hardening no longer makes the UI report AI as unavailable.
- The deployment-owned static `SMARTPERFETTO_API_KEY` is treated as the local
  operator bootstrap credential, so it can access runtime/provider management;
  durable enterprise API keys retain their explicitly stored least-privilege
  roles and scopes.
- Backend data paths now follow the portable/CLI runtime data directory.
  Docker persists mutable runtime state without masking bundled SQL/assets.
- npm packaging/release entrypoints invoke their Bash scripts through the
  interpreter. This preserves the same WSL/Linux/macOS contract while avoiding
  host execution-policy rejection of direct shebang execution.
- Machine-readable CLI commands route the complete bootstrap, runtime check,
  service lifetime, and cleanup log stream to stderr. Both the built CLI and
  npm-packed CLI preserve stdout as a parseable JSON/JSONL protocol.
- Public Skill verification also enters through Bash and selects an explicitly
  compatible Python 3 + PyYAML runtime. An incompatible host Python now fails
  with a dependency diagnostic instead of an opaque import or execution error.
- CI includes Linux, macOS, and Windows contract jobs. Go launchers compile for
  Windows x64, macOS arm64, and Linux x64 from the same source.

## Fresh verification evidence

Only results produced after the clean-room reset belong in this table.

| Verification | Fresh result |
| --- | --- |
| Backend focused architecture/runtime/data/security regressions | PASS |
| AOSP/OEM license and vendor fail-closed regression | PASS (4/4) |
| Perfetto UI focused regressions | PASS (27/27) |
| Perfetto UI full build and unit suite | PASS (2,885 passed, 1 skipped) |
| Root governance tests | PASS (17/17) |
| Frontend type generation/synchronization and backend typecheck | PASS |
| Committed frontend prebuild integrity | PASS |
| Production dependency audit | PASS (0 vulnerabilities) |
| Portable script syntax, ShellCheck, Node syntax, and version sync | PASS |
| Windows x64 / macOS arm64 / Linux x64 Go launcher cross-build | PASS |
| Concurrent-instance trace-processor ownership smoke | PASS (second backend preserved the active first-instance processor) |
| HTTP health/auth smoke | PASS (`/health` minimal; runtime health 401 without key and 200 with operator key) |
| Real DeepSeek source/RAG/combined x OpenAI/Pi/OpenCode matrix | PASS (9/9; all `analysis_completed`, non-partial, zero degraded/errors, verifier passed) |
| Codebase-aware verification | PASS (source and built `dist` paths) |
| Full trace corpus regression | PASS (18 validated cases, 12 regenerated constructed cases, semantic regression) |
| npm CLI dist/pack E2E | PASS (built tree and npm pack) |
| Public Perfetto-Skills export verification | PASS (234 runtime Skills, 101 classified Strategy/registry sources: 55 exported and 46 product-only, 14 pipeline docs) |
| Portable package build and artifact verification | PASS (Windows x64, macOS arm64, Linux x64) |
| Root `verify:pr` | PASS (including 66/66 core suites, 903/903 core tests, architecture, trace processor, and 6/6 scene traces) |
| Runtime HTTP/browser smoke | PASS (authenticated runtime health and fresh browser render) |
| Simplification and final diff checks | PASS (manual review; simplifier unavailable; root and Perfetto `git diff --check`) |

The Perfetto UI dependency preflight cannot execute repository Python entry
scripts directly on this macOS host because local Homebrew Python/Node binaries
are rejected by the host system policy. The build was therefore run with the
system Python and project-supported `--no-depscheck` switch. The actual GN,
TypeScript, Vite, WASM, and complete UI unit-test stages all passed.

The public Skill verifier likewise used the system Python with the existing
PyYAML site-packages directory supplied explicitly through `PYTHONPATH`. The
repository entrypoint now detects and reports the Python/PyYAML requirement;
it does not silently depend on the rejected Homebrew interpreter.

## Residual release boundaries

1. The new cross-platform workflow proves scripts and type/governance contracts
   on hosted runners after landing; this local review does not claim Windows or
   macOS hardware execution.
2. The current Android trace corpus still cannot substitute for a trustworthy
   API 37 device trace. Android 17 knowledge/contracts are verified, but API 37
   device evidence should not be claimed until such a fixture is available.
3. `backend/src/routes/agentRoutes.ts` still contains broad legacy orchestration
   responsibilities. Security-critical projection was centralized in this
   review, but splitting the route module further is maintainability work, not
   a correctness prerequisite for this landing.

## Perfetto-Skills paired closure

The public projection was generated from the exact clean SmartPerfetto commit
`eb4ef81e660fc397c8cabe90ab0b499899931909` and committed in the paired
repository as `8844a1332dc116228f3ae6070465453e7ffbf3a9`. Both commits are reachable
from their respective `origin/main` branches. The paired impact decision is
`required`; its change fingerprint is
`51a41f819d20f26ea3d79c06925cf9ec7c40ee9f5fa5dea2bdb709d70325d41f`.

The paired repository's complete gate passed after synchronization: 651 query
definitions were statically valid, 6 real-fixture scenes and 11 semantic
assertions executed, and all 170 tests passed with 1 existing skip. The gate
also exposed and closed two stale synchronization-test baselines: the immutable
SmartPerfetto pin and a fixed Strategy source count that duplicated generated
manifest state.

All 101 Strategy/registry source files are now explicitly classified by
`backend/skills/public-export.yaml`: portable comparison, scene-reconstruction,
retrieval-safety, Skill methodology, and pipeline knowledge are exported;
SmartPerfetto Case Library, session/memory, frontend pre-query, final-report
runtime, and report-rendering templates remain product-only with explicit
reasons.

Final SmartPerfetto impact decision: `required`.

Final SmartPerfetto impact fingerprint:
`fe62defae1724db001a2b467e92280c4958f96fd871f2e6e59590cdc9c2d1b94`.

## Perfetto submodule landing closure

The Perfetto UI changes are committed at
`712fd3b8060adb2f5e8168ffd84284beb9c01c2b` and are reachable from the fork's
`main` branch. The root gitlink now points to that commit, and the committed
prebuild was regenerated as `frontend/v57.2-712fd3b80`. The full UI unit suite
passed on the committed content; the post-commit UI build and root
frontend-prebuild integrity check also passed, so a fresh clone can reproduce
the source/prebuild relationship.
