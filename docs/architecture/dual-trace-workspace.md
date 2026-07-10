# 双 Trace 工作区操作模型

[English](dual-trace-workspace.en.md) | [中文](dual-trace-workspace.md)

本文定义 Web UI Raw Trace Compare 的双窗操作模型。它补充
[架构总览](overview.md)中的对比模式说明，重点覆盖用户操作、AI Panel
上下文、前后端协同和边界条件。Analysis Result Compare 仍走
workspace comparison API，不属于本文范围。

## 产品原则

- 默认仍是单窗。用户打开普通 Trace 后只看到一个 Perfetto timeline 和 AI Panel。
- 选择 reference Trace 只进入对比模式，不自动打开双窗。
- 双 Trace 工作区是显式视图。用户点击对比栏里的“打开双窗”后，才在同页打开两个完整 Perfetto timeline。
- “收起双窗”和“退出对比”是两个动作。收起只隐藏双窗，reference Trace 和 AI 对比上下文保留；退出会清掉 reference Trace、对比上下文和对比 agent session。
- AI 上下文独立于视觉窗口。即使双窗收起，`current` 与 `reference` 仍然可用于 SQL、Skill、报告和多轮对比；视觉状态只告诉模型哪一侧是 live UI，哪一侧只是 context。
- 双窗 iframe 不拥有新的 AI session，也不重复上传 trace。它们只作为完整 Perfetto timeline 视图使用。

## 状态机

| 状态 | UI 表现 | 后端对比能力 | 进入条件 | 退出条件 |
| --- | --- | --- | --- | --- |
| Single trace | 单 timeline + AI Panel | 单 Trace 工具 | 打开普通 Trace、退出对比、切换 workspace、新 Trace reset | 选择 reference Trace |
| Comparison context | 单 timeline + 对比栏 | `referenceTraceId` 生效，comparison tools 可用 | 在 trace picker 选择 reference Trace | 退出对比、切换 Trace/workspace |
| Dual workspace | 同页两个完整 timeline | 同 Comparison context，额外带视觉布局状态 | 点击“打开双窗” | 点击“收起”或退出对比 |
| Pane minimized | 一个 live iframe + 一个最小化 rail | 两侧仍可分析，最小化侧标记为 `context_only` | 点击 pane 最小化 | 点击 rail 还原、重置、最大化另一侧、退出 |
| Pane maximized | 一个 iframe 占满工作区 | 最大化侧 `live`，另一侧 `context_only` | 点击 pane 最大化 | 再点恢复、重置、退出 |

## 加载与打开流程

### 1. 普通 Trace 加载

1. 用户通过 Perfetto UI 打开 trace。
2. 前端后台上传 trace 到 `/api/traces/upload` 或使用已有 HTTP RPC target。
3. `backendTraceId` ready 后，AI Panel 显示可分析状态。
4. 此时 `referenceTraceId = null`，`tracePairWorkspaceOpen = false`。

如果后台 trace 尚未 ready，对比入口不展示或不可用；双窗不能在缺少 current
backend trace id 的状态打开。

### 2. 选择 reference Trace

1. 用户点击 AI Panel header 的对比按钮。
2. trace picker 从后端读取当前 workspace 的 trace 列表。
3. picker 过滤掉当前 `backendTraceId`，避免自己和自己对比。
4. 用户选中一个 reference Trace。
5. 前端写入：
   - `referenceTraceId`
   - `referenceTraceName`
   - `isReferenceActive = false`
   - `tracePairWorkspaceOpen = false`
   - `tracePairSplitPercent = 50`
   - `tracePairMaximizedTraceSide = null`
   - `tracePairMinimizedTraceSides = empty`
6. AI Panel 显示对比栏和 reference 映射，但页面仍保持单 timeline。

这一步已经启用后端 raw trace comparison。用户可以直接问“对比两个 Trace
的启动耗时差异”，也可以先打开双窗观察。

### 3. 显式打开双窗

