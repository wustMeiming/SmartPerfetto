# API 参考

[English](api.en.md) | [中文](api.md)

默认后端地址是 `http://localhost:3000`。如需修改后端端口，设置
`SMARTPERFETTO_BACKEND_PORT`。如果设置了 `SMARTPERFETTO_API_KEY`，受保护接口需要：

```http
Authorization: Bearer <token>
```

## 健康检查

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/health` | 后端状态、运行时、模型配置、鉴权状态 |
| `GET` | `/debug` | 开发调试信息，包含 legacy API 使用快照 |

## Trace 管理

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/traces/health` | trace 服务健康状态 |
| `POST` | `/api/traces/upload` | 上传 trace 文件，字段名 `file` |
| `GET` | `/api/traces` | 列出已知 trace |
| `GET` | `/api/traces/stats` | trace 统计 |
| `POST` | `/api/traces/cleanup` | 清理 trace |
| `POST` | `/api/traces/register-rpc` | 注册外部 trace_processor RPC |
| `GET` | `/api/traces/:id` | trace 信息 |
| `DELETE` | `/api/traces/:id` | 删除 trace |
| `GET` | `/api/traces/:id/file` | 下载 trace 文件 |

上传示例：

```bash
curl -F "file=@trace.pftrace" http://localhost:3000/api/traces/upload
```

## Workspace-scoped API

新集成优先使用 workspace-scoped 路径。未启用企业/多 workspace 时，旧的全局路径仍可用于本地和兼容场景。

| Base path | 说明 |
|---|---|
| `/api/workspaces/:workspaceId/traces` | workspace 范围内的 trace 上传、列表、删除、下载 |
| `/api/workspaces/:workspaceId/reports` | workspace 范围内的报告读取、导出、删除 |
| `/api/workspaces/:workspaceId/agent` | workspace 范围内的 agent 分析、SSE、多轮、反馈 |
| `/api/workspaces/:workspaceId/providers` | workspace 范围内的 Provider Manager profile |
| `/api/workspaces/:workspaceId/analysis-results` | 分析结果 snapshot 列表、读取、更新 |
| `/api/workspaces/:workspaceId/windows` | 前端窗口 heartbeat 与 active window 状态 |
| `/api/workspaces/:workspaceId/comparisons` | 多分析结果 comparison 创建、读取、stream、导出 |

## Agent v1 主路径

Base path: `/api/agent/v1`

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/analyze` | 启动分析 |
| `POST` | `/sessions/:sessionId/runs` | 在已有 session 下启动新 run |
| `GET` | `/:sessionId/stream` | SSE 流 |
| `GET` | `/runs/:runId/stream` | 按 run id 订阅 SSE |
| `GET` | `/:sessionId/status` | 查询状态 |
| `GET` | `/:sessionId/turns` | 获取多轮历史 |
| `GET` | `/:sessionId/turns/:turnId` | 获取单轮详情 |
| `POST` | `/resume` | 恢复已有 session |
| `POST` | `/:sessionId/respond` | 继续或终止 awaiting_user 会话 |
| `POST` | `/sessions/:sessionId/respond` | `respond` 的 session-scoped alias |
| `POST` | `/:sessionId/cancel` | 取消分析 |
| `POST` | `/:sessionId/interaction` | 记录 UI 交互 |
| `GET` | `/:sessionId/focus` | 查询 focus 状态 |
| `GET` | `/:sessionId/report` | 获取分析报告 |
| `DELETE` | `/:sessionId` | 删除 session |
| `POST` | `/:sessionId/feedback` | 提交反馈，进入 self-improving 链路 |
| `POST` | `/scene-detect-quick` | 快速场景检测 |
| `POST` | `/teaching/pipeline` | 渲染管线教学 |
| `GET` | `/sessions` | session catalog |
| `GET` | `/logs` | agent logs，受 feature flag 控制 |

Workspace-scoped agent base 为 `/api/workspaces/:workspaceId/agent`，其子路径与上表一致。`/api/agent/v1` 当前仍存在，但会通过 legacy telemetry 标记迁移目标。

启动分析：

```bash
curl -X POST http://localhost:3000/api/agent/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "trace-id",
    "query": "分析滑动卡顿",
    "options": {
      "analysisMode": "auto"
    }
  }'
```

响应会返回 `sessionId`。随后订阅：

```bash
curl -N http://localhost:3000/api/agent/v1/<sessionId>/stream
```

支持的 `selectionContext`：

```json
{
  "selectionContext": {
    "kind": "area",
    "startNs": 1000000000,
    "endNs": 2000000000
  }
}
```

```json
{
  "selectionContext": {
    "kind": "track_event",
    "eventId": 123,
    "ts": 1000000000
  }
}
```

双 trace 对比需要传 `referenceTraceId`，且不能与 `traceId` 相同。

智能分析通过同一个 `/analyze` 入口启动。第一次请求建议只做场景盘点：

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

场景盘点完成后，`analysis_completed` payload 会携带 `smartScenePreview.reportId` 和可选范围。用户选择范围后再次调用 `/analyze`：

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

`smartSelection.scope` 支持 `all`、`scene_types` 和 `scene_ids`。智能分析暂不支持 `referenceTraceId`，也不能作为已有 session 的后续轮次运行。

## Scene Reconstruction

Base path: `/api/agent/v1`

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/scene-reconstruct/preview` | 缓存检查与成本预估，不启动重任务 |
| `GET` | `/scene-reconstruct/report/:reportId` | 获取持久化 SceneReport |
| `POST` | `/scene-reconstruct` | 启动场景还原 |
| `GET` | `/scene-reconstruct/:analysisId/stream` | 场景还原 SSE |
| `GET` | `/scene-reconstruct/:analysisId/tracks` | 获取 tracks |
| `GET` | `/scene-reconstruct/:analysisId/status` | 查询状态 |
| `POST` | `/scene-reconstruct/:analysisId/deep-dive` | 对某个场景深挖 |
| `POST` | `/scene-reconstruct/:analysisId/cancel` | 取消 |
| `DELETE` | `/scene-reconstruct/:analysisId` | 删除 |

