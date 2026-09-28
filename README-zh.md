# Keel

**Keel 是给 AI 用的权威笔记本：一份受守护的 DATUM，记录项目的需求与概念模型，防止跨会话的主题遗忘与静默漂移——同时把思考和工作方式的最大自由留给 AI。**

> 好记性不如烂笔头。Keel 把这支笔交给 agent，并保证落在纸上的东西不会悄悄变样。

Keel 是面向 AI 辅助编程宿主（Claude Code、ZCode 及其它 MCP 兼容 agent）的插件：一个零依赖的 Node.js MCP server、一个主技能、四个迭代子技能、一个会话 hook。

**English docs: [README.md](README.md)。**

> **v2.0.0 是破坏性重设计。** Keel 不再主导设计流程（CONCEPT→TECH→HANDOFF 流水线、门禁、交付打包全部移除）。它现在是一个笔记本：AI 自由思考、自由做计划，做完计划、动手实施之前看一眼 DATUM。旧项目迁移见文末。

---

## 为什么需要 Keel

AI 辅助开发的问题不在思考，在记忆。agent 规划得很漂亮，但十个会话之后，目标被悄悄遗忘、概念被悄悄漂移、定好的决策被无声改写——而对话是一种糟糕的存储介质。

Keel 的回答刻意做得很小：一份权威文档（**DATUM**）装着需求和概念模型；一个机械 server 独占所有写入；一个习惯——**做完计划、实施之前，看一眼笔记本**。

只守护两件事，且仅这两件：

1. **主题不降级。** 需求在你说出的那一刻被钉住；概念模型（加权原则、实体、不变量）用你自己的话记录；这个高度以下的东西一概不管。
2. **承诺不悄悄变。** DATUM 完整后，核心修正在你的明确同意下才能落盘（你的原话作为审计证据）——除非你关掉这个开关，让 AI 自主管理。

其余一切——AI 怎么推理、怎么规划、怎么组织工作——刻意留白。Keel 只记录结果，从不规定过程。

## 核心概念

### 按保护级组织的文件集

```
L1  事前写门禁                        DATUM.md —— 受守护的核心（consent 开启时）
L2  事后防篡改证据                    保护引用（你的其它文档，哈希校验）
L0  不设防                            其余一切，包括 AI 自己的工作笔记
```

```
.keel/
├─ DATUM.md       笔记本本体：00 Intent（目标/范围/编号需求）
│                 · G Glossary（承重术语）· 01 Concept（加权原则 P1–P5 + 概念模型 + 停车场）
│                 · R Protected References（保护引用）
├─ AMENDMENTS.md  只追加的历史：改了什么、何时、经谁的同意；压缩后归档（永不删除）
└─ archive/ · state.json
```

高度契约与 v1 相同：DATUM 的收录判据是*非降级性*——只记录设计层事实；什么都想守护的文档会腐烂并失去权威。

### 模式：draft → authoritative，加两个开关

```
draft ──（机械就绪检查通过）──▶ authoritative
        目标 + 范围外 + ≥1 条需求 + 原则 3–5 条 + ≥1 个术语

authoritative:  consent  开（默认）—— 核心写入暂存，等用户同意
                         关 —— AI 自主写入（照常全部记审计行）
                steward  开（默认）—— 计划后结构化检查
                         关 —— 只剩“看一眼”的基础习惯
```

- **draft** 期间 AI 自由写入：server 记录每一次变更（`ai-managed`），但从不发问。
- 就绪检查通过的那一刻，文档转为 authoritative，**两个开关默认全开**，server 会提示 agent 向你宣告激活。
- `keel_config {consent, steward}` 随时翻转任一开关，双向皆可，**无需重新验证**——你说了算。纯笔记本项目（`keel_init {notebook:true}`）从建立起两开关全关，直到你改变主意。

### “看一眼”习惯（v2 的心脏）

agent 做完计划、动手实施之前，把计划对照 DATUM 检查一遍——目标、范围、需求、原则、概念模型。结果：无冲突 → 继续；有冲突 → 修正 / 放弃 / 显式豁免；**对 DATUM 本身有异议 → 提出修正案**（笔记本是权威的，不是神圣的）。steward 开启时，“看一眼”升级为结构化检查（`keel_ripple`、stale refs、扩围提案）；关闭时就是普通一瞥。

时机是刻意选的：检查发生在*计划完成之后*，所以它从不约束 agent 怎么想——只约束它承诺什么。

### 同意分层（consent 开启时）

