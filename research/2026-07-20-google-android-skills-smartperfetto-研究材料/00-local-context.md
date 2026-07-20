---
phase: 0
topic: Google android/skills 对 SmartPerfetto 与 Perfetto-Skills 的查漏补缺
date: 2026-07-20
smartperfetto_head: 68b7fbfa4e635feacdd2a57510a26abcbae4f9eb
perfetto_skills_head: 718c5dcdd5de2feb920ce8719f69c8108f9f8317
---

# Phase 0 · 本地知识扫描结果

## 扫描范围

- 已扫描 Codex 历史索引与两组相关前序工作：Hermes 官方 Android Skills 初筛、SmartPerfetto Perfetto v57 AI Skill 翻译。
- 已扫描 SmartPerfetto 当前 `AGENTS.md`、`.claude/rules/skills.md`、`.claude/rules/product-surface.md`。
- 已扫描当前上游翻译与治理资料：
  - `backend/skills/docs/upstream-perfetto-ai-skill-translation.sop.md`
  - `docs/superpowers/specs/2026-07-14-upstream-ai-skill-accuracy-design.md`
  - `docs/superpowers/plans/2026-07-14-upstream-skill-gap-governance.md`
- 已扫描兄弟仓库 `/Users/chris/Code/SmartPerfetto/Perfetto-Skills` 的当前维护规则、官方 Skill 决策与 gap report。
- `local_vault_path` 未配置，因此未扫描额外个人知识库。

## 当前仓库真相

### SmartPerfetto

- 工作区：`main...origin/main`，扫描时无本地修改。
- 当前提交：`68b7fbfa4e635feacdd2a57510a26abcbae4f9eb`。
- 当前库存：239 个 `*.skill.yaml`，101 个 Strategy/Template Markdown。
- `backend/skills/` 是产品运行时来源；可执行证据进入 YAML Skill，调查顺序与解释规则进入 Strategy/SOP。
- 公共导出必须由 `backend/skills/public-export.yaml` 显式分类，不能手工复制生成文件。
- 可移植分析能力适合进入 Perfetto-Skills；provider、session、artifact、DataEnvelope、streaming、frontend 和产品批处理状态留在 SmartPerfetto。

### Perfetto-Skills

- 工作区：`main...origin/main`，扫描时无本地修改。
- 当前提交：`718c5dcdd5de2feb920ce8719f69c8108f9f8317`。
- 当前公共投影包含 234 个生成 Skill 参考与 15 个工作流文档。
- 当前官方 gap checker 面向 `google/perfetto/ai/skills/perfetto`，逐文件使用精确 `(path, sha256)` 决策。
- 当前官方 gap report 有 39 个文件：20 `already_covered`、9 `adopted`、10 `not_applicable`，无 added/changed/removed。
- 这套 39 文件结论不能自动覆盖本题的 `github.com/android/skills`。两个上游仓库必须分别锁定、分别审查。

## 命中文件及价值

### `.claude/rules/skills.md`

- 价值：高。
- 提供本题最重要的架构边界：Skill 是确定性证据程序；公共仓库承载 portable workflows、SQL、方法与本地脚本；产品状态和 UI/runtime 语义不外移。

### `backend/skills/docs/upstream-perfetto-ai-skill-translation.sop.md`

- 价值：高。
- 已定义上游 Markdown 到 SmartPerfetto 原生结构的转换规则，并记录 Perfetto v57 memory/GPU/current mapping。可作为逐项判定模板。

### `docs/superpowers/specs/2026-07-14-upstream-ai-skill-accuracy-design.md`

- 价值：高。
- 说明不能把理论工作流或复制脚本当作已实现；需要 data-present fixture、missing-data contract、稳定 evidence id 和跨产品面语义。

### `docs/superpowers/plans/2026-07-14-upstream-skill-gap-governance.md`

- 价值：高。
- 已形成精确 hash 决策、证据路径、test id、reviewed source commit 的审查机制。本题可复用机制，但不能复用结论。

### `Perfetto-Skills/docs/maintenance/upstream-sync.md`

- 价值：高。
- 明确公共仓库的上游是 gap-check-only，不是运行时依赖；同步必须 dry-run、锁定 commit、独立测试，并为每个文件记录 adopted / covered / not applicable / pending。

## 历史命中

- Hermes 调研曾确认 Google 官方 `perfetto-trace-analysis` 强调 metrics-first、thread-state/blocker verification，`perfetto-sql` 强调查询幂等性、分区 `SPAN_JOIN` 与 `dur = -1` 边界。
- SmartPerfetto 已完成 `google/perfetto` v57 AI Skill 的 memory、GPU、state、journald 等翻译；这次需检查 `android/skills` 是否包含更新、更完整或不同的版本。

## 覆盖度评估

| 子维度 | 本地覆盖度 | 本地来源 |
|---|---|---|
| SmartPerfetto Skill 架构与产品边界 | 高 | rules、SOP、product surface |
| `google/perfetto` 官方 Skill 既有覆盖 | 高 | translation SOP、official gap report |
| 独立 `android/skills` 当前完整目录与版本 | 低 | 尚未联网锁定 |
| `android/skills` 各 Skill 对 SmartPerfetto 的价值 | 低 | 仅有两个 Perfetto Skill 的历史初筛 |
| 可同步到 Perfetto-Skills 的公共边界 | 中高 | public export 与 upstream sync 机制已存在，逐项结论待建 |
| Android 应用开发/构建/测试类 Skill 的适用性 | 低 | 需读上游原文后判断与 trace-analysis 产品的距离 |

## 后续子问题

1. `android/skills` 当前有哪些 Skill、文件、脚本、许可证和依赖？哪些是真正的 Perfetto 分析能力，哪些是 Android 开发代理工作流？
2. 每个 Skill 的可执行证据、推理顺序、质量门槛和环境假设是什么？
3. SmartPerfetto 对应能力是完整覆盖、部分覆盖、缺失，还是超出产品职责？
4. 哪些内容应转译为 SmartPerfetto YAML/Strategy/SOP/测试，哪些可进一步导出到 Perfetto-Skills，哪些只能保留为方法参考？
5. 是否应把 `android/skills` 纳入 Perfetto-Skills 独立的锁定与逐文件 gap governance，而不与 `google/perfetto` 的现有锁混用？
