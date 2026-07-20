# SmartPerfetto 多语言全量审查

日期：2026-07-20

[中文](2026-07-20-multilingual-audit.md) | [English](2026-07-20-multilingual-audit.en.md)

## 结论

SmartPerfetto 现在在 Web UI、后端 API、内置 Skill、教学模式、关键路径、
MCP 和 CLI 投影中统一使用显式的 `auto | zh-CN | en` 语言契约。每个内置
Skill 都进入生成的[本地化目录](../../backend/skills/localization.catalog.json)；
Skill ID、步骤 ID、SQL、枚举值、证据引用、时间戳和报告溯源等稳定标识不翻译。

本次审查共发现 16 类问题，均已在本次修改中修复。仓库新增
`npm run verify:i18n`：当内置 Skill 目录过期、英文目录出现汉字、必要功能面
失去本地化投影、README 对结构漂移或已知单语 UI 回归再次出现时，验证会失败。

## 范围

审查按真实用户功能路径展开，而不是只搜索“有没有翻译字符串”：

| 功能面 | 审查行为 |
|---|---|
| 语言偏好 | 浏览器自动识别、显式中英文选择、持久化、请求投影和会话退役 |
| AI Assistant | 欢迎页、预设问题、命令、选区卡片、流式进度、结论、证据、报告、重连、取消、错误和导出 |
| Skill 运行时 | 列表、定义、执行、对比、分层结果、摘要、诊断、空状态、列和聚合指标 |
| Skill 消费端 | Web UI、REST、agent adapter、MCP、维护者 CLI 和用户 CLI |
| 教学模式 | 管线检测、泳道、依赖、完整性、固定轨道、overlay 计划和可复制 Markdown 证据 |
| 关键路径 | 参数错误、确定性摘要、AI prompt、模块、异常、证据、建议和警告 |
| 场景与 Trace 工具 | Story、场景还原、overlay、区域/Slice 选区、书签、双 Trace 工作区、Trace 目录和跳转 |
| 配置 | Provider Manager、运行时/模型详情、后端连接、Code-Aware 源码和私有知识源 |
| 数据呈现 | SQL 表、图表、Markdown 格式化、Mermaid 错误、Trace 位置和 DataEnvelope 呈现 |
| 文档 | 根 README 对、文档中心 README 对、语言优先级、UI 行为和本审查报告 |

## 清单

### 功能清单

以上功能面通过统一的前端语言 helper、后端规范化 `OutputLanguage` 和
“只改呈现层”的 projector 接入。原始分析对象仍用于 AI 推理和溯源，
本地化只作用于面向用户的投影。

### Skill 清单

当前运行时 registry 共生成 234 个内置 Skill：

| 运行时类型 | 数量 |
|---|---:|
| Atomic | 120 |
| Composite | 80 |
| Deep | 2 |
| Comparison | 1 |
| Pipeline definition | 31 |
| **总计** | **234** |

其中 18 个是模块专家，与上表运行时类型重叠。目录还覆盖 1,223 个展示步骤和
3,468 个显式列声明。`npm run verify:i18n` 会逐个遍历 Skill、步骤、列、
tooltip 和聚合标签。本地化目录就是完整的逐 Skill 审查账本：每个稳定 Skill ID
都有非空的 `zh-CN` 与 `en` 展示元数据。

外部 Skill pack 明确标记为 `external_authored`。SmartPerfetto 不替第三方内容
臆造翻译，也不会把外部 Skill 混同为缺失翻译的内置 Skill。

## 发现的问题

| 编号 | 问题 | 影响功能面 | 修复 |
|---|---|---|---|
| I18N-01 | Web UI 隐式跟随 `navigator.language`，没有显式语言偏好。 | 设置和全部 UI 文案 | 新增持久化的 `auto`、`zh-CN`、`en` 选择。 |
| I18N-02 | 切换语言后可能继续使用旧后端会话，导致同一会话混合语言。 | 会话和流式分析 | 切换语言时先退役当前后端 agent 会话。 |
| I18N-03 | 内置 Skill 名称、描述、步骤标题、列和聚合指标没有完整双语来源。 | 234 个内置 Skill | 新增从 registry 生成的严格本地化目录和 freshness 检查。 |
| I18N-04 | Skill 原文与所选语言不一致时会直接泄漏到呈现层。 | 摘要、执行消息、诊断和空状态 | 使用对应语言的中性说明，并在显式溯源字段保留原文。 |
| I18N-05 | 内置 Skill 翻译缺失可能静默 fallback，外部 pack 也未区分。 | Skill 列表/执行/对比 | 内置 Skill 缺失时 fail closed；外部 pack 标记 `external_authored`。 |
| I18N-06 | REST、agent adapter、MCP 和 CLI 的 Skill 投影没有统一解析请求语言。 | API、MCP、CLI | 将规范化输出语言贯穿列表、定义、执行、对比和诊断。 |
| I18N-07 | 流式状态、计划、验证、证据、报告、子代理和错误区存在单语文案。 | SSE 对话投影 | 本地化所有前端自有 SSE 呈现，不翻译证据 ID。 |
| I18N-08 | 教学模式的标题、关系、警告和完整性提示存在单语输出。 | 教学 API 和 Web UI | 新增教学呈现 projector 和双语 UI/Markdown 标签。 |
| I18N-09 | 关键路径参数错误、确定性摘要、prompt、异常和建议没有统一语言契约。 | 关键路径 API 和扩展 | 新增按语言生成的校验/prompt/摘要，以及不修改原对象的呈现 projector。 |
| I18N-10 | Provider、运行时/模型详情、连接字段和设置状态中英文混杂。 | Provider Manager 和设置 | 补齐标签、placeholder、提示、状态和详情行。 |
| I18N-11 | Code-Aware 与私有知识源注册含单语字段和状态。 | 源码与知识面板 | 补齐表单、索引/授权状态、预览计数和错误。 |
| I18N-12 | Slice/区域卡片、书签、Trace 位置、工作区目录、双 Trace 控件和 overlay 泄漏单语。 | Trace 交互功能 | 本地化前端呈现，同时保留 Trace/实体稳定标识。 |
| I18N-13 | Story/场景进度、还原、固定说明和 overlay 标签未完全跟随语言。 | 场景还原 | 本地化状态机和复制说明，不修改稳定场景映射。 |
| I18N-14 | Slash 命令、ANR/Jank、重连、导出、查询审查、SQL 表、图表、Markdown 和 Mermaid 错误存在硬编码。 | 对话工具和数据呈现 | 全部改为共享语言投影。 |
| I18N-15 | README 只说明后端环境变量，未解释 Web 偏好和优先级。 | `README.md`、`README.zh-CN.md` | 补充 UI 选择、持久化、会话退役、规范值和 env fallback。 |
| I18N-16 | 仓库没有检测 Skill 本地化和双语文档漂移的门禁。 | CI 和维护流程 | 新增 `npm run verify:i18n` 并接入 `verify:pr`。 |