- **核心**（00/01 内容、承重术语、保护引用）：展示理由 + 波及 → 你的明确同意 → server 落盘，你的同意原话存为审计证据。
- **外围**（停车场笔记等非核心内容）：立即落盘，批量告知。
- 哪个算核心由 **server 机械计算**（traceability closure），不是 AI 的判断。暂存提案在 confirm 时若发现底层内容已变会被拒绝（防覆盖）；跨段的一次逻辑变更 = 一次批量提案：一次同意、一行审计。

### 保护引用

你的其它文档（API 规格、架构笔记、生成的心智模型）可以纳入防降级范围：Keel 记录整文件 SHA-256，按需重验。保护是防篡改*证据*，不是写门禁——拥有方自由编辑，分叉被*检测并报告*，从不拦截。核心修正落盘时，Keel 报告哪些保护文档疑似过期；再生归拥有方工作流。

### 迭代子技能

四个独立思维工具，从主模块拆出，可单独调用、不占用笔记本协议：

| 技能 | 做什么 |
|---|---|
| `keel-stress-test` | 用硬场景攻击已声明的假设（先声明预测） |
| `keel-alternatives` | 为一个分叉给出 2–3 个机制上真正不同的方向 |
| `keel-relax-probe` | 松掉哪条约束能解锁更好的设计——代价是什么 |
| `keel-skeleton` | 仅凭 00 + P* 重建概念模型；覆盖率低说明原则是装饰 |

四个技能有无 DATUM 都能用（skeleton 需要有），临时文件只放系统临时目录、用完即删，被采纳的结论经主模块写入路径回到 DATUM。

## 常驻是怎么实现的

“常驻”具体是三件事：

1. **SessionStart hook**（机械）。工作目录存在 `.keel/DATUM.md` 时，hook 以严格 JSON `additionalContext` 注入笔记本的*原文切片*——文档指针打头，随后是模式行（阶段+开关）、目标/范围/需求、原则、前几条术语/保护引用、最近修正。不是 AI 摘要，是代码切的。**PostToolUse hook** 在每次同意落盘后刷新注入。
2. **技能触发**（行为）。主技能的描述在“用户提到 Keel”**或** `.keel/DATUM.md` 存在”时加载协议——没人提 keel 的会话里，“看一眼”的习惯照样生效。
3. **MCP server**（机械兜底）。DATUM 写入只走 server；consent 开启时核心变更暂存到用户同意为止。经支持路径的静默漂移不可能不留痕。

无 hook 宿主（Codex）上，技能自行在会话开始与确认后调 `keel_digest`。

## 一个例子

你：“用 keel 记一下：一个本地笔记应用，核心是双向链接，改名字后链接不能断。”

agent 初始化笔记本，提取编号需求（与你逐条确认），在 draft 期自由记录，连同原则和概念模型（日常用语）。最后一个术语注册补齐就绪检查，server 把 DATUM 转为 authoritative，agent 告诉你：“同意机制和 STEWARD 已开启——想关哪个说一声。”

之后某个不相干的会话里，agent 规划新功能：*把多次选择合并成一个问题*。实施前看一眼：这会触及 P2（*对话是上下文的唯一权威来源*）。它停下来给出三选项：修正 DATUM（附波及）/ 放弃 / 显式豁免。需求不会无声侵蚀——这就是全部意义。

再后来你完全信任这个项目上的 agent：“把同意机制关掉。”写入转为 ai-managed——每一笔照常记日志，没有任何东西被隐藏，“看一眼”的习惯继续。

## 安装

**前置**：Node.js ≥ 18（MCP server 零 npm 依赖）。

### 插件市场（推荐——Claude Code、ZCode 及兼容宿主）

本仓库自身就是插件市场，安装方式与 Superpowers 等市场插件完全一致：

```bash
claude plugin marketplace add maxi3777/Keel
claude plugin install keel@keel-marketplace
```

交互会话里同样的两步是斜杠命令：`/plugin marketplace add maxi3777/Keel`，然后 `/plugin install keel@keel-marketplace`。安装即注册 MCP server（`.mcp.json` → `node ${CLAUDE_PLUGIN_ROOT}/mcp/server.js`）、五个技能（主技能 + 四个迭代工具）、SessionStart hook。日后更新：更新市场后重装，或添加时钉住版本（`maxi3777/Keel@v2.0.0`）。

克隆验证（可选）：

```bash
git clone https://github.com/maxi3777/Keel.git
node Keel/tests/hostcompat.js   # 发布门禁：打包 vs 宿主契约
node Keel/tests/smoke.js        # 期望：SMOKE PASS
```

