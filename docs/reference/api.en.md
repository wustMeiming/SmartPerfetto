# API Reference

[English](api.en.md) | [中文](api.md)

The default backend address is `http://localhost:3000`. Set
`SMARTPERFETTO_BACKEND_PORT` to use a different backend port. If
`SMARTPERFETTO_API_KEY` is set, protected APIs require:

```http
Authorization: Bearer <token>
```

## Health

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Backend status, runtime, model configuration, auth status |
| `GET` | `/debug` | Development diagnostics and legacy API usage snapshot |

## Trace Management

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/traces/health` | Trace service health |
| `POST` | `/api/traces/upload` | Upload a trace file with field name `file` |
| `GET` | `/api/traces` | List known traces |
| `GET` | `/api/traces/stats` | Trace statistics |
| `POST` | `/api/traces/cleanup` | Cleanup trace data |
| `POST` | `/api/traces/register-rpc` | Register an external trace_processor RPC endpoint |
| `GET` | `/api/traces/:id` | Trace metadata |
| `DELETE` | `/api/traces/:id` | Delete a trace |
| `GET` | `/api/traces/:id/file` | Download a trace file |

Upload example:

```bash
curl -F "file=@trace.pftrace" http://localhost:3000/api/traces/upload
```

## Workspace-scoped APIs

New integrations should prefer workspace-scoped paths. When enterprise or
multiple workspaces are not enabled, the legacy global paths remain available
for local and compatibility flows.

| Base path | Purpose |
|---|---|
| `/api/workspaces/:workspaceId/traces` | Workspace-scoped trace upload, list, delete, and download |
| `/api/workspaces/:workspaceId/reports` | Workspace-scoped report read, export, and delete |
| `/api/workspaces/:workspaceId/agent` | Workspace-scoped agent analysis, SSE, turns, and feedback |
| `/api/workspaces/:workspaceId/providers` | Workspace-scoped Provider Manager profiles |
| `/api/workspaces/:workspaceId/analysis-results` | Analysis-result snapshot list, read, and update |
| `/api/workspaces/:workspaceId/windows` | Frontend window heartbeat and active-window state |
| `/api/workspaces/:workspaceId/comparisons` | Multi-result comparison create, read, stream, and export |

## Agent v1 Main Path

Base path: `/api/agent/v1`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/analyze` | Start analysis |
| `POST` | `/sessions/:sessionId/runs` | Start a new run in an existing session |
| `GET` | `/:sessionId/stream` | Subscribe to SSE |
| `GET` | `/runs/:runId/stream` | Subscribe to SSE by run id |
| `GET` | `/:sessionId/status` | Poll status |
| `GET` | `/:sessionId/turns` | Get multi-turn history |
| `GET` | `/:sessionId/turns/:turnId` | Get a single turn |
| `POST` | `/resume` | Resume an existing session |
| `POST` | `/:sessionId/respond` | Continue an awaiting-user session |
| `POST` | `/sessions/:sessionId/respond` | Session-scoped alias for `respond` |
| `POST` | `/:sessionId/cancel` | Cancel analysis |
| `POST` | `/:sessionId/interaction` | Record UI interaction |
| `GET` | `/:sessionId/focus` | Query focus state |
| `GET` | `/:sessionId/report` | Fetch generated report |
| `DELETE` | `/:sessionId` | Delete a session |
| `POST` | `/:sessionId/feedback` | Submit feedback into the self-improving path |
| `POST` | `/scene-detect-quick` | Quick scene detection |
| `POST` | `/teaching/pipeline` | Rendering pipeline teaching |
| `GET` | `/sessions` | Session catalog |
| `GET` | `/logs` | Agent logs, gated by feature flag |

The workspace-scoped agent base is `/api/workspaces/:workspaceId/agent`, with
the same child paths as the table above. `/api/agent/v1` still exists and is
tracked by legacy telemetry with a migration target.

Start analysis:

```bash
curl -X POST http://localhost:3000/api/agent/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "trace-id",
    "query": "Analyze scrolling jank",
    "options": {
      "analysisMode": "auto"
    }
  }'
```

The response returns `sessionId`. Then subscribe:

```bash
curl -N http://localhost:3000/api/agent/v1/<sessionId>/stream
```

Dual-trace comparison requires `referenceTraceId`, and it must be different from `traceId`.

Smart analysis uses the same `/analyze` endpoint. The first request should usually run only the scene inventory:

```json
{
  "traceId": "trace-id",
  "query": "/smart",
  "options": {
    "analysisMode": "auto",
    "preset": "smart",
    "smartAction": "preview"
  }
}
```

When the preview completes, the `analysis_completed` payload includes `smartScenePreview.reportId` and the selectable scene ranges. Submit the selected scope with another `/analyze` request:

```json
{
  "traceId": "trace-id",
  "query": "/smart",
  "options": {
    "analysisMode": "auto",
    "preset": "smart",
    "smartAction": "analyze",
    "smartSelection": {
      "scope": "scene_types",
      "sceneTypes": ["scroll", "inertial_scroll"],
      "reportId": "scene-report-id"
    }
  }
}
```

`smartSelection.scope` accepts `all`, `scene_types`, and `scene_ids`. Smart analysis currently rejects `referenceTraceId` and existing-session continuation runs.

## Scene Reconstruction