## 修复设计

### 语言契约

- UI 保存的偏好是 `auto`、`zh-CN` 或 `en`。
- `auto` 跟随浏览器；显式选择不受浏览器语言影响。
- 请求只向后端发送规范值 `zh-CN` 或 `en`。
- CLI、服务端默认值和未显式携带语言的客户端仍可使用
  `SMARTPERFETTO_OUTPUT_LANGUAGE`。
- Web 偏好属于显式请求上下文，因此优先于后端默认值。
- 切换 Web 偏好时退役当前 agent 会话，防止同一会话混用语言。

### Skill 投影

- 生成器读取实时内置 registry，不硬编码 Skill 列表或数量。
- display name、description、步骤标题、显式列 label/tooltip 和聚合指标标签
  都具有两个语言版本。
- 推断型 schema 标签使用按语言 humanize 的稳定标识。
- 内置 Skill 未进入目录时，运行和验证都会报错。
- 当原始 narrative 与所选语言不一致时，只替换可见投影；
  `sourceContent`、`sourceNarrative` 或 `sourceEmptyMessage` 保留精确原文。

### 功能投影

设置、Provider 管理、Code-Aware、对话、SSE 分区、选区/导航工具、教学、
关键路径、场景还原、SQL/数据呈现、会话和导出反馈全部使用同一偏好。
凡原始对象同时用于 AI 推理或证据溯源的后端功能，都通过不修改原对象的
projector 生成可见文案。

### 文档

根目录两个 README 和文档中心两个 README 都链接本审查。验证会同时检查
中英文根 README 的标题层级结构、文档中心 README 对以及本报告对。

## 不变量

- 不翻译 Skill ID、步骤 ID、SQL 标识、枚举 wire value、证据引用 ID、
  时间戳、Trace ID、报告 ID 或代码符号。
- 不为生成 UI 文案而修改关键路径或 Skill 原始证据。
- 可见 narrative 使用 fallback 时，不能丢失原始 authored source。
- 外部 Skill pack 不伪装为已翻译的内置 Skill。
- 显式切换语言后不能继续复用同一后端分析会话。
- 不手工编辑生成的本地化目录；修改 registry 来源或生成器后重新生成。

## 验证

本次修改由以下门禁覆盖：

- 后端 typecheck，以及 Skill 本地化、教学本地化、关键路径本地化和
  output-language 解析的定向 Jest。
- 前端 typecheck，以及语言选择、数据格式化、SSE 投影、场景/Story、
  Provider、SQL 表、工作区目录、会话和导航的定向 Vitest。
- `npm run verify:i18n`、`npm run verify:docs`、Skill 验证、
  frontend 预编译同步和仓库 `verify:pr`。
- 实现完成后的独立只读代码审查。

Perfetto-Skills 影响审查结论为 `not_required`：本次修改只改变
SmartPerfetto 呈现与请求语言路由，不改变可移植 Skill YAML、SQL、证据语义、
导出策略或公共运行时契约。变更指纹：
`6d7c1d808d94de5eda17354ff29fc44a27d1f7f7103a667ac78937345e7bf08e`。

精确命令结果记录在提交交付信息中，不固化在长期设计文档里。

## 剩余边界

SmartPerfetto 当前支持简体中文和英文，不是任意 locale pack。第三方 Skill
pack 在作者提供翻译前保留其 authored language。模型生成内容仍可能包含技术名词
或 Trace 中的证据原文；如果翻译会破坏溯源，这属于刻意保留。Perfetto UI 中与
本插件无关的历史 lint 债务不是多语言缺陷，会与本次通过的 typecheck 和定向测试
门禁分开记录。