### Codex CLI

```bash
node adapters/codex/install.js     # --uninstall 卸载
```

复制全部五个技能到 `~/.codex/skills/`，并向 `~/.codex/config.toml` 追加 `[mcp_servers.keel]`。Codex 无会话 hook，按文档化回退执行（agent 自行调 `keel_digest`）。已在 codex-cli 0.153.4 上端到端验证。

### 其它 MCP 兼容宿主（手动接线）

1. **MCP server** —— 加入项目的 `.mcp.json`：

   ```json
   {
     "mcpServers": {
       "keel": { "command": "node", "args": ["/绝对路径/Keel/mcp/server.js"] }
     }
   }
   ```

2. **技能** —— 把 `skills/` 下各目录复制或链接到宿主技能目录。
3. **会话 hook**（可选）—— 把 `node /绝对路径/Keel/hooks/session-start.js` 注册为会话启动命令；没有它，技能会自行调 `keel_digest`。

**验证**：在一个空目录里对 agent 说“用 keel 建个测试项目”——应看到 `.keel/DATUM.md` 被创建、draft 期自由写入、笔记本补齐时的激活宣告。

## 按场景使用

没有斜杠子命令。一个技能 + 自然语言：

- **开始** —— “用 keel 开始记录这个项目” → 初始化、需求提取、draft 期自由书写、激活宣告。
- **日常干活** —— 什么都不用说，“看一眼”自动发生；计划与 DATUM 冲突时 agent 会停下来给三选项。
- **改笔记本** —— 直接描述变更；consent 开启时会先看到理由 + 波及，然后请你确认。
- **调整信任** —— “把同意机制关掉” / “打开 steward” → `keel_config`（双向皆可，无需重新验证）。
- **保护文档** —— “把这个架构文档保护起来” → `keel_ref_add`（按需 verify）。
- **查看状态** —— “keel 状态怎么样” → `keel_status`（阶段、开关、就绪、待定提案、批量告知、健康度）。
- **维护** —— 审计日志过长时 `keel_status` 会提示；agent 执行压缩（原始日志逐字归档，永不删除）。健康度报告双时钟核心修正计数（上次压缩以来——始终标注；终身——永不清零）与**振荡**计数——全部是*参考指标*，永不作阈值。

## 强制是怎么落地的

| 层 | 机制 | 保证 |
|---|---|---|
| 技能 | 行为协议（看一眼、冲突即停、宣告激活） | 引导 agent（尽力而为；提示词会衰减） |
| hook | SessionStart 注入 | 每个会话以笔记本原文切片开场 |
| MCP server | 唯一合法写路径 | consent 开启时核心写入暂存至同意；closure 升级；防覆盖；带同意证据的只追加日志 |

分工是公理：**AI 产出语义；代码执行一切确定性动作。** 笔记本模式（consent 关）下同样成立——AI 决定*写什么*，server 决定*落在哪、记下什么*。

## 研究背景与参考文献

Keel 浓缩了两轮“综述 + 实验”研究（46 + 48 篇工作；384 轮受控迭代实验）。下表机制取自这些研究与论文；凡与论文原流程不同处，均为刻意取舍。

