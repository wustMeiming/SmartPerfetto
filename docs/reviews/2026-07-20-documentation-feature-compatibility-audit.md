# 2026-07-20 文档与功能兼容性全量审查

## 审查边界

- 仓库基线：`08321345eb047d5f471f3ee6d439658f92a78632`
- 产品版本：`1.2.1`
- 审查范围：根目录维护文档、`docs/`（不含 `docs/archive/`）、
  `backend/docs/`，以及文档中心推荐阅读路径所指向的功能面
- 运行环境：macOS arm64、Node.js 24、npm 11
- 结论口径：源码、registry/frontmatter、生成器、当前测试和真实运行结果优先；
  历史计划、带日期的演讲材料和 archive 只作为快照

本轮检查了 103 份维护中的 Markdown。文档已经对齐当前 CLI、运行时、签名
Android Internals Knowledge Pack、batch/capture、Code-Aware、发布物和架构边界。
可在当前机器完整执行的功能均已通过；需要真实模型凭证、Android 设备或 Docker
daemon 的项目单独记录为环境未提供，没有把静态检查冒充成真实 E2E。

## 发现并修正的问题

1. 多份源码运行示例仍使用 `npm run cli --`，实际入口已经是
   `npm run cli:dev --`。
2. npm 发布示例把 `--prefix backend` 与 `publish` 组合使用，容易造成 lifecycle
   cwd 错误；现在统一进入 `backend/` 后发布。
3. release、portable 和 Windows 文档把旧版本号写死；现在使用 `<version>`，当前
   发布物由版本同步脚本与 GitHub Release 决定。
4. 配置文档中的 fast/full 默认预算已经落后于源码；现已对齐当前运行时。
5. CLI 文档漏掉 `knowledge-pack status/update`，功能总览也漏掉 batch、
   capture 和内置签名知识包。
6. Data Contract 与技术架构文档仍描述旧版类型和模块结构；已按当前源码重写，
   并补齐英文技术架构。
7. Self-Improving 文档把 review worker 和 auto-patch 描述成已接入主启动链。
   当前源码只证明反馈、pattern、metrics 和可选 notes injection 已接入；review
   worker 是有测试的组件，auto-patch 尚未接入生产启动链。文档已经明确这个边界。
8. 架构深潜和演讲材料把 Skill、知识模板和渲染管线数量写成“当前”常量。当前
   文档改为引用 registry/catalog；2026-06-16 演讲材料保留原数字，但明确标记为
   制作快照。
9. 双 Trace 浏览器 E2E 仍从公开 `/health` 读取详细运行时状态。当前版本已将详细
   诊断收紧到鉴权 `/api/runtime-health`；runner 已改用鉴权端点。
10. 双 Trace E2E 依赖宿主语言，而断言使用中文产品文案；Playwright 现在显式固定
    `zh-CN`。测试还按旧语义等待已取消 session 保留在 status API；当前前端会在
    cancel 成功后删除后端 session，断言现已验证 cancel 与 DELETE 两个响应。清理
    阶段也不会再覆盖更早的主失败。
11. trace corpus 的 legacy-path 扫描会进入 `.claude/worktrees/` 下的另一条 Git
    worktree，把旧分支文档当作当前 checkout。扫描器已排除这个嵌套 worktree 根，
    并新增回归测试；当前仓库仍会正常扫描自己的维护源码。

## 功能兼容性矩阵