1. 用户点击对比栏里的“打开双窗”。
2. 前端确认 current `backendTraceId` 与 `referenceTraceId` 都存在。
3. `tracePairWorkspaceOpen = true`。
4. 页面渲染固定覆盖层 `ai-trace-pair-workspace`。
5. current pane 和 reference pane 分别创建 same-origin iframe：
   - `hideSidebar=true`
   - `mode=embedded`
   - `smartperfettoDualTrace=true`
   - `smartperfettoPane=current|reference`
   - `url=/api/workspaces/:workspaceId/traces/:traceId/file`
6. `load_trace.ts` 看到 `smartperfettoDualTrace=true` 后跳过 AI backend upload。
7. 每个 iframe 使用 Perfetto UI 自己的 WASM engine 加载完整 timeline。

双窗 iframe 是完整 Perfetto timeline，用户可以在每一侧独立搜索、缩放、
选择、展开 track 和查询。主 AI Panel 仍然是唯一对话入口。

## 双窗内操作

| 操作 | 用户入口 | 状态变化 | AI 上下文影响 |
| --- | --- | --- | --- |
| 左右/上下切换 | 工作区右上工具按钮 | `tracePairLayout = horizontal|vertical`，取消最大化 | `primarySide/referenceSide` 从 left/right 切到 top/bottom |
| 拖拽 splitter | 中间分割线 | `tracePairSplitPercent` 更新，限制在 18 到 82 | `splitPercent` 进入 `tracePairContext` |
| 最大化一侧 | pane toolbar | `tracePairMaximizedTraceSide = current|reference`，清空 minimized | 最大化侧 `live`，另一侧 `context_only` |
| 最小化一侧 | pane toolbar | `tracePairMinimizedTraceSides = {side}`，取消最大化 | 最小化侧 `context_only`，另一侧 `live` |
| 还原最小化 | minimized rail | 从 minimized set 删除该侧 | 该侧恢复 `live` |
| 在新标签页打开 | pane toolbar | 不改变当前对比状态 | 只是辅助查看；新标签页仍是 embedded trace URL |
| 收起双窗 | 工作区 header | `tracePairWorkspaceOpen = false`，清掉 max/min | 对比上下文保留，workspaceOpen 变 false |
| 退出对比 | 对比栏退出按钮 | 清掉 reference、agent session、双窗状态 | 后续请求回到单 Trace |

收起双窗不重置 `tracePairLayout` 和 `tracePairSplitPercent`，这样用户再次打开时
可以保留刚才的布局偏好。选择新的 reference Trace 时重新回到 50/50。

## AI Panel 上下文契约

前端发送分析请求时，如果 `referenceTraceId` 存在：

```json
{
  "traceId": "current-trace-id",
  "referenceTraceId": "reference-trace-id",
  "options": {
    "tracePairContext": {
      "schemaVersion": 1,
      "layout": "horizontal",
      "primarySide": "left",
      "referenceSide": "right",
      "activeSide": "left",
      "workspaceOpen": false,
      "splitPercent": 50,
      "panes": [
        {
          "side": "left",
          "traceSide": "current",
          "traceId": "current-trace-id",
          "traceName": "current.perfetto-trace",
          "active": true,
          "visualState": "live"
        },
        {
          "side": "right",
          "traceSide": "reference",
          "traceId": "reference-trace-id",
          "traceName": "reference.perfetto-trace",
          "active": false,
          "visualState": "context_only"
        }
      ],
      "aliases": {
        "左侧": "current",
        "右侧": "reference",
        "上方": "current",
        "下方": "reference",
        "当前": "current",
        "参考": "reference"
      }
    }
  }
}
```

规则：

- `current` 始终是用户最初打开的主 Trace。
- `reference` 始终是用户从 trace picker 选择的参考 Trace。
- 左右布局时：current 是左/主，reference 是右/参考。
- 上下布局时：current 是上/主，reference 是下/参考。
- `activeSide` 由用户最近 hover/focus 的 pane 决定；双窗未打开时默认 current。
- `visualState=live` 表示该 pane 当前可见；`context_only` 表示它仍可分析，但不是当前可见窗口。
- 后端 normalize 会丢弃非法 side、非法 layout、重复 minimized side，并把 split 限制在 18 到 82。
- System prompt 中只注入结构化映射，不把双窗 UI 文案当作 durable prompt 内容。

