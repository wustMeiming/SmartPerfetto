# Perfetto fork branch closure review — 2026-07-20

This review records how the remaining `Gracker/perfetto` branches were absorbed
without replacing the current modular SmartPerfetto UI with historical source.
It is an equivalence and ancestry record, not a claim that old files were copied
into the current tree.

## Closure policy

- `fork/dev/github-bot/update-codeowners` is a current generated metadata
  change, so it is merged normally.
- `fork/feat/save-html-report` contains one useful UI capability on an obsolete
  panel implementation. Commit `9f1846787b` reimplements that capability on the
  current authenticated report-export and localization architecture. The old
  branch is then ancestry-closed with an `ours` merge.
- `fork/smartperfetto` is the original monolithic plugin history. Every useful
  capability has a maintained equivalent below. Its nested `perfetto`
  gitlink/`.gitmodules` experiment and obsolete monolithic files must not
  replace the current fork, so the branch is ancestry-closed with an `ours`
  merge after this review.

## Historical capability crosswalk

| Historical commit/capability | Maintained equivalent | Verification evidence |
| --- | --- | --- |
| `0c6e9915ff` — AI Assistant and frontend export | `ui/src/plugins/com.smartperfetto.AIAssistant/ai_panel.ts` (`handleExportCommand`, `exportCurrentSession`) and current plugin registration in `index.ts` | Perfetto UI typecheck/build; complete UI unit suite |
| `d153f581a1` — `/slow` and `/memory` | `ai_panel.ts` command dispatcher plus `handleSlowCommand` and `handleMemoryCommand`; both use the current backend session/chat path and localized presentation | Perfetto UI typecheck/build; complete UI unit suite |
| `74ffbe68ea` — remove hardcoded DeepSeek key | `ui/src/plugins/com.smartperfetto.AIAssistant/types.ts` keeps `deepseekApiKey: ''`; provider credentials remain runtime/user configuration | Perfetto UI typecheck/build and provider/settings unit coverage |
| `aedf1a92ec` — chart visualizer | `chart_visualizer.ts`, its `ai_panel.ts` integration, and `sql_result_table.ts` integration | `sql_result_table_unittest.ts`; Perfetto UI typecheck/build |
| `aedf1a92ec` — navigation bookmark bar | `navigation_bookmark_bar.ts` and the current `ai_panel.ts` bookmark integration | Perfetto UI typecheck/build; complete UI unit suite |
| `8e9c52c44f` — conclusion card | `sse_event_handlers.ts` (`renderConclusionCard`) and the current conclusion/result contracts | `sse_event_handlers_unittest.ts` conclusion-event and contract cases |
| `8ba64e18db` — deep frame details | `sse_event_handlers.ts` (`findFrameDetail`) plus current expandable structured-data rendering | `sse_event_handlers_unittest.ts` malformed/valid expandable frame-ID regression |

The old branch also introduced a nested `perfetto` gitlink inside the Perfetto
fork. That topology is not a product capability and is intentionally excluded:
SmartPerfetto's root repository is the sole owner of the `perfetto/` submodule
boundary and committed `frontend/` prebuild.

## Modern report-saving replacement

Commit `9f1846787b` replaces the behavior from `5bb7671787` with:

- an explicit localized Save HTML action beside the detailed report link;
- same-backend validation with safe report IDs and backend path-prefix
  preservation;
- authenticated/context-aware fetching of `/api/reports/:id/export`, retaining
  RBAC, audit, attachment, and API-key behavior;
- safe `Content-Disposition` handling with forced `.html` output;
- user cancellation separated from real picker/write failures;
- focused URL, filename, cancellation, and write-failure tests.

The paired SmartPerfetto backend change rejects unsafe decoded report IDs before
cache, filesystem, export, or delete access. It includes encoded-slash
regressions for both report viewing and exporting.

## Recorded gates

- Independent read-only review: PASS after backend path traversal, custom
  backend prefix, error localization, and file-picker error findings were
  fixed.
- Focused backend owner/report routes: 14/14 passed.
- Focused Perfetto download/report tests: 18/18 passed.
- Perfetto TypeScript typecheck/build: passed as part of the focused UI test
  build.
- Complete Perfetto UI suite: 174 files passed; 2,908 tests passed and 1
  skipped.
- Dev browser smoke: loaded the maintained 7 MB Android scrolling trace in
  `v57.2-11d1f2c7d`, opened the localized AI Assistant, confirmed backend/RPC
  readiness, and observed no browser warnings or errors.
- `git diff --check`: passed in both repositories.
- After `git fetch --prune fork`, every non-main `fork/*` branch was an ancestor
  of `main`.
- Perfetto-Skills impact review: `not_required`; fingerprint
  `0bedc37e9cac3550ba167b523541594973f5629664285617f6e18c90d86b6ece`.
  The affected report/UI/branch-history behavior is product-only and does not
  alter portable SQL, Skill methodology, evidence contracts, or export policy.

The root `verify:pr` and committed frontend-prebuild checks run after the fork
commit is copied into SmartPerfetto's `frontend/` bundle.
