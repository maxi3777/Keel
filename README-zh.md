# Keel

**给 AI 用的权威笔记本：把项目的需求与概念模型记录一次、跨会话守护，防止主题遗忘与静默漂移——同时把思考和工作方式的最大自由留给 AI。**

> The palest ink is better than the best memory. Keel 把这支笔交给 agent，并保证落在纸上的东西不会悄悄变样。

Keel 是面向 Claude Code、ZCode、Codex CLI 及其它 MCP 兼容宿主的插件：一个零依赖的 Node.js MCP server、一个主技能、四个迭代子技能、一个会话 hook。它不主导任何工作流——AI 自由思考、自由计划；唯一的仪式是"看一眼"：做完计划、动手之前，把计划对照笔记本检查（**匹配式，不整本读；可证无关的计划一行"零匹配"照常执行**）。

**English docs: [README.md](README.md)。**

## 为什么需要 Keel

AI 辅助开发的问题不在思考，在记忆。agent 规划得很漂亮——十个会话之后，目标被悄悄遗忘、概念被悄悄漂移、定好的决策被无声改写。对话是一种糟糕的存储介质。

Keel 只守护两件事：

1. **主题不降级。** 需求在你说出的那一刻被钉住；概念模型（加权原则、实体、不变量）用你自己的话记录；这个高度以下的东西一概不管。
2. **承诺不悄悄变。** 某页被声明 authoritative 后，核心修正在你的明确同意下才能落盘（你的原话作为审计证据）——除非你关掉这个开关，让 AI 自管。

其余一切——AI 怎么推理、怎么规划、怎么组织工作——刻意留白。Keel 只记录结果，从不规定过程。

## 笔记本长什么样

```
.keel/
├─ DATUM.md       根页（纯 markdown，自由读取）：00 Intent——目标 / 范围含理由 /
│                 编号需求 R-n · 01 Concept——加权原则 P1..Pn（顺序即优先级）·
│                 决策 D-n · Entity/Flow/Invariant 行式概念模型 · 未决问题
├─ INDEX.md       路由表（server 维护）：pages（路径 / covers / lastAmend 水位线）
│                 + 保护引用表
├─ pages/
│  ├─ terms.md    全局词汇表（全部页面共用一套词汇）
│  └─ <模块>.md   模块页：模块范围与需求 + 概念模型、决策、未决问题
│                 （无 P-n——优先级是项目级的，只在根页）
├─ AMENDMENTS.md  全局唯一只追加历史：改了什么、何时、经谁的同意；
│                 压缩后归档（永不删除）
└─ archive/ · state.json
```

收录判据是*非降级性*：笔记本只记录设计层事实——什么都想守护的文档会腐烂并失去权威。claim id（`R-n`/`P-n`/`D-n`）跨全部页面全局唯一，由 server 强制。

## 工作方式

### 逐页 phase

phase 按页算——完整的模块可以先受守护，未完成的模块继续自由写：

```
每页：  draft ──（AI 判定该页该记的已记全：keel_config {authoritative:true, page}）
        ──▶ authoritative   单向/纪元；重开（{phase:"draft", page}）由用户指令触发：
        快照入档 · 该页暂存提案作废 · 反向涟漪报告

项目开关（存在任一 authoritative 页即生效，默认开）：
  consent  开 —— 核心写入暂存至用户同意 / 关 —— AI 自管（照常记审计行）
  steward  开 —— 计划后结构化检查     / 关 —— 只剩"看一眼"的基础习惯
```

某页处于 draft 期间，AI 自由写入该页——每一次变更都记日志，从不发问。当它判定某页"该记的都记了、且脱离当前对话仍可读懂"时，它自己声明该页 authoritative，并**当场向你宣告**。`keel_config {consent, steward}` 随时翻转任一开关，双向皆可、无需重新验证；纯笔记本项目（`keel_init {notebook:true}`）从建立起两开关全关。

### 看一眼

agent 做完计划、动手实施之前，把计划对照**根页 pins**（目标、范围、需求、原则、不变量、决策：任何会话都可能违反的行）加 **INDEX covers**（稳定锚：仓库路径、术语、claim id）检查，只读命中的页。零匹配 → 一句话声明，照常执行。有冲突 → 修正 / 放弃 / 显式豁免。对笔记本本身有异议 → 提出修正案——笔记本是权威的，不是神圣的。

时机是刻意选的：检查发生在*计划完成之后*，所以它从不约束 agent 怎么想——只约束它承诺什么。

### 同意分层（consent 开启时）