Base path: `/api/agent/v1`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scene-reconstruct/preview` | Check cache and estimate cost without starting heavy work |
| `GET` | `/scene-reconstruct/report/:reportId` | Fetch a persisted SceneReport |
| `POST` | `/scene-reconstruct` | Start scene reconstruction |
| `GET` | `/scene-reconstruct/:analysisId/stream` | Subscribe to scene reconstruction SSE |
| `GET` | `/scene-reconstruct/:analysisId/tracks` | Fetch tracks |
| `GET` | `/scene-reconstruct/:analysisId/status` | Poll status |
| `POST` | `/scene-reconstruct/:analysisId/deep-dive` | Deep-dive one scene |
| `POST` | `/scene-reconstruct/:analysisId/cancel` | Cancel |
| `DELETE` | `/scene-reconstruct/:analysisId` | Delete |

This capability is controlled by `FEATURE_AGENT_SCENE_RECONSTRUCT`.

## Skill API

Base path: `/api/skills`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List Skills |
| `GET` | `/:skillId` | Skill detail |
| `POST` | `/execute/:skillId` | Execute a Skill |
| `POST` | `/analyze` | Detect and run a Skill |
| `POST` | `/detect-intent` | Intent detection |
| `POST` | `/detect-vendor` | Vendor detection |

Admin path: `/api/admin`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/skills` | Admin Skill list |
| `POST` | `/skills` | Create a Skill |
| `PUT` | `/skills/:skillId` | Update a Skill |
| `DELETE` | `/skills/:skillId` | Delete a Skill |
| `POST` | `/skills/validate` | Validate a Skill |
| `POST` | `/skills/reload` | Reload Skills |
| `POST` | `/strategies/reload` | Reload strategies |
| `GET` | `/self-improve/metrics` | Self-improvement metrics |

## Provider Manager API

Legacy base path: `/api/v1/providers`. New integrations should prefer
`/api/workspaces/:workspaceId/providers`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List provider profiles |
| `GET` | `/templates` | Get built-in provider templates |
| `GET` | `/effective` | Get the effective provider/runtime |
| `GET` | `/:id` | Get one provider |
| `POST` | `/` | Create a provider |
| `PATCH` | `/:id` | Update a provider |
| `DELETE` | `/:id` | Delete a provider |
| `POST` | `/deactivate` | Deactivate the active provider and return to system default |
| `POST` | `/:id/activate` | Activate a provider |
| `POST` | `/:id/runtime` | Update runtime pinning |
| `POST` | `/:id/rotate-secret` | Rotate provider secret |
| `POST` | `/:id/test` | Test a provider |

## Codebase / RAG API

Base path: `/api/rag`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/stats` | RAG store stats |
| `GET` | `/chunks/:chunkId` | Read one chunk |
| `DELETE` | `/chunks/:chunkId` | Delete one chunk |
| `POST` | `/search` | Search code or knowledge chunks |
| `GET` | `/codebases` | List registered codebases |
| `POST` | `/codebases/preview` | Preview files accepted by the path security gate |
| `POST` | `/codebases/register` | Register a local codebase |
| `GET` | `/codebases/:id` | Codebase detail |
| `GET` | `/codebases/:id/symbols` | Resolve symbols |
| `GET` | `/codebases/:id/excerpt` | Read an indexed excerpt |
| `POST` | `/codebases/:id/reindex` | Reindex |
| `GET` | `/codebases/:id/audit` | Index audit |

## Analysis Result Comparison API

Workspace base path: `/api/workspaces/:workspaceId/comparisons`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/` | Create an analysis-result comparison |
| `PATCH` | `/:comparisonId/baseline` | Update baseline |
| `GET` | `/:comparisonId/report/export` | Export comparison report |
| `GET` | `/:comparisonId` | Get comparison |
| `GET` | `/:comparisonId/stream` | Subscribe to comparison stream |

Analysis-result snapshot base path: `/api/workspaces/:workspaceId/analysis-results`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List snapshots |
| `GET` | `/:snapshotId` | Read a snapshot |
| `PATCH` | `/:snapshotId` | Update snapshot metadata |

## Reports and Export

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports/:reportId` | Fetch report |
| `DELETE` | `/api/reports/:reportId` | Delete report |
| `POST` | `/api/export/result` | Export one result |
| `POST` | `/api/export/session` | Export session |
| `POST` | `/api/export/analysis` | Export analysis |
| `GET` | `/api/export/formats` | Supported formats |

## Legacy and Compatibility APIs

The following APIs still exist, but new integrations should prefer `/api/agent/v1/*`:

- `/api/traces/*`; prefer `/api/workspaces/:workspaceId/traces/*`
- `/api/reports/*`; prefer `/api/workspaces/:workspaceId/reports/*`
- `/api/agent/v1/*`; workspace products should prefer `/api/workspaces/:workspaceId/agent/*`
- `/api/v1/providers/*`; prefer `/api/workspaces/:workspaceId/providers/*`
- `/api/perfetto-sql/*`
- `/api/template-analysis/*`

Maintained auxiliary APIs include `/api/flamegraph/*`, `/api/critical-path/*`,
`/api/baselines/*`, `/api/memory/*`, `/api/cases/*`, `/api/ci/*`, `/api/tp/*`,
`/api/auth/*`, `/api/tenant/*`, and `/api/admin/runtime/*`. These are scoped to
specific product or admin surfaces; confirm the relevant feature/auth state
before integrating against them.

The legacy agent API base is rejected by `rejectLegacyAgentApi` to avoid new external use of deprecated paths. Legacy direct AI routes such as `/api/advanced-ai/*`, `/api/auto-analysis/*`, and `/api/agent/v1/llm/*` have been removed; use `/api/agent/v1/analyze`.