| 文献 | 出处 / 链接 | Keel 取用 | 刻意差异 |
|---|---|---|---|
| Huang et al., *When Can LLMs Actually Correct Their Own Mistakes?* | TACL 2024 · [arXiv:2406.01297](https://arxiv.org/abs/2406.01297) | 自我修正需要外部信号 | Keel 把“信号”落实为“看一眼”时的 DATUM↔计划对照，与骨架测试重建 |
| Shinn et al., *Reflexion* | NeurIPS 2023 · [arXiv:2303.11366](https://arxiv.org/abs/2303.11366) | 跨试验的语言自反记忆 | Keel 以带同意与波及的修正案日志持久化，而非自由文本记忆 |
| Madaan et al., *Self-Refine* | NeurIPS 2023 · [arXiv:2303.17651](https://arxiv.org/abs/2303.17651) | 迭代自反馈结构 | 仅在有外部记录时使用（迭代子技能的预测 vs 偏差）；无信号的自我精炼不被信任 |
| Agrawal et al., *GEPA* | ICLR 2026 · [arXiv:2507.19457](https://arxiv.org/abs/2507.19457) | 反思-修订的候选演化 | v2 只保留按需子技能形态，绝无自主外循环 |
| Zhang et al., *ACE* | ICLR 2026 · [arXiv:2510.04618](https://arxiv.org/abs/2510.04618) | 增量演化上下文 + 压缩 | Keel 压缩审计日志但永不删原始（archive/），并加人告知 |
| Nguyen et al., *RSEA* | 2026 · [arXiv:2606.28374](https://arxiv.org/abs/2606.28374) | 留出集上单调保优 | Keel 把数值目标换成用户在同意时的裁决；无自动保优门 |
| Ye et al., *ReEvo* | NeurIPS 2024 · [arXiv:2402.01130](https://arxiv.org/abs/2402.01130) | 失败产生的“语言梯度” | Keel 的 supersedes 链记录同样知识；其上的振荡统计是新的 |
| Liu et al., *EoH* | ICML 2024 · [arXiv:2401.12137](https://arxiv.org/abs/2401.12137) | 思想/产物共演化种群 | Keel 只保留被拒路线档案；无自动演化 |
| Romera-Paredes et al., *FunSearch* | Nature 625 (2024) · [paper](https://www.nature.com/articles/s41586-023-06924-6) | 保优程序库 | 同样的保优档案语义，用于设计决策而非程序 |
| Google DeepMind, *AlphaEvolve* | 2025 · [arXiv:2506.13131](https://arxiv.org/abs/2506.13131) | 带世系的演化库 | 世系 → 审计日志；演化循环本身不在范围内 |
| Hu et al., *Darwin Gödel Machine* | ICLR 2026 · [arXiv:2505.22954](https://arxiv.org/abs/2505.22954) | 档案式开放式自我改进 | 仅取档案概念；Keel 无自指自我修改 |
| Zhao et al., *ExpeL* | AAAI 2024 · [arXiv:2308.10144](https://arxiv.org/abs/2308.10144) | 经验蒸馏 | 已考虑；暂缓（修正日志是最小经验层） |
| Wang et al., *Agent Workflow Memory* | 2024 · [arXiv:2409.07429](https://arxiv.org/abs/2409.07429) | 工作流归纳记忆 | v2 设计性拒绝：Keel 不再主导任何工作流 |
| Rodriguez-Ordoñez et al., *Magentic-One* | 2024 · [arXiv:2411.04468](https://arxiv.org/abs/2411.04468) | 外循环双账本 | 拒绝：DATUM 刻意是唯一账本 |

塑造机制的内部证据（非论文）：作者 384 轮受控实验中，无结构迭代两次在第 3–4 轮崩溃，结构化运行零崩溃——这是“机械强制（hook/server）优于提示词自觉”的直接动机。

## 限制与非目标

- Keel 守护**主题，不守护过程**。需要交付物具体度保证时，交给你的 plan/build 工作流，并用 `keel_ref_add` 保护其产物。
- 同意的意义以你的注意力为限——但 v2 没有流水线可盖章：要么你被请求十二个字，要么你明确选择了关。
- 单一设计权威：不支持多 agent 并发主写同一 DATUM。
- 无自主演化：Keel 从不运行无人值守的设计变更循环。

## 迁移（v1 → v2）

旧 v1 项目的 00/G/01/R 读写照常。v1 `state.json` 自动映射（`concept`→draft，`tech`/`handoff`→authoritative）。`TECHNICAL.md` 与 DATUM 里的 02/03 段成为普通不受保护内容：内容重要就先另行归档；想保 `TECHNICAL.md` 的防篡改证据就 `keel_ref_add` 挂载；`keel_clean` 可剥掉孤儿段头（维护行只记标题不记正文——先归档）。完整规范见 [`docs/PROTOCOL.md`](docs/PROTOCOL.md)；全系统心智模型（总-分图）见 [`docs/MENTAL-MODEL.md`](docs/MENTAL-MODEL.md)。

## 开发

```bash
node tests/hostcompat.js   # 打包 vs 宿主契约门禁
node tests/smoke.js        # 端到端：draft → 激活 → 同意 → 开关翻转 → 保护引用 → 维护
```

仓库结构：`.claude-plugin/`（插件+市场清单）· `mcp/server.js`（server v2）· `skills/keel/`（主技能 + `references/notebook.md`、`references/steward.md`）· `skills/keel-stress-test|keel-alternatives|keel-relax-probe|keel-skeleton/`（迭代子技能）· `templates/`（DATUM / AMENDMENTS）· `hooks/`（会话自举 + 确认后刷新）· `docs/PROTOCOL.md`（规范）· `docs/MENTAL-MODEL.md`（系统自身的心智模型）· `tests/`（hostcompat + smoke）。