- **核心**（写入 authoritative 表面：页面内容、引用权威断言的术语、保护引用、路由元数据）：展示理由 + 波及 → 你的明确同意 → 落盘，你的同意原话存为审计证据。
- **外围**（未决问题笔记等非核心内容）：立即落盘，批量告知。

哪个算核心由 server 经 traceability closure 机械计算，不是 AI 的判断。暂存提案在 confirm 时若发现底层内容已变会被拒绝（防覆盖）；跨段的一次逻辑变更 = 一次批量提案：一次同意、一行审计。

server 只强制存在性必填、解析所需的行格式与 mermaid 良构检查——再无其它：没有任何数值质量门禁。质量交给**全生命周期清晰度规则**——写进文档的每一行都必须在任意后续会话中脱离当前对话语境仍可读懂。

### 保护引用

你的其它文档（API 规格、架构笔记、生成的心智模型）可以纳入防降级范围：Keel 记录整文件 SHA-256，按需重验（`carries` = 该文档承载的 claim id 或页名，可空——文档也可以纯为防篡改而受保护）。保护是防篡改*证据*，不是写门禁——拥有方自由编辑，分叉被检测并报告，从不拦截。核心修正落盘时，Keel 报告哪些保护文档疑似过期。

### 迭代子技能

四个独立思维工具，从主技能拆出，可单独调用：

| 技能 | 做什么 |
|---|---|
| `keel-stress-test` | 用硬场景攻击已声明的假设（先声明预测） |
| `keel-alternatives` | 为一个分叉给出 2–3 个机制上真正不同的方向 |
| `keel-relax-probe` | 松掉哪条约束能解锁更好的设计——代价是什么 |
| `keel-skeleton` | 仅凭 00 + P\* 重建概念模型；覆盖率低说明原则是装饰 |

四个技能有无笔记本都能用（skeleton 需要有），临时文件只放系统临时目录、用完即删，被采纳的结论经主模块写入路径回到笔记本。

### 强制分层

| 层 | 机制 | 保证 |
|---|---|---|
| 技能 | 行为协议（看一眼、冲突即停、宣告激活） | 引导 agent（尽力而为；提示词会衰减） |
| hook | SessionStart 注入 digest + PostToolUse 刷新 | 每个会话以代码切出的笔记本原文切片开场 |
| MCP server | 唯一合法写路径 | consent 开启时核心写入暂存至同意；closure 升级；防覆盖；带同意证据的只追加日志 |

分工是公理：**AI 产出语义；代码执行一切确定性动作。** 无 hook 宿主上，技能自行在会话开始与确认后调 `keel_digest`。

## 安装

**前置**：Node.js ≥ 18（MCP server 零 npm 依赖）。

### 插件市场——Claude Code、ZCode、兼容宿主

本仓库自身就是插件市场，安装方式与任何市场插件一致：

```bash
claude plugin marketplace add maxi3777/Keel
claude plugin install keel@keel-marketplace
```

交互会话里同样的两步是斜杠命令（`/plugin marketplace add maxi3777/Keel`，然后 `/plugin install keel@keel-marketplace`）。日后更新：更新市场后重装，或添加时钉住版本（`maxi3777/Keel@v2.3.0`）。

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

复制全部五个技能到 `~/.codex/skills/`，向 `~/.codex/config.toml` 追加 `[mcp_servers.keel]`，并把 hooks 注册进 `~/.codex/hooks.json`。一次性步骤：在 Codex 里经 `/hooks` 审阅并信任这些 hooks——未受信任的定义会被跳过。已在 codex-cli 0.153.4 上端到端验证。

### 其它 MCP 兼容宿主

把 server 加入项目的 `.mcp.json`：

```json
{
  "mcpServers": {
    "keel": { "command": "node", "args": ["/绝对路径/Keel/mcp/server.js"] }
  }
}
```

再把 `skills/` 下各目录复制或链接到宿主技能目录。会话 hook 可选——没有它，技能会自行调 `keel_digest`。

**验证**：在一个空目录里对 agent 说"用 keel 建个测试项目"——应看到 `.keel/DATUM.md` 被创建、draft 期自由写入、agent 声明笔记本完整时的激活宣告。

## 使用

没有斜杠子命令——一个技能 + 自然语言：

