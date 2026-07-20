# Google Android Skills 能给 SmartPerfetto 补什么

Google 官方的 [Android Skills 仓库](https://github.com/android/skills/tree/47e1dff74a5cde5d0128c5d15e74e000323135ea) 值得读，但不适合整包搬进 SmartPerfetto。它最有用的部分，是 Google 根据 LLM 容易出错的任务整理出的工作顺序；具体到 Perfetto SQL、表名和因果判断时，仍要回到当前 Perfetto 源码和真实 Trace 验证。本文给出三类结果：SmartPerfetto 已经覆盖的内容、仍需补齐的能力、适合公开到 Perfetto-Skills 的部分。

## 审查范围

本次锁定 `android/skills` 的 `main@47e1dff74a5cde5d0128c5d15e74e000323135ea`，完整阅读 20 个 `SKILL.md`、直接相关的参考资料和 5 个 Python 脚本。当前最新发布版为 `v1.0.5@aaf42b970f9e6ee49e38aabd5cd0d00612e04a5a`；发布版与 `main` 的差异只有新增的 `play-policy-insights`，两个 Perfetto Skill、Android CLI 和测试 Skill 没有变化。

Google 在 [README](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/README.md) 中说明，选题来自 LLM 表现较差的工作流。这个定位决定了它更像一组「失败高发任务说明」，并不追求覆盖全部 Android 开发。仓库采用 [Apache-2.0](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/LICENSE.txt)，允许改编和分发，但复制或改写内容时仍需保留许可、归属和修改说明。

本地对照基线是 SmartPerfetto `68b7fbfa4e635feacdd2a57510a26abcbae4f9eb`、Perfetto-Skills `718c5dcdd5de2feb920ce8719f69c8108f9f8317`，以及 SmartPerfetto 当前的 Perfetto v57.2 源码。当前 SmartPerfetto 有 239 个 YAML Skill 和 101 个 Strategy/模板；公开仓库有 234 份生成后的 Skill 参考和 15 个工作流文档。判断「已覆盖」时，检查了可执行路径、查询、测试和缺失数据语义，没有按文件名相似度推断。

## 20 个官方 Skill 怎么分

两个 Skill 直接涉及 Trace 分析：

- [`perfetto-sql`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-sql/SKILL.md)：适合转成 SQL 校验规则、查询编写说明和测试。
- [`perfetto-trace-analysis`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/SKILL.md)：适合转成调查顺序、证据完整性要求和结束条件。

六个 Skill 的领域内容不属于 Perfetto，但做事方式有参考价值：

- [`android-cli`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/devtools/android-cli/SKILL.md) 把 App 操作写成逐步 journey，每步单独执行、验证并记录失败。它适合 SmartPerfetto 的采集与复现功能。
- [`r8-analyzer`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/performance/r8-analyzer/SKILL.md) 优先走定量路径，版本不支持时明确降为启发式判断。这个置信度分级适合 Trace 能力探测。
- [`play-policy-insights`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/play/play-policy-insights/SKILL.md) 先产生确定性基础数据，再让多个分析任务读取隔离的产物；聚合前验证格式，只重试缺失或无效的任务，末尾还有一次批判性检查。它适合 SmartPerfetto 的评测和多运行时审查。
- [`testing-setup`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/testing/testing-setup/SKILL.md) 先盘点现有测试，区分单元、界面、截图和端到端测试，并覆盖多尺寸、主题和字体。它可用于设计 Trace 样本的能力状态分组。
- `camerax` 强调生命周期、异步回调、硬件差异和可替换边界，适合 Camera Trace 采集与证据规划。
- `android-intent-security` 使用决策表、反例和结构化审查结果，适合校验器规则设计。

`agp-9-upgrade`、`play-billing-library-version-upgrade`、`migrate-xml-views-to-jetpack-compose`、`adaptive`、`wear-compose-m3` 只能借用迁移纪律：变更前保留基线、按依赖顺序处理、使用与当前版本匹配的一手示例、把行为测试和视觉测试分开。`appfunctions`、`verified-email`、`styles`、`navigation-3`、`engage-sdk-integration`、`edge-to-edge`、`display-glasses-with-jetpack-compose-glimmer` 与 Trace 分析没有可执行交集，不进入 SmartPerfetto 或公开 Perfetto-Skills。

## 两个 Perfetto Skill 中，哪些已经有了

[`perfetto-sql`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-sql/SKILL.md) 提出的高价值规则包括：先查 stdlib、使用 `upid`/`utid`、处理 `dur = -1`、按区间重叠筛选、让对象创建可重复执行、用 `EXTRACT_ARG` 读取参数、限制 SQL 修正次数。

SmartPerfetto 已有 `backend/src/services/sqlGuardrailAnalyzer.ts`，并在 `backend/src/services/__tests__/sqlGuardrailAnalyzer.test.ts` 中测试六类规则：`LIKE` 提示、开放区间时长、区间筛选、`SPAN_JOIN`、可重复创建和参数提取。它在 2026 年 5 月 16 日加入，距离 Google 文件标注的 5 月 14 日只有两天。这里的大部分结论应归为 `already_covered`。

SmartPerfetto 的实现比 Google 文档更克制。`LIKE` 只产生可选提示，不会默认判失败；`SPAN_JOIN` 的提示写的是按稳定 ID 分区，避免不同实体互相连接，没有声称分区能消除所有重叠。

[`perfetto-trace-analysis`](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/SKILL.md) 要求从概览到局部查询，把长 slice 拆成 Running、Runnable、Sleeping 和 D-state，再沿 Binder、锁或 I/O 等等待关系继续查。SmartPerfetto 已有计划与假设工具、`global_trace_sanity_check`、进程身份解析、阻塞关系、Binder/锁/I/O Skill，以及报告、快照和证据分离。公开 Perfetto-Skills 还有处理器哈希、RPC API、能力探测、输出上限、证据 sidecar、报告 schema 和真实 Trace fixture。

Google 要求在 Trace 旁创建 `_analysis.md` 事实记录。这个形式不应采用：文件缺少 Trace 哈希、处理器身份和结构化 schema，重复分析后容易过期，还会在用户数据目录新增不受控产物。SmartPerfetto 已有更合适的结构化证据与报告边界。

## 71 条性能 hint 不能照单全收

六个 hint 文件共 71 条建议，覆盖 CPU、图形、I/O、IPC、内存和功耗。多数调查意图已经有对应 Skill，例如调度延迟、CPU 频率、FrameTimeline、Binder storm、page fault、LMK、DMA-BUF、wakelock、网络和 power rail。

具体写法里有一批过期或不准确的名字：

| Google hint | 当前 Perfetto v57.2 |
|---|---|
| `binder_transaction` | `android_binder_txns` |
| Binder 的 `service_name` | `interface`/`aidl_name` 与 `method_name` |
| `cpu_slice` | `sched_slice` |
| `actual_frame_timeline_frame` | `actual_frame_timeline_slice` |
| `android_bitmaps` | `heap_graph_bitmaps` 或 `android_bitmap_*` |
| `suspend_state` | `android_suspend_state` |
| `kernel_wakelock` | `android_kernel_wakelocks` |
| `network_packets` | `android_network_packets` |
| `power_rails` 上的 `power_ma * duration` | `android_power_rails_counters.energy_delta`，或按明确单位积分 |
| `android_graphics_allocs` | Google 自带 stdlib 快照和当前 v57.2 都没有 |

`SPAN_JOIN` 是最典型的语义偏差。Google 写的是输入重叠会 crash，并建议总是加 `PARTITIONED`。当前 [Perfetto 文档](https://github.com/google/perfetto/blob/d1248365387062c9b86b85e31354ae913ea6981d/docs/analysis/perfetto-sql-getting-started.md#span-join) 说明，同一输入、同一分区中的区间不能重叠；Trace Processor 不会检测并报错，反而可能静默产生错误结果。`PARTITIONED` 只能隔离进程、线程或 CPU，不能合并同一分区内的重叠区间。

另一些 hint 把相关性写成了因果：频率数据缺失就判断 governor 内核错误，长 `do_page_fault` 就判断 I/O 竞争，紧邻 kworker 唤醒就判断内核依赖，长 buffer swap 就判断 damage area 大，GPU 内存峰值与慢帧重合就判断内存压力导致 jank，相同 Bitmap 属性就判断内容重复，第二次启动变快就判断 page cache。它们可以生成待验证假设，不能直接生成根因。

### 从理论 hint 到可执行 Skill，要过四道检查

Google 的 hint 多数只有一两句话，适合提醒分析者换一个观察角度。SmartPerfetto 的 YAML Skill 还要回答四组更具体的问题。

**数据源检查。** 需要哪类 ftrace event、atrace category、TrackEvent、heap graph 或平台 data source？设备是否支持，Trace 配置是否开启，记录是否完整？例如 `sched/sched_blocked_reason` 缺失时，`thread_state` 仍能说明 D-state 时长，却不能给出 `blocked_function`。此时结果只能写「不可中断等待」，不能升级成存储 I/O。

**schema 与单位检查。** 查询使用哪个 stdlib module、表、列和 ID？每个时长、能量、频率和内存值是什么单位？Power Rail 的累计值是微瓦秒，`average_power` 是毫瓦，转换为 mWh 时要说明积分区间。把 `power_ma * duration` 原样搬进查询，会同时混淆电流、功率和能量。

**因果检查。** 一条时间重叠只能证明两个事件同时出现。要写根因，还需满足目标进程或线程一致、时间范围一致、可解释的机制存在、替代解释经过查询。慢帧与 GPU 内存峰值重合后，还要检查 GPU busy、频率、fence 等待、reclaim/PSI 和帧生产阶段；其中任意一项缺失，都应保留其他解释。

**回归检查。** 每个新 Skill 至少要有正例、反例和缺失数据样本。正例证明查询能找到预期机制，反例防止只按名字或时间重合误报，缺失数据样本验证 `unsupported`、`not_recorded`、`recorded_empty`、`recorded_populated`、`unknown` 的区分。只验证 SQL 能执行，不能证明语义正确。

这四道检查解释了为什么 Google 的文字可以作为候选来源，却不能直接作为运行契约。

## Google 的调查顺序也有适用边界

Google 要求「metrics first」，对启动等已有稳定指标的场景很有效。SmartPerfetto 面向的范围还包括 Camera、渲染架构识别、厂商 GPU、Linux 调度和自定义 TrackEvent，其中一些没有对应的内置 metric。统一要求先跑 metric 会增加无效查询。现有 `global_trace_sanity_check` 加场景路由更合适：先确认 Trace 边界、身份、数据能力和全局异常，再选择内置 metric、stdlib 表或 YAML Skill。

Google 建议时间点附近从 100 ms 窗口开始。这是便于探索的默认值，不能变成所有场景的固定阈值。一个 16.6 ms 帧、5 秒 ANR、数十秒启动和数分钟功耗 Trace 的观察尺度不同。SmartPerfetto 应从目标事件、帧预算、超时类型或用户范围推导窗口，并在结果中保留原始起止时间。

「发现一个问题后继续搜索全部领域」能减少过早结束，也会带来查询成本和偶然相关。Trace 越长，最长 slice、最高 D-state 和峰值内存越容易找到与用户问题无关的异常。如果没有目标身份、时间重叠、机制和替代解释检查，额外搜索只会增加误报。因此结束复核应有固定预算，并把「独立异常」与「当前问题根因」分开报告。

每个假设都标注来源也有副作用。写「来自 `hints_io.md`」只能说明为什么想到这条查询，不能提高证据等级。来源文件可能过期，Google 的 71 条 hint 已经出现表名和语义漂移。SmartPerfetto 的报告应引用执行结果、Trace 身份和查询来源；hint 只保留为调查动机。

Google 把 SQL 修正限制为最多三轮，有助于阻止 Agent 在错误 schema 上反复尝试。复杂查询在三轮后仍失败时，正确结果应是保存错误、缩小问题、切换到现有 Skill 或报告能力缺口，不能删掉难处理的区间关系来换取成功执行。这里应限制资源消耗，不应降低分析目标。

## SmartPerfetto 还缺哪些能力

有七项值得进入后续计划，其中前三项优先级更高。

1. **把 `android/skills` 作为独立上游。** 当前 Perfetto-Skills 只跟踪 `google/perfetto/ai/skills/perfetto`，没有跟踪 `github.com/android/skills`。应为两个 `profilers/` 子树增加独立 lock、逐文件 SHA-256 决策和差异报告。稳定 tag 用于升级，`main` 只做 canary。
2. **补 `SPAN_JOIN` 同分区不重叠的证明。** 现有静态规则只能看见 `PARTITIONED` 和可重复创建。每个使用点还需说明输入为何不重叠；有风险时使用当前 stdlib 的区间归一能力，或用真实 fixture 验证结果。
3. **增加有预算上限的结束复核。** 开放式分析完成主要因果关系后，再复用全局检查，查看独立的 CPU、Runnable、D-state 和长 slice 异常。结果可以是第二个问题，也可以是「未见达到阈值的独立信号」。查询数和时间必须有上限，避免 Google 那种遍历所有 hint 的无限任务。
4. **`irq_runnable_delay_correlation`。** 检查目标线程从唤醒到运行的延迟是否与同 CPU 的 IRQ/softirq 占用重叠。
5. **`realtime_kernel_thread_policy_audit`。** 只有 Trace 数据源能提供调度策略和优先级时才报告；缺失时进入能力状态，不能猜测。
6. **`thread_catchup_storm_detection`。** 明确定义静默间隔、burst 窗口、密度基线、目标线程和排除条件，再用正反 fixture 验证。
7. **采集 journey。** 给 `smp capture` 增加可选的逐步复现说明、动作时间点、预期状态和每步结果。Google Android CLI 可以作为一种适配器，但不能成为运行依赖。

前三个候选原子 Skill 都需要 schema、能力状态、阈值、输出字段、无数据行为和真实 Trace 断言。只有文字说明不算完成。

### 每个候选怎么验收

| 候选 | 最小可执行结果 | 容易失败的地方 | 验收要求 |
|---|---|---|---|
| 第二上游跟踪 | 给定 commit 后产生 added/changed/removed 与逐文件分类 | 把 `google/perfetto` 和 `android/skills` 当成同一来源 | 两套 lock、快照哈希和决策文件互不复用；未知文件使检查失败 |
| `SPAN_JOIN` 输入检查 | 每个使用点能说明分区键和区间不重叠来源 | 只见到 `PARTITIONED` 就认定安全 | 构造同分区重叠反例，确认校验或测试能发现静默错误 |
| 结束复核 | 主因果关系完成后输出第二问题或明确无高强度独立信号 | 每次分析都执行全部领域查询，成本失控 | 只用于开放式请求；固定查询预算；复用已有结果；报告未查领域 |
| IRQ 相关性 | 返回目标 Runnable 区间、CPU、重叠 IRQ/softirq 与重叠时长 | 把 IRQ 出现当成唤醒原因 | 同 CPU、同时间窗、重叠量化；无 IRQ 数据时进入缺失状态 |
| 实时策略审查 | 返回目标内核线程、调度策略、优先级和运行区间 | 当前表没有直接字段时从线程名猜测 | 能力探测必须证明字段或事件存在；没有证据就不输出策略判断 |
| catch-up storm | 返回静默间隔、burst 窗口、执行密度、历史基线 | GC、批处理或正常周期任务被误报 | 至少一个真实或构造正例、两个相似反例，并公开阈值来源 |
| 采集 journey | 输出逐步动作、时间点、预期状态、执行命令和状态 | 复现步骤与 Trace 时间轴无法对应 | 每步有独立状态；失败后其余步骤标记跳过；可插入 Trace marker |

这张表也划出一个界限：能够写出查询名称，不等于具备可维护的 Skill。数据条件、误报方式和验收样本必须同时明确。

## 为什么有些方法只留在 SmartPerfetto

Perfetto-Skills 的目标是让本地 Agent 在没有 SmartPerfetto 服务端时，也能用锁定的 `trace_processor_shell` 分析 Trace。因此，公开内容只能依赖本地文件、Python、终端和可下载的校验资产。Provider 选择、会话状态、SSE、前端聊天投影、DataEnvelope、内部报告存储和多运行时路由都属于 SmartPerfetto 产品。

Android CLI journey 也处在这个边界上。逐步复现、界面树优先、截图作为补充、每步独立判定，这些规则可以影响 SmartPerfetto 的采集设计。公开 Skill 若强制安装 Google Android CLI，会增加平台、认证、版本和设备控制依赖，也会让一个 Trace 分析包承担 App 自动化职责。合适的做法是定义通用 journey 产物；SmartPerfetto 可接 Google CLI、ADB 或手工记录，Perfetto-Skills 只消费已经写入 Trace 的 marker 和外部提供的时间点。

`play-policy-insights` 的两阶段产物规则同样属于产品与评测基础设施。公开仓库可以借用「先验证产物，再汇总判断」这一条，但无需复制多 Agent 调度器。公开运行时已经保存查询来源、参数、Trace 哈希、处理器身份和输出限制，把这些 sidecar 交给报告校验器即可。

公开边界越小，安装和复现越稳定；SmartPerfetto 则保留更完整的采集、交互和运行时能力。

## 哪些应该同步到公开 Perfetto-Skills

公开仓库适合加入四类内容：

- 新增 `android/skills` 的独立上游 lock、同步器、逐文件决策和报告，只跟踪两个 `profilers/` 子树。
- 新增经过 v57.2 纠正的 SQL guardrail 文档，并以 Python 实现公开校验器；保留「提示」与「失败」两个级别和逐查询豁免。
- 在 `trace-overview.md` 或共享参考中增加有预算上限的结束复核，复用已经公开的 `global_trace_sanity_check`。
- IRQ、实时策略和 catch-up storm 等新 Skill，先在 SmartPerfetto 以 YAML 和 fixture 证明，再经 `backend/skills/public-export.yaml` 输出。

不应同步 Android CLI 运行依赖、Play/Compose/CameraX 等产品说明、Trace 旁的 scratchpad、未标版本的 stdlib Markdown、SmartPerfetto 的 Provider/会话/前端/DataEnvelope 语义，以及 TypeScript guardrail 实现本身。公开项目需要原生 Python 实现，保持可独立安装和验证。

## 推荐执行顺序

工作可以拆成两轮。

第一轮处理低风险且能防止以后重复审查的部分：增加第二上游 lock 与只读差异报告；分类两个 profiler 子树；修订 SQL guardrail 文档；补公开校验器测试；加入有上限的结束复核测试。

第二轮处理需要 Trace 证据的能力：为 IRQ 相关性、实时策略和 catch-up storm 各写一份行为说明，准备正例、反例和缺失数据 fixture，在 SmartPerfetto 验证后再公开。采集 journey 与多运行时产物校验留在 SmartPerfetto 产品侧。

两轮都需要遵守现有双仓规则。SmartPerfetto 中的 Skill、Strategy、便携 SQL 或证据契约有变化时，先运行 `npm run check:perfetto-skills-impact` 并记录 `required`、`not_required` 或 `deferred`。需要公开的变更从 SmartPerfetto 源文件和 `public-export.yaml` 生成，不直接编辑 Perfetto-Skills 的生成文件。公开仓库随后运行它自己的同步、查询验证、fixture 和完整发布前检查。

完成标准也应分开记录。第二上游 lock 和文档修改可以由静态测试证明；SQL guardrail 需要规则单元测试和现有查询全量扫描；新原子 Skill 必须有语义 fixture；采集 journey 需要设备或模拟器上的逐步场景。某项验证入口在当前项目没有配置时，记录 `NOT CONFIGURED`，不能用别的仓库命令代替。

本次只完成了阅读、当前仓库对照和方案分类，没有修改产品代码或公开仓库。独立只读审查连续两次超时，按项目规则改为结构化自审，并额外核对了引用文件、脚本、许可、当前 Perfetto 源码、公开边界和测试要求。

配套研究材料保留了逐项来源、文件哈希、现有实现位置和每个分类的判断依据，便于后续实现时重新核验。

## 参考资料

- [Android Skills 仓库与 README](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/README.md)
- [Google Perfetto SQL Skill](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-sql/SKILL.md)
- [Google Perfetto Trace Analysis Skill](https://github.com/android/skills/blob/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/SKILL.md)
- [Google CPU/Graphics/I/O/IPC/Memory/Power hints](https://github.com/android/skills/tree/47e1dff74a5cde5d0128c5d15e74e000323135ea/profilers/perfetto-trace-analysis/references)
- [Perfetto v57.2 SPAN_JOIN 文档](https://github.com/google/perfetto/blob/d1248365387062c9b86b85e31354ae913ea6981d/docs/analysis/perfetto-sql-getting-started.md#span-join)
- [Perfetto v57.2 Binder stdlib](https://github.com/google/perfetto/blob/d1248365387062c9b86b85e31354ae913ea6981d/src/trace_processor/perfetto_sql/stdlib/android/binder.sql)
- [Perfetto v57.2 Power Rails stdlib](https://github.com/google/perfetto/blob/d1248365387062c9b86b85e31354ae913ea6981d/src/trace_processor/perfetto_sql/stdlib/android/power_rails.sql)