| 文档/功能面 | 当前验证 | 结论 |
|---|---|---|
| 快速开始、配置、基本使用 | `./start.sh` 使用隔离端口启动；backend `/health`、trace stats、frontend manifest 与运行时配置均返回正常，停止后端口和 PID 文件清理完成 | PASS |
| 功能总览、双 Trace 工作区 | 两条真实 startup trace 的 Playwright E2E 完成上传、鉴权、双窗、布局/最大化/最小化、AI 面板隐藏恢复、停止、session 删除和 trace 清理 | PASS |
| 多 Trace 分析结果对比 | analysis-result snapshot、comparison flow/routes 和报告相关聚焦测试通过 | PASS |
| Code-Aware Analysis | source 与 dist 两种 CLI E2E 均使用真实代码库和 heavy/light trace 通过；相关 CLI/HTML report 测试通过 | PASS |
| Android Internals Pack / 私有知识库 | 签名 Pack 校验通过，当前内容版本和 fingerprint 可解析；Pack、external source、RAG route 与 Skill 语义测试通过 | PASS |
| API 参考 | 公开 liveness、鉴权 runtime health、workspace trace API 真实 smoke；analysis result、comparison、batch、trace config、Skill Pack、RAG 路由测试通过 | PASS |
| MCP 工具参考 | MCP server、动态 registry 和 standalone server 聚焦测试通过；文档不再写死工具数量 | PASS |
| CLI 参考 | source、dist、npm packed CLI E2E 通过；公网全新安装 `@gracker/smartperfetto@1.2.1` 后 version/help/doctor/knowledge-pack status 通过 | PASS |
| Batch Trace Skill | 两条真实 startup trace 并发运行 `startup_analysis`，两条均 completed，生成 JSON/HTML report | PASS |
| Android Capture | `capture suggest` 和 `capture config` 真实生成 Camera proposal/textproto；命令与 service 测试通过 | PARTIAL：无连接设备，未执行真实 adb 录制 |
| Skill / Strategy 系统 | Skill、Strategy、case 校验通过；渲染 catalog、生成 detection Skill 和 runtime asset 校验通过 | PASS |
| Trace corpus | 18 个 case 校验、12 个 constructed case 构建、255 条语义期望执行通过 | PASS |
| 架构与 Data Contract | backend strict TypeScript build 通过；聚焦 runtime/API/MCP/contract 测试通过 | PASS |
| 免安装包 | Windows x64 ZIP、macOS arm64 ZIP、Linux x64 tar.gz 均完成真实构建并通过包内校验；macOS app 完成 ad-hoc signing | PASS |
| npm 发布物 | npm registry 当前版本为 `1.2.1`；隔离目录全新安装和 bundled trace processor/Pack 诊断通过 | PASS |
| GitHub Release | `v1.2.1` 为 latest、非 draft，三平台资产与 digest 可读取 | PASS |
| Docker | 两份 compose 配置可解析，Docker/static distribution/lifecycle 测试通过 | PARTIAL：本机 Docker daemon 未运行，未启动容器 |
| 真实模型分析 | 本地 hanging-provider 双 Trace 取消/清理链路通过；无模型凭证 | NOT AVAILABLE：未运行真实 DeepSeek/OpenAI/Claude provider E2E |
| 历史档案 | archive 从维护文档检查中排除；带日期的非 archive 材料明确为证据快照 | PASS |

## 可重复的文档防漂移门禁

新增 `npm run verify:docs` 并接入根目录 `verify:pr`。它从当前仓库动态验证：

- 维护文档中的本地 Markdown 链接；
- `.en.md` 的中文对应文档；
- 操作文档中的 `npm run` 是否存在，以及 `cd` / `--prefix` 对应的 package cwd；
- 禁止错误的 `npm --prefix backend publish`；
- 发布/portable/Windows 文档不写死示例版本；
- 从当前 CLI `--help` 派生顶层命令，并确认中英文 CLI 参考都覆盖全部命令。

当前结果：103 份 Markdown、19 个 live CLI 顶层命令通过。

## 主要验证记录

```bash
npm run verify:pr
npm run verify:docs
npm run verify:rendering-pipelines
npm --prefix backend run validate:skills
npm --prefix backend run validate:strategies
npm --prefix backend run validate:cases
npm --prefix backend run build
npm --prefix backend run cli:e2e
npm --prefix backend run verify:codebase-aware
npm --prefix backend run knowledge-pack:verify
npm run test:e2e:dual-trace
npm run package:portable
```

最终 `verify:pr` 已完整通过：治理测试、文档门禁、质量检查、前端预构建、
Rust 测试、backend build、66 个 core suites / 909 个 core tests、架构测试、
18 个 trace case / 255 条期望以及 6 条真实场景 trace 回归均通过。

此外，当前改动的 Perfetto-Skills 双向影响审查结论为 `not_required`：变更只涉及
文档、SmartPerfetto 自有 E2E 契约和本仓库 trace corpus 扫描边界，没有修改
portable Skill、Strategy、SQL、证据协议、trace processor pin 或 public exporter
行为。change fingerprint 在最终改动集上重新生成并随交付记录。

Perfetto UI 的仓库级 `npm run lint` 也实际执行过，但当前 lint 配置在未修改的
upstream/现有文件上报告 1467 个问题，并且不能解析 `smartperfetto_test/*.ts`；
因此它不是当前可用的干净门禁。本轮修改过的 Playwright config 和场景文件已经由
双 Trace E2E 实际编译并执行。这个基线问题没有被误记为本轮通过，也没有扩大成对
无关 upstream 文件的批量格式化。