- **开始**——"用 keel 开始记录这个项目" → 初始化、需求提取、draft 期自由书写、逐页激活宣告。
- **日常干活**——什么都不用说，"看一眼"自动发生。计划与笔记本冲突时 agent 停下来给出三选项。例：agent 规划*把多次选择合并成一个问题*，看一眼，发现触及 P2（*对话是上下文的唯一权威来源*），于是带着三个选项停下来，而不是悄悄做下去。
- **长出模块**——"给订单模块单开一页" → `keel_page_add`（+ covers）；路由与零匹配规则接管其余。
- **重做模块**——"重做 orders 页" → 重开该页（快照、批量草稿、反向涟漪），稳定后重新声明。
- **调整信任**——"把同意机制关掉" / "打开 steward" → `keel_config`，双向皆可，无需重新验证。
- **保护文档**——"把这个架构文档保护起来" → `keel_ref_add`（按需 verify）。
- **查看与维护**——"keel 状态怎么样" → `keel_status`（阶段、开关、待定提案、健康度——全部是参考指标，永不作阈值）。审计日志过长时 agent 执行压缩（原始日志逐字归档，永不删除）。大改之后、压缩之后、长期未开之后，跑一次定期对账：`keel_refs_verify` + 笔记本卫生检查。

## 限制与非目标

- Keel 守护**主题，不守护过程**。需要交付物具体度保证时，交给你的 plan/build 工作流，并用 `keel_ref_add` 保护其产物。
- 同意的意义以你的注意力为限——但没有流水线可盖章：要么你被请求十二个字，要么你明确选择了关。
- 单一设计权威：多会话并发主写同一笔记本由 confirm 时的防覆盖检查串行化（后到的提案被拒后按当前内容重提）。
- 无自主演化：Keel 从不运行无人值守的设计变更循环。

## 开发

```bash
node tests/hostcompat.js   # 打包 vs 宿主契约门禁
node tests/smoke.js        # 端到端：draft → 声明激活 → 同意 → 模块 → 保护引用 → 维护
```

仓库结构：`.claude-plugin/`（插件+市场清单）· `mcp/server.js` · `skills/keel/`（主技能 + `references/`）· `skills/keel-stress-test|keel-alternatives|keel-relax-probe|keel-skeleton/` · `templates/` · `hooks/` · `adapters/codex/` · `docs/PROTOCOL.md`（规范）· `docs/MENTAL-MODEL.md` · `tests/`。

## 参考文献

Keel 浓缩了两轮"综述 + 实验"研究（46 + 48 篇工作；384 轮受控实验——其中无结构迭代两次崩溃、机械结构化运行零崩溃，这是"用 hook + server 而非提示词自觉来强制"的直接动机）。Keel 实际用到的机制只溯源到其中少数几篇：stress-test 溯源失败聚类谱系（ExpeL、Self-Harness），alternatives 溯源新颖性闸门（ShinkaEvolve），被拒路线档案与 supersedes 链溯源 EoH 与 ReEvo，日志压缩溯源 ACE，"看一眼"与 skeleton 溯源外部信号原理（Huang et al.）——skeleton 本身是 Keel 原创的，relax-probe 在综述语料里没有直接祖先。其余语料贡献的是 Keel 刻意拒绝了什么：自主外循环、工作流归纳、数值保优门。

1. Huang et al. *When Can LLMs Actually Correct Their Own Mistakes?* TACL, 2024. [arXiv:2406.01297](https://arxiv.org/abs/2406.01297)
2. Shinn et al. *Reflexion: Language Agents with Verbal Reinforcement Learning.* NeurIPS, 2023. [arXiv:2303.11366](https://arxiv.org/abs/2303.11366)
3. Madaan et al. *Self-Refine: Iterative Refinement with Self-Feedback.* NeurIPS, 2023. [arXiv:2303.17651](https://arxiv.org/abs/2303.17651)
4. Zhao et al. *ExpeL: LLM Agents Are Experiential Learners.* AAAI, 2024. [arXiv:2308.10144](https://arxiv.org/abs/2308.10144)
5. Shanghai AI Laboratory. *Self-Harness: Harnesses That Improve Themselves.* 2026. [arXiv:2606.09498](https://arxiv.org/abs/2606.09498)
6. Sakana AI. *ShinkaEvolve: Towards Open-Ended and Sample-Efficient Program Evolution.* ICLR, 2026. [arXiv:2509.19349](https://arxiv.org/abs/2509.19349)
7. Liu et al. *Evolution of Heuristics: Towards Efficient Automatic Algorithm Design Using Large Language Models.* ICML, 2024. [arXiv:2401.02051](https://arxiv.org/abs/2401.02051)
8. Ye et al. *ReEvo: Large Language Models as Hyper-Heuristics with Reflective Evolution.* NeurIPS, 2024. [arXiv:2402.01145](https://arxiv.org/abs/2402.01145)
9. Zhang et al. *Agentic Context Engineering.* ICLR, 2026. [arXiv:2510.04618](https://arxiv.org/abs/2510.04618)

## 许可证

[MIT](LICENSE) © 2026 maxi3777