该能力受 `FEATURE_AGENT_SCENE_RECONSTRUCT` 控制。

## Skill API

Base path: `/api/skills`

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/` | 列出 Skill |
| `GET` | `/:skillId` | Skill 详情 |
| `POST` | `/execute/:skillId` | 执行指定 Skill |
| `POST` | `/analyze` | 自动检测并执行 Skill |
| `POST` | `/detect-intent` | 意图检测 |
| `POST` | `/detect-vendor` | 厂商检测 |

Admin path: `/api/admin`

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/skills` | 管理端 Skill 列表 |
| `POST` | `/skills` | 创建 Skill |
| `PUT` | `/skills/:skillId` | 更新 Skill |
| `DELETE` | `/skills/:skillId` | 删除 Skill |
| `POST` | `/skills/validate` | 校验 Skill |
| `POST` | `/skills/reload` | 重新加载 Skill |
| `POST` | `/strategies/reload` | 重新加载策略 |
| `GET` | `/self-improve/metrics` | 自改进指标 |

## Provider Manager API

Legacy base path: `/api/v1/providers`。新集成优先使用
`/api/workspaces/:workspaceId/providers`。

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/` | 列出 provider profile |
| `GET` | `/templates` | 获取内置 provider 模板 |
| `GET` | `/effective` | 获取当前生效 provider/runtime |
| `GET` | `/:id` | 获取单个 provider |
| `POST` | `/` | 创建 provider |
| `PATCH` | `/:id` | 更新 provider |
| `DELETE` | `/:id` | 删除 provider |
| `POST` | `/deactivate` | 停用 active provider，回到 system default |
| `POST` | `/:id/activate` | 激活 provider |
| `POST` | `/:id/runtime` | 更新 provider runtime pinning |
| `POST` | `/:id/rotate-secret` | 轮换 provider secret |
| `POST` | `/:id/test` | 测试 provider |

## Codebase / RAG API

Base path: `/api/rag`

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/stats` | RAG store 统计 |
| `GET` | `/chunks/:chunkId` | 读取 chunk |
| `DELETE` | `/chunks/:chunkId` | 删除 chunk |
| `POST` | `/search` | 搜索代码/知识 chunk |
| `GET` | `/codebases` | 列出已注册 codebase |
| `POST` | `/codebases/preview` | 预览 path security gate 接受的文件 |
| `POST` | `/codebases/register` | 注册本机代码库 |
| `GET` | `/codebases/:id` | codebase 详情 |
| `GET` | `/codebases/:id/symbols` | 符号解析 |
| `GET` | `/codebases/:id/excerpt` | 读取已索引片段 |
| `POST` | `/codebases/:id/reindex` | 重新索引 |
| `GET` | `/codebases/:id/audit` | 索引审计 |

## Analysis Result Comparison API

Workspace base path: `/api/workspaces/:workspaceId/comparisons`

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/` | 创建 analysis-result comparison |
| `PATCH` | `/:comparisonId/baseline` | 更新 baseline |
| `GET` | `/:comparisonId/report/export` | 导出 comparison report |
| `GET` | `/:comparisonId` | 获取 comparison |
| `GET` | `/:comparisonId/stream` | 订阅 comparison stream |

Analysis-result snapshot base path: `/api/workspaces/:workspaceId/analysis-results`

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/` | 列出 snapshot |
| `GET` | `/:snapshotId` | 读取 snapshot |
| `PATCH` | `/:snapshotId` | 更新 snapshot 元数据 |

## 报告与导出

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/reports/:reportId` | 获取报告 |
| `DELETE` | `/api/reports/:reportId` | 删除报告 |
| `POST` | `/api/export/result` | 导出单个结果 |
| `POST` | `/api/export/session` | 导出 session |
| `POST` | `/api/export/analysis` | 导出分析 |
| `GET` | `/api/export/formats` | 支持格式 |

## Legacy 与兼容接口

以下接口仍存在，但新集成应优先使用 `/api/agent/v1/*`：

- `/api/traces/*`，优先迁移到 `/api/workspaces/:workspaceId/traces/*`
- `/api/reports/*`，优先迁移到 `/api/workspaces/:workspaceId/reports/*`
- `/api/agent/v1/*`，workspace 产品优先迁移到 `/api/workspaces/:workspaceId/agent/*`
- `/api/v1/providers/*`，优先迁移到 `/api/workspaces/:workspaceId/providers/*`
- `/api/perfetto-sql/*`
- `/api/template-analysis/*`

仍在维护的辅助 API 包括 `/api/flamegraph/*`、`/api/critical-path/*`、`/api/baselines/*`、`/api/memory/*`、`/api/cases/*`、`/api/ci/*`、`/api/tp/*`、`/api/auth/*`、`/api/tenant/*` 和 `/api/admin/runtime/*`。这些接口面向特定产品面或管理面，调用前应先确认当前部署是否启用了对应 feature / auth。

legacy agent API base 会被 `rejectLegacyAgentApi` 拒绝，避免外部继续接入废弃路径。`/api/advanced-ai/*`、`/api/auto-analysis/*` 和 `/api/agent/v1/llm/*` 这类旧 direct AI route 已移除；统一使用 `/api/agent/v1/analyze`。
