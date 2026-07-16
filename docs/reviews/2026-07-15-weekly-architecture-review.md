# SmartPerfetto 周度架构审查（2026-07-15）

## 范围与结论

本次重新审查 `2026-07-08` 至 `2026-07-15` 的提交和当前工作区，覆盖 Perfetto
v57.2、Android 17 渲染知识、trace corpus、dual-trace、heap/GPU/camera、四个 AI
runtime、Smart Profile、源码配置、外部 RAG、报告/快照/CLI、Docker/npm/portable、
Windows/macOS/Linux 和中英文表面。

结论：本周功能方向与总体分层一致，但独立提交叠加后出现了授权连续性、私有输出、
索引代际、请求语言、资源上限和产品表面同步方面的横向缺口。确认成立的问题已在共享
边界修复，而不是在单个调用点 hardcode。独立只读复核和仓库级验证完成后，本轮没有
已知的 P0/P1 架构阻断项；仍有若干有明确边界的证据/跨仓库后续，见“残余限制”和
“Perfetto-Skills paired handoff”。

## 核心架构复核

### Smart Profile 与源码/RAG 组合

| 源码 | 外部 RAG | 运行契约 |
|---|---|---|
| 无 | 无 | 保持普通 trace/Smart 分析；不开放私有知识工具 |
| 有 | 无 | 精确传递 `codeAwareMode` 与 `codebaseIds`，按 active generation 和同意校验 |
| 无 | 有 | 精确传递 `knowledgeSourceIds`，外部文本只作有出处的背景知识 |
| 有 | 有 | 两套 allowlist 独立校验并同时生效，统一进入私有投影 |

任一私有上下文存在时，`fast` / `auto` 解析为具备相应工具和证据门禁的 `full`。
Smart preview 的 report identity 在创建 session 前校验，深度分析使用实际 route 构建的
run options，不从 UI 全局状态猜测。CLI、HTTP 和四个 runtime 使用同一选择与授权指纹。

### 已修复的横向问题

- 授权与代际：tenant/workspace/user、allowlist、active generation、内容指纹、revision
  provenance 和 consent 进入 authorization fingerprint；工具/run 边界发现变化即 fail
  closed。源码与外部 Wiki 使用 lease、唯一 operation generation 和 staged-to-active
  切换，避免并发重建覆盖。
- 源码边界：登记、预览、Wiki 扫描和真实读取都绑定 canonical realpath；读取前后再次
  校验 root identity，拒绝 symlink retarget/TOCTOU。遍历改为流式 `opendir`，并对路径数、
  目录数、跳过诊断和单文件实际字节设置统一上限；路径洪泛返回稳定错误而不制造大数组。
- 私有数据：原始 query、工具参数、检索正文、中间推理和 provider continuation 不再进入
  日志、session、SSE、HTML 报告、CLI artifact 或 snapshot；四个 runtime、完成事件、
  错误、反馈和 case evolution 使用共享投影。私有请求禁止恢复持久化 provider context，
  并清除旧版本可能留下的私有 context snapshot。
- 源码生命周期：新增 scope 内幂等 DELETE。删除先在 ingest lease 内写入 `deleting`
  tombstone、撤销 provider 同意并切断 active generation，再清理全部 staged/active/
  superseded chunks 和注册项。中断可重试，期间检索、重新授权和重建均被拒绝。
- Smart/场景质量：Stage 3 使用持久化模板、一次生成中英摘要并做结构/长度上限；聊天、
  scene story、报告和 progress SSE 按 session-pinned language 投影，进度不泄露内部 phase
  code。Smart selection alias 冲突和过期 preview 返回稳定、本地化错误码。
- RAG/记忆资源：搜索 query/topK/filter、local store、candidate enumeration、output guard、
  scene cache、private provenance 均有上限、TTL/LRU 或批处理；enterprise schema 回填可恢复。
- Runtime 隔离：OpenCode 每个 session 使用独立 HOME/XDG/AppData/tmp/config，并用随机
  loopback Basic Auth；动态端口不再依赖 `--port=0`，只对实际占用冲突有限重试。Provider
  snapshot 变化、删除或授权撤销会终止旧 session，避免跨 provider/用户复用上下文。
- Runtime 计划门禁：架构专属阶段从 strategy frontmatter 动态解析，不再对所有
  rendering 分支一刀切。`expectedCalls` 只能由成功的工具调用满足；双 Trace
  `compare_skill` 任一侧失败即整体失败并显式列出失败侧。已声明的证据阶段不能
  以“根因已清楚”为由跳过，只允许触发条件未成立或 trace/能力确实不可用。零参数
  调用（如 `get_comparison_context()`）与带参数调用统一解析；`revise_plan` 不能删除
  未完成阶段或移除其中的 `expectedCalls`，也不能绕过 `update_plan_phase` 直接关闭阶段。
- 最终报告收口：笔记工具被定义为推理记录而非 trace 证据；非截断但缺少必需
  章节的报告会从已完成阶段确定性补齐并重验。恢复文案由 strategy contract 提供，
  startup 的 App/System 建议边界不会误用 scrolling 模板；截断识别会检查全部验证
  issue，不依赖数组中第一个错误的顺序。模型已交付完整报告时，
  `结构化结论` / `结构化报告` 等纯结论阶段在前置证据全部完成后自动闭合，
  不再因 provider 遗漏一次状态更新而误报 `plan_incomplete`。
- 对比与证据：dual-trace 读取采用有上限的流式传输，并把 trace metadata 注册成分析前置
  条件；heap denominator、CPU topology fixture、jank golden 和降级结论契约均改为可验证
  的语义不变量，不再用假结论或陈旧列号让测试“看起来通过”。