## 前后端协同

| 层 | 责任 |
| --- | --- |
| Perfetto UI 主页面 | 打开 current trace、维护 AI Panel 状态、渲染对比栏和双窗 overlay |
| AI Panel | 选择 reference Trace、构造 `tracePairContext`、发送 `referenceTraceId` |
| 双窗 iframe | 用 workspace trace file URL 加载完整 Perfetto timeline，不创建新的对比 session |
| `load_trace.ts` | 识别 `smartperfettoDualTrace=true`，跳过后台 AI upload |
| Backend analyze route | 校验/normalize `tracePairContext`，把 `referenceTraceId` 传给 runtime |
| MCP registry | 只有存在 `referenceTraceId` 时暴露 comparison tools |
| Agent runtime | 使用 shared comparison methodology，按 current/reference 或 left/right/top/bottom 取证 |
| Report/snapshot | 保留 raw trace comparison 的 evidence/report/session snapshot 合约，和 CLI `smp compare` 对齐 |

## 边界条件

### 当前 trace 尚未 ready

对比入口依赖 `isInRpcMode && hasBackendTrace`。如果当前 trace 还没上传或注册成功，
用户不能选择 reference，也不能打开双窗。错误应停在 AI Panel 的 backend 状态上，
而不是创建半个双窗。

### 没有可用 reference trace

trace picker 显示空态：需要先上传另一个 trace。当前 trace 被过滤掉，防止自对比。

### Reference trace 文件不可读

双窗 iframe 会在对应 pane 内表现为 Perfetto 加载失败；AI 分析请求仍会由后端
trace service/SQL 工具报错。UI 不应静默把 reference 换成其他 trace。

### 用户切换新 Trace

新 Trace reset 必须回到 Single trace：

- 清空 `referenceTraceId/referenceTraceName`
- 关闭双窗
- 清空 max/min 状态
- 清空旧 comparison session bridge
- 创建或恢复新 Trace 自己的单 Trace session

这样避免旧 reference 被误套到新 current trace。

### 用户切换 workspace

workspace 切换会清掉 trace picker 列表、reference、双窗状态和 agent session。
新的 trace file URL 必须使用新 workspace 的
`/api/workspaces/:workspaceId/traces/:traceId/file`。

### 用户收起双窗后继续对话

`referenceTraceId` 仍然存在，所以后续问题仍是双 Trace raw comparison。模型会看到
`workspaceOpen=false`，应理解为“视觉双窗收起，但 reference Trace 仍可分析”。

### 用户退出对比后继续对话

退出会清掉 `referenceTraceId` 和对比 agent session。后续请求不注册 comparison tools，
也不携带 `tracePairContext`。

### 最小化/最大化后继续对话

AI 不应把隐藏侧当作不存在。隐藏侧仍可通过 SQL/Skill 分析，只是在回答中标注它是
context-only。只有 trace 加载或 backend 查询失败，才算该侧不可用。

### AI Panel 位置切换

AI Panel 的 Right/Bottom/浮窗位置只影响对话面板，不改变双窗的 current/reference
语义。双窗 overlay 是主页面级视图。

### 多轮 session

进入对比会断开不兼容的单 Trace agent session。退出对比也会断开 comparison session。
Provider/runtime pinning 继续遵守普通 session 规则，不能因为对比模式静默切换 provider。

## 完成标准

双 Trace 工作区相关改动完成前，需要至少证明：

- 普通打开 Trace 时默认是单窗。
- 选择 reference Trace 后进入 Comparison context，但不会自动打开双窗。
- 点击“打开双窗”后同页出现两个完整 Perfetto timeline。
- 左右/上下、拖拽、最小化、最大化、收起、退出都能改变正确状态。
- 双窗 iframe 不会新增后台 trace 上传。
- `tracePairContext` 在双窗打开/收起、上下布局、max/min 状态下都符合契约。
- Backend normalize 和 system prompt 能稳定处理非法/缺失字段。
- `frontend/` 预构建已刷新，`./start.sh` 路径能拿到相同行为。