- 产品表面：报告、snapshot、CLI、Web SSE 分开保留各自契约；源码选择和凭证绑定按 backend
  与请求 scope 隔离。URL+credential 同时变化会清空私有选择；设置草稿不能把 Codebases
  mutation 绑定到未保存后端。删除 UI 清摘录缓存和选中 ID。
- 平台与打包：portable/npm/Docker 运行资产、trace processor proxy capability secret、
  Windows process harness 失败传播和三平台 Go launcher 交叉编译均纳入验证；`frontend/`
  继续作为 `./start.sh`、Docker 和 portable 的统一预构建输入。
- 测试基础设施：Perfetto UI 的 Storage shim 同时兼容仓库 Node 20 和主项目 Node 24/25
  的 named-property/delete/ownKeys 语义；Trace CLI fixture 复制完整 schema，validator 仅对
  枚举后真实消失的文件容忍 `ENOENT`，运行时 upload JSON 不再制造治理竞态误报。

详细不变量见
[私有分析上下文架构](../architecture/private-analysis-context.md)。

## 多语言与平台结论

- `outputLanguage` 在 session 创建时固定，并传入 Claude/OpenAI/Pi/OpenCode、Smart scene、
  report、snapshot、CLI 和 SSE；分析参数错误按稳定 code 本地化，未知错误中文请求不再
  透传英文。
- 新增 Codebases UI 使用共享 `uiText`，设置 tab、删除/退役状态和错误均有中英文。
- Android 17 rendering docs/Skills 已同步并通过 catalog/hash/runtime asset 门禁，但 trace
  corpus 的设备证据仍只有 API 35/36，不能宣称已完成 API 37 真实 trace 语义验证。
- Node.js 24、Linux Docker、npm CLI、Windows/macOS/Linux portable 的资产边界保持一致；
  真实 provider E2E 使用运行时注入的 DeepSeek 凭证，凭证未写入代码、文档、命令输出
  或测试产物。

## 验证记录

| 验证 | 结果 |
|---|---|
| Backend TypeScript build/typecheck | PASS |
| Runtime/plan/final-report focused regression（6 suites / 237 tests） | PASS |
| Backend 私有会话、Smart、RAG、report/snapshot、CLI/runtime 定向回归 | PASS |
| Backend source/RAG 删除与生命周期定向回归（5 suites / 123 tests） | PASS |
| Backend full Jest（431 suites / 4749 passed / 205 conditionally skipped） | PASS |
| Perfetto UI focused regressions（4 files / 46 tests） | PASS |
| Perfetto UI full build/typecheck | PASS |
| Perfetto UI full unit suite（171 files / 2873 passed / 1 skipped） | PASS |
| Perfetto UI bundled-Node Storage regression（1 file / 10 tests） | PASS |
| Strategy / Skill validation | PASS |
| Real scene trace regression（6 traces） | PASS |
| Trace tooling（28 tests）、catalog（18 cases）、regression（18 cases + 12 constructed / 255 expectations） | PASS |
| Codebase-aware source + real-trace E2E | PASS |
| DeepSeek 真实 provider E2E（OpenAI/Pi/OpenCode × startup/scrolling/dual-trace） | PASS（9/9，均非 partial，claim verifier 通过） |
| Root quality（lint/format/deadcode/shellcheck） | PASS |
| Public Skill export / pinned catalog | PASS |
| CLI pack、portable runtime assets、三平台 launcher/package 自校验 | PASS |
| `verify:pr`（含 65 suites / 882 core tests） | PASS |
| 独立只读架构复核 | PASS（无剩余 P0/P1） |
| 简化检查 | `code-simplifier` NOT AVAILABLE；人工复核 + `git diff --check` PASS |

## 残余限制

1. **API 37 trace evidence**：当前真实 trace 为 API 35/36，constructed overlays 也以 API
   36 为基线。Android 17 文档/Skill 更新已验证结构与运行资产，但在获得可信 API 37
   fixture 前，不把它表述为 API 37 trace regression。
2. **Legacy trace publication exceptions**：6 个历史真实 trace 仍在治理例外表中，owner
   与 `review_by=2026-08-15` 已记录；到期前必须补齐受管发布元数据、隔离或移除。
3. **真实浏览器 smoke**：真实 DeepSeek provider 的三 runtime/三场景 SSE E2E 已完成；
   本轮未在真实浏览器中覆盖 UI 交互、报告跳转与视觉 smoke，该部分仍应在发布
   环境执行。
4. **真实 Windows 与私有知识 provider E2E**：Windows process harness、portable launcher
   和路径/隔离语义已由单测、打包自校验与交叉编译覆盖，但本轮没有 Windows 真机；
   源码-only、RAG-only、源码+RAG、均无的组合由授权/投影/生命周期集成测试覆盖，真实
   DeepSeek 场景使用的是公开 trace fixture，没有把用户私有源码或外部知识正文发送给
   provider。这两项属于发布环境补充验证，不影响当前 fail-closed 契约。

## Perfetto-Skills paired handoff

配对仓库 `../Perfetto-Skills` 当前为 `c8b2dbed87ef568419eff17424feefab63e70289`
且工作区干净。本仓库 camera pipeline 的可移植证据映射已移除不适用于该场景的
`gpu_render_in_range` / `present_fence_timing` detection links；生成的 public projection
因此与配对仓库当前 snapshot 不再完全一致。本任务没有修改 sibling repository。下一次
public Skill sync 的 owner 应在 `Perfetto-Skills` 重新生成 projection、运行其仓库门禁并
回填 paired commit；在此之前记录为 `deferred`，而不是把旧 snapshot 误报为同步完成。
本次影响门禁的 change fingerprint 为
`05352b67cb0f5ba03ce64ecba00fa7f113ee4d88e3a10d76c2fde07d6530ac71`。
