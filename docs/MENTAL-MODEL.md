# Keel —— 全流程心智模型

> **一句话。** Keel 守护设计中绝不允许悄悄退化的那部分：一份只能经"分层同意服务器"写入的权威承诺文档（DATUM）——每次变更都留审计行，每个会话都从核心原文出发，每份派生物要么被保护、要么明确不设防。

**文档契约。** 本文件是 Keel 的*心智模型*：开发者视角的全流程图景。它是派生文档（保护级 L0）——真源是代码（`mcp/server.js`、`skills/`、`hooks/`）与 `docs/PROTOCOL.md`；若本文件与它们冲突，**代码赢，本文件修**。更新只许加深，不得静默推翻早先的断言；确需改写的断言，就地修改并记入文末变更表。对应 **Keel v1.2.2**；计划项集中列于 §12，并在各分图中以虚线呈现。

---

## 0. 怎么读这份文件

### 0.1 总-分结构（为什么这样组织）

这份文档是一张可缩放的地图：**§1 的总图是你脑中应常驻的那一层**——完整流程一图可见；可模块化的部分被抽离为**分图①–⑧**，在总图中各占一个**紫色节点**。紫色节点 = "此处放大见对应分图"。两层之间的桥就是编号：总图里的 ③ 和 §4 的分图③是同一个东西。读任何分图前先在总图里定位它，模型就不会断线。

总图只画**已存在**的流程；计划项全部在各分图内以虚线呈现（计划清单见 §12）——不把未来画成现状，是保持模型连续性的纪律。

### 0.2 颜色与线型规则

| 视觉 | 含义 |
|---|---|
| **绿色** | 开发者可感知——人会读到、决定或输入的步骤 |
| **蓝色** | AI 行为——受提示词驱动的判断与产出 |
| **灰色** | 纯机械——服务器代码或 hook，每次执行完全相同 |
| **紫色** | 分图入口——总图中代表一整张分图的位置 |
| 虚线边框（保留受众色） | 计划新增，尚不存在 |
| 粗边框（保留受众色） | 计划修改既有步骤——**必须显式写明"当前：… / 修改后：…"**（目前没有此类节点：现存全部计划项都是附加式，此规则为将来备用） |
| 实线箭头 | v1.2.2 已存在的流程 |
| 虚线箭头 | 计划中的流程 |

混合步骤拆成按角色的多个节点（"AI 请求同意"是蓝、"开发者输入同意原话"是绿、"服务器记审计行"是灰）——这个拆分本身就是重点：它显示人到底在环的哪里。

```mermaid
flowchart LR
    A["绿 = 开发者"]:::human --> B["蓝 = AI"]:::ai --> C["灰 = 机械"]:::mech --> P["紫 = 分图入口"]:::mod
    D["虚线边框 = 计划新增<br/>（保留受众色）"]:::plantai -.-> E["虚线箭头 = 计划流程"]:::plantai
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef mod fill:#f3e5f5,stroke:#6a1b9a,color:#4a148c,stroke-width:2px
    classDef plantai fill:#e3f2fd,stroke:#1565c0,stroke-dasharray:5 5,color:#0d47a1
```

### 0.3 先泼五盆冷水（常见误会）

1. **误会：注入的 digest 是给你看的。** 它是给 *agent* 的——一段原文切片，让 AI 每个会话都握着核心。你的界面是对话（推导展示、菜单、同意请求），不是注入通道。
2. **误会：handoff.md "滚动"意味着旧版丢了。** 每次重写前，被替换的版本先冻结到 `archive/handoff-<n>.md`。任何东西都不删除。
3. **误会：保护引用会拦截写入。** 它是防篡改*证据*（SHA-256、只报告），不是写门禁。只有 DATUM 本身是写门禁。
4. **误会：振荡值高会卡流程。** 振荡是明确标注的参考值——永不作为阈值、永不触发门禁（用户明确决定）。
5. **误会：你可以让 AI 直接手改文件。** 它必须拒绝：所有 `.keel/` 写入走 `keel_*` 工具；skill 铁律 1 与服务器对日志的所有权共同保证。连对 `amendments` 的 `keel_write_section` 都会被拒。

---

## 1. 总图（常驻层）

```mermaid
flowchart TD
    DORM["无 .keel —— 插件休眠<br/>skill 不触发 · hooks 静默"]:::mech
    START["开发者发起 / 继续设计流"]:::human
    M1["① 激活与 CONCEPT<br/>提取需求 · 推导链 D1–D6 · 挑战 · 术语 · 迭代"]:::mod
    M2["② 写入路径与同意机制<br/>所有 .keel 写入的必经之路<br/>分层 · 暂存 · 防覆盖 · 审计行"]:::mod
    M3["③ 门禁与阶段转移<br/>G1 概念门 · G2 联结门 · phase 硬门禁"]:::mod
    M4["④ TECH 与 HANDOFF<br/>契约索引 + TECHNICAL · 决策菜单 · 滚动交付"]:::mod
    HO["handoff.md 滚动快照<br/>DATUM + TECHNICAL 捆绑包"]:::mech
    BUILD["计划 / 构建工作流消费捆绑包"]:::ai
    SESSION["新会话（.keel 存在的目录）"]:::human
    M5["⑤ STEWARD · 会话自举与重同步"]:::mod
    M6["⑥ STEWARD · 漂移防御"]:::mod
    M7["⑦ 保护引用生命周期"]:::mod
    M8["⑧ 维护与体检"]:::mod

    DORM --> START --> M1
    M1 <-->|"全部写入必经② / 审计行·staleRefs 回流"| M2
    M1 -->|"推导收敛 · P* 已逐条签收"| M3
    M3 -->|"G1 通过 → phase=tech"| M4
    M3 -->|"G1 未过：原则太弱 / 未签收"| M1
    M4 <-->|"全部写入必经②（索引=核心层）"| M2
    M4 -->|"九项齐备 + 用户复核"| M3
    M3 -->|"G2 通过 → phase=handoff<br/>服务器机械写 handoff.md"| HO
    M3 -->|"G2 未过：回填 T 项 / 修联结"| M4
    HO --> BUILD
    M2 -->|"handoff 阶段每次落盘：<br/>滚动刷新 · 旧版冻结 archive/"| HO
    SESSION --> M5
    M5 -->|"自举后进入任意任务"| M6
    M6 -->|"触及核心 → 走②的同意流程"| M2
    M2 -->|"confirm 返回 staleRefs"| M7
    M7 -->|"重纳需核心同意（走②）"| M2
    M5 -->|"会话内按需调用"| M8
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef mod fill:#f3e5f5,stroke:#6a1b9a,color:#4a148c,stroke-width:2px
```

总图压缩掉、由分图展开的三件事：**②** 是横切机制——CONCEPT/TECH/HANDOFF/build 任何阶段的写入都走它，同意就发生在这里；**⑤** 让设计跨会话存活；BUILD 之后 STEWARD 仍常驻（⑥挂在每个任务前）。

---

## 2. 分图①：激活与 CONCEPT

```mermaid
flowchart TD
    subgraph H["开发者 —— 你能感知的"]
    STATE["陈述目标 / 需求 / 成功标准 / 范围外"]:::human
    CONF["逐条确认提取出的 R1..Rn"]:::human
    READ["阅读推导链、增量卡（计划）、菜单"]:::human
    CHAL["攻击某一步 —— 挑战假设、张力或被拒路线"]:::human
    FORK["裁决 D3/D4 处的真分叉<br/>（仅多候选模式）"]:::human
    SIGN["按优先序逐条签收 P*<br/>（加权优先级，非不变量）"]:::human
    end
    subgraph A["AI —— skill 驱动"]
    EXTRACT["提取目标/范围/R*，保留用户原话"]:::ai
    DCHAIN["推导链 D1→D6：<br/>需求事实→张力→洞察[事实/假设/推理]→<br/>原则 P1–P5→概念模型→被拒路线"]:::ai
    TERM["术语首次出现的同一回合内注册"]:::ai
    RIP["展示被攻击步骤的波及 → 增量式修订草案"]:::ai
    PARK["冒出的技术细节 → 01 停车场"]:::ai
    SKEL["骨架测试：仅凭 00 + P* 重建概念模型"]:::ai
    ITER["迭代（仅手动触发）：压力测试·备选洞察·<br/>约束探针·骨架测试；先声明预测再执行"]:::ai
    CARD["增量卡（计划 P1）：每个推导里程碑后<br/>≤5 行，只列模型新增/改变的实体·规则·失败方式"]:::plantai
    BATGEN["生成电题（计划 P2）：从 DATUM 承诺出题，<br/>预期答案出题时即写（预注册）"]:::plantai
    CONV["收敛自检（计划 P5）：实体饱和·<br/>电题可承诺·模型稳定三判据"]:::plantai
    end
    subgraph M["机械"]
    INIT["keel_init —— 已有 .keel 时拒绝<br/>（除非 force=true）"]:::mech
    W00["暂存 00 写入（核心层）——<br/>逐条确认的原话即 consent_evidence"]:::mech
    PROPOSE["keel_write_section / keel_glossary_register<br/>→ 进入②的分层机制"]:::mech
    end

    STATE --> EXTRACT --> CONF
    CONF -->|"确认原话被引用为证据"| W00
    W00 --> DCHAIN --> READ
    DCHAIN -.-> CARD
    DCHAIN -.-> BATGEN
    READ --> CHAL --> RIP --> DCHAIN
    DCHAIN -->|"仅当 D3/D4 出现真分叉"| FORK
    PARK --> PROPOSE
    TERM --> PROPOSE
    DCHAIN --> SIGN
    SIGN -.-> CONV
    CONV -.->|"提示可以提请 G1"| SIGN
    ITER -.-> CARD
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef plantai fill:#e3f2fd,stroke:#1565c0,stroke-dasharray:5 5,color:#0d47a1
```

图压缩不掉的规则：

- **推导形状是强制的**——每个概念设计都以 D1–D6 链呈现；没有完整被拒路线（D6 ≥ 1）的推导按协议不可信。
- **挑战协议**：攻击 → 波及（涉及契约/术语时 `keel_ripple`）→ 增量式修订链 → 核心提案 → 同意 → confirm → 02 台账记修订条目（"旧信念→新证据→新原则"，填 `overturns`）。
- **需求共同演化**：概念暴露的缺口以核心提案的形式回到 00 提请开发者裁决——禁止静默吸收。
- **高度上限**：概念阶段产出不含类名、不含技术选型；细节进 01 *停车场*。
- **电题（计划 P2）**存于 `.keel/probes/battery.md`；开发者自测在对话之外进行，只有分歧回到对话里——格式与设计见 §12。

---

## 3. 分图②：写入路径与同意机制（横切所有阶段）

这是 Keel 的心脏。任何改变 `.keel/` 的东西都从这里走。

```mermaid
flowchart TD
    WANT["AI 想修改内容<br/>（段落写入·术语·保护引用增删）"]:::ai
    ECON{"用户原话已明确指定该改动<br/>且波及 closure 为空？"}:::ai
    SHOW["核心项：先向开发者展示理由 + 波及，<br/>再请求同意"]:::ai
    ASK["请求明确同意"]:::ai
    TYPE["开发者输入同意原话"]:::human
    CALL["keel_write_section —— 单段 section+content<br/>或批量 sections（一次逻辑变更）"]:::ai
    VAL["机械校验：段落合法 · 禁写 amendments ·<br/>批内无重复段 · 内容非空 · 段内禁 '## ' 标题 ·<br/>summary ≤120 字符"]:::mech
    RAT{"核心层且<br/>rationale 少于 8 字符？"}:::mech
    CLOS["closure 扫描——机械提取触核心引用：<br/>索引 implements 列 · technical 的 contracts→索引联结 ·<br/>术语 load-bearing 列 · 引用 carries 列"]:::mech
    UNIDX{"contracts: 的 id<br/>不在索引里？"}:::mech
    ESC{"声明 peripheral 但<br/>closure 非空？"}:::mech
    EFF["effLevel = core-escalated"]:::mech
    STAGE["暂存提案 PR-n 于 state.json：<br/>完整内容 + 各段 baseContent 基线快照"]:::mech
    APPLY["立即落盘 · 记审计行<br/>consent 值 batch-notified"]:::mech
    NOTIFY["会话末 / 门禁 / keel_status 时批量告知开发者"]:::ai
    CONFIRM["keel_confirm 提案id + consent_evidence"]:::ai
    EV{"consent_evidence<br/>少于 2 字符？"}:::mech
    CLOB{"暂存后有任何段落<br/>被别的写入改过？"}:::mech
    CLOBERR["拒绝——防覆盖：<br/>错误信息指引用 keel_reject 后<br/>按当前内容重新提案"]:::mech
    REJ["keel_reject —— 丢弃暂存"]:::ai
    APPLY2["落盘 · 记审计行<br/>consent = yes（原话前 40 字符）"]:::mech
    LIFT["层级含 core → 终身核心计数 +1"]:::mech
    HOPH{"当前阶段是<br/>handoff？"}:::mech
    ROLL["滚动 handoff.md —— 旧版先冻结到<br/>archive/handoff-n.md · 新头 Snapshot at amendment N"]:::mech
    STALE["计算 staleRefs：保护引用的 carries 与本次<br/>核心引用相交者（对照落盘前快照）"]:::mech
    RELAY["返回 staleRefs → AI 转达开发者——<br/>再生归拥有方工作流；Keel 只检测、绝不再生"]:::ai
    BAT2["锚定在被改承诺上的电题条目<br/>随之过期（计划 P2）"]:::planmech

    WANT --> ECON
    ECON -->|"是——原话本身即证据"| CALL
    ECON -->|"否——必须先展示波及"| SHOW --> ASK --> TYPE --> CONFIRM
    WANT --> CALL
    CALL --> VAL --> RAT
    RAT -->|"是 → 校验错误，补足理由重调"| CALL
    RAT -->|"否"| CLOS --> UNIDX
    UNIDX -->|"是 → 'Cn(未索引)' 进入 closure"| ESC
    UNIDX -->|"否"| ESC
    ESC -->|"是"| EFF --> STAGE
    ESC -->|"否"| APPLY --> NOTIFY
    STAGE --> CONFIRM --> EV
    EV -->|"是 → 报错补证据"| ASK
    EV -->|"否"| CLOB
    CLOB -->|"是"| CLOBERR --> REJ
    CLOB -->|"否"| APPLY2 --> LIFT --> HOPH
    HOPH -->|"是"| ROLL --> STALE
    HOPH -->|"否"| STALE
    STALE -.-> BAT2
    STALE --> RELAY
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef planmech fill:#eceff1,stroke:#546e7a,stroke-dasharray:5 5,color:#37474f
```

图压缩不掉的事实：

- **什么算触核心**：引用匹配 `^(P\d|01|00)`——原则 id，或指向 `01 Concept` / `00 Intent` 的引用。其余皆外围，除非被 closure 升级。
- **批量 = 一次逻辑变更**：`sections:[{section,content},…]`——一次同意、一行审计，且各段不会在两次写入之间漂移。协议*强制*索引+technical 用批量形式；跨 00+01+台账的需求变更同理。
- **术语与保护引用走同一机制**：`keel_glossary_register` 自行算层级（load-bearing 于 P*/01/00 ⇒ 核心）；`keel_ref_add` / `keel_ref_remove` 恒以核心层提案（它们改变保护边界）。
- **防覆盖守卫在实测中真实触发过**：Codex 试点中第二个提案因底层段落已变在 confirm 处被拒；正确恢复路径（reject + 重提）就写在错误信息里。
- **同意经济（铁律 2）**：仅当 AI 先算过波及 closure 且 closure 为空，才可把"逐字指定了改动"的用户消息当作同意。否则：停下、展示波及——开发者看完波及可能会改主意。

---

## 4. 分图③：门禁与阶段转移（G1 / G2 内部）

```mermaid
flowchart TD
    subgraph G1S["G1 —— CONCEPT → TECH"]
    M1C["机械检查（7 项）：<br/>00 目标已填 · 范围外已填 · ≥1 条需求 ·<br/>原则 3–5 条 · ≥1 条台账 · ≥1 个术语 ·<br/>骨架测试槽（初始为 false）"]:::mech
    S1["骨架测试（语义项）：仅凭 00 + P* 重建概念模型——<br/>优先真外部信号（新进程重建，标注 external），<br/>无子代理设施才允许自模拟且必须标注"]:::ai
    R1["签收评审（语义项）：开发者按优先序<br/>逐条签收每个 P* —— 记入 02 台账"]:::human
    B1["电池轮作为评审形式（计划 P2）：<br/>重点压坏世界题（失败·并发·边界）"]:::planhuman
    end
    subgraph G2S["G2 —— TECH → HANDOFF"]
    M2C["机械检查（13 项）：九个 TECHNICAL 项填实且 contracts 可解 ·<br/>索引非空 · 每行有 implements+detail ·<br/>联结双向可解 · 用户复核槽（初始为 false）"]:::mech
    R2["复核（语义项）：开发者读索引 +<br/>TECHNICAL 摘要 + 全部决策点"]:::human
    end
    REC["keel_gate_record —— 语义记录，证据 ≥4 字符<br/>（探针文件路径、评审出处）"]:::mech
    PH["keel_phase —— 硬门禁：<br/>to tech 需 G1.pass · to handoff 需 G2.pass"]:::mech
    SNAP["进入 handoff：服务器机械打包 handoff.md<br/>（DATUM + TECHNICAL + 快照头）"]:::mech
    FAIL["门禁未过 → keel_phase 直接报错；<br/>先回去补齐未过项"]:::mech

    M1C --> S1 --> REC
    R1 --> REC
    REC -.-> B1
    M2C --> R2 --> REC
    REC --> PH
    PH -->|"通过"| SNAP
    PH -->|"拒绝"| FAIL
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef planhuman fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray:5 5,color:#1b5e20
```

两个语义槽**故意**设计成机器查不了：服务器先标 false，只有带证据的 `keel_gate_record` 能点亮它们。清单上其余各项全部由文件内容计算得出。

---

## 5. 分图④：TECH 与 HANDOFF

```mermaid
flowchart TD
    subgraph T["TECH 阶段"]
    AUTHOR["AI 把索引行 + TECHNICAL 项作为<br/>同一个批量提案起草：<br/>sections: index + technical"]:::ai
    IDX["03 契约索引 —— 薄，核心层：<br/>Cn · 一行契约 · implements P* · detail T#"]:::mech
    TECHF["TECHNICAL.md —— 派生（L0）：<br/>T1..T9，各带 contracts: Cn 回链"]:::mech
    MENU["每个分叉出决策菜单：<br/>选项 + 推荐 + 理由 + 选错的代价 —— 选择记入台账"]:::ai
    FEEL["每个选项再附一行可感差异（计划 P3）：<br/>选它 vs 不选它，程序行为上你能感觉到什么"]:::plantai
    CHOOSE["开发者从菜单选择——<br/>永远不必读完整技术展开"]:::human
    end
    subgraph HO2["HANDOFF 阶段"]
    BUNDLE["handoff.md = DATUM + TECHNICAL + 头部说明：<br/>'计划/构建阶段接收后不再做设计决策'"]:::mech
    ROLLH["每次落盘的修正案都滚动 handoff.md：<br/>旧版先冻结到 archive/handoff-n.md"]:::mech
    FRZ["冻结标记（缓期 P6）：钉住一个不滚动的版本。<br/>仅在真实使用出现此需求时实施；<br/>当前出路是取 archive/handoff-n.md"]:::planmech
    end

    AUTHOR --> IDX
    AUTHOR --> TECHF
    IDX <-->|"联结：implements ↔ contracts"| TECHF
    MENU -.-> FEEL
    MENU --> CHOOSE
    BUNDLE --> ROLLH
    ROLLH -.-> FRZ
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef plantai fill:#e3f2fd,stroke:#1565c0,stroke-dasharray:5 5,color:#0d47a1
    classDef planmech fill:#eceff1,stroke:#546e7a,stroke-dasharray:5 5,color:#37474f
```

值得钉住的两条不变量：`implements:` **只**住在索引里，`contracts:` **只**住在 TECHNICAL——这个联结是波及可计算的原因；没有索引行的 `contracts:` id 会让整个写入升级为核心（见②），所以两份文件连"意外地"漂开都做不到。

---

## 6. 分图⑤：STEWARD · 会话自举与跨会话重同步

两个读者、两条通道——同源不同投影。

```mermaid
flowchart TD
    SESS["新会话（.keel 存在的目录）"]:::human
    HOOK["SessionStart hook —— 机械：<br/>原文切片 DATUM → 严格 JSON additionalContext"]:::mech
    INJ["agent 上下文从此握有 digest：<br/>文档指针 · 阶段 · 目标/范围/需求/P* ·<br/>前 6 契约/术语/引用 · 最近 3 条修正案 ·<br/>STEWARD 提醒行"]:::ai
    REFRESH["PostToolUse hook：每次 keel_confirm 后<br/>刷新注入（失败的调用跳过）"]:::mech
    FALLBACK["无 hook 宿主（Codex）：<br/>工作区 AGENTS.md 规则——会话开始与确认后<br/>调 keel_digest"]:::ai
    RECAP["人类重同步（计划 P4）：agent 读 .keel/MODEL.md，<br/>首条回复附 ≤10 行速览——1 次读取，0 次生成轮"]:::plantai
    MODEL["MODEL.md —— 人类版模型文件（计划 P4）：<br/>随核心修正案的同一 batch 滚动更新，<br/>维护不花额外同意轮"]:::planmech
    SELFTEST["电汔回测（计划 P2）：可选——<br/>自测一轮验证重同步质量"]:::planhuman

    SESS --> HOOK --> INJ
    INJ --> REFRESH
    SESS -->|"宿主无 hook"| FALLBACK
    SESS -.-> RECAP
    RECAP -.-> MODEL
    RECAP -.-> SELFTEST
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
    classDef plantai fill:#e3f2fd,stroke:#1565c0,stroke-dasharray:5 5,color:#0d47a1
    classDef planmech fill:#eceff1,stroke:#546e7a,stroke-dasharray:5 5,color:#37474f
    classDef planhuman fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray:5 5,color:#1b5e20
```

digest 第一行是**文档指针**——会话里任何其它工作流都能凭它找到核心并派生，而无需 Keel 读别的东西。

---

## 7. 分图⑥：STEWARD · 漂移防御（每个任务前的决策树）

```mermaid
flowchart TD
    TASK["Keel 常驻会话中的任意任务"]:::ai
    Q1{"触及 P*、索引契约、<br/>所有权或模块边界？"}:::ai
    UNSURE{"不确定？"}:::ai
    RIP["keel_ripple 目标 →<br/>affectedCore + staleRefs"]:::mech
    NONE["继续——实现层，DATUM 不涉及"]:::ai
    CONFLICT{"与 DATUM 冲突？"}:::ai
    STOP["停——禁止静默分歧"]:::ai
    OPT["向开发者呈三个选项"]:::ai
    AMEND["1. 修正——走②的正常同意流程"]:::human
    DROP["2. 放弃该改动"]:::human
    EXEMPT["3. keel_exempt——理由必填，<br/>审计行 consent 值 exempted"]:::human
    NEWREQ["新需求？先对照 00 求差——<br/>冲突/扩围变成核心提案（附代价与波及），<br/>绝不静默吸收"]:::ai
    PGUARD["迭代产出过 P* 检查；张力升级给开发者——<br/>三出口：调权重 / 改迭代 / 改原则"]:::ai

    TASK --> Q1
    Q1 -->|"否"| NONE
    Q1 -->|"不确定"| UNSURE --> RIP --> CONFLICT
    Q1 -->|"是"| CONFLICT
    CONFLICT -->|"否"| NEWREQ --> PGUARD
    CONFLICT -->|"是"| STOP --> OPT
    OPT --> AMEND
    OPT --> DROP
    OPT --> EXEMPT
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
```

---

## 8. 分图⑦：保护引用生命周期（L2）

```mermaid
flowchart TD
    WRITE["拥有方工作流写/改派生文档<br/>（架构笔记、API 文档、本心智模型……）"]:::ai
    ADMIT["keel_ref_add 路径 + carries（它承载的 P*/C*）<br/>→ 核心同意流程（扩展保护边界）"]:::mech
    PIN["入库时记录整文件 SHA-256"]:::mech
    LANDS["某核心修正案落盘，其核心引用<br/>与该文档的 carries 相交"]:::mech
    STALE2["keel_confirm 返回 staleRefs<br/>→ AI 把清单转达开发者"]:::ai
    REGEN["拥有方工作流再生该文档<br/>（Keel 只检测、绝不再生——<br/>它不知道派生函数）"]:::ai
    READMIT["重纳：remove + add，需同意"]:::mech
    VERIFY["keel_refs_verify——重算所有 active 引用的哈希：<br/>文件缺失或内容分叉 → 报告，绝不拦截<br/>（防篡改证据，非写门禁）"]:::mech
    RECON["reconcile：索引契约对照代码、引用对照哈希；<br/>每处漂移标注方向：文档过期 → 提修正案 ·<br/>代码越轨 → 回退或修正"]:::ai
    REMOVE["keel_ref_remove——退出保护范围<br/>（核心同意；文件本身不动）"]:::mech

    WRITE --> ADMIT --> PIN
    LANDS --> STALE2 --> REGEN --> READMIT
    VERIFY --> RECON
    RECON --> REMOVE
    classDef human fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef ai fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
```

---

## 9. 分图⑧：维护与体检

```mermaid
flowchart TD
    STATUS["keel_status —— 阶段·门禁·计数·<br/>待定提案（被遗弃的暂存在此可见）·批量告知"]:::mech
    HEALTH["keel_health —— 双计数：纪元（上次压缩以来）+<br/>终身（state.coreCount，压缩不清零）；<br/>纪元核心修正案 >6 → 黄旗提示<br/>'概念可能从未收敛，考虑重跑骨架测试'"]:::mech
    OSC["振荡（同位置 ≥2 次 overturns）——<br/>仅参考指标，永不阈值、永不做门禁"]:::mech
    CLEAN["keel_clean —— 清除任何工具都够不到的<br/>孤儿 '## ' 块，记维护行"]:::mech
    COMPACT["keel_compact —— 少于 5 条拒绝；<br/>AI 提供合并摘要，服务器把原始日志<br/>逐字归档 archive/amendments-n.md（永不删除）"]:::mech
    ARCH["archive/ —— handoff-n.md · amendments-n.md<br/>一切冻结副本，永不删除"]:::mech

    STATUS --> HEALTH --> OSC
    CLEAN --> ARCH
    COMPACT --> ARCH
    classDef mech fill:#eceff1,stroke:#546e7a,color:#37474f
```

---

## 10. 磁盘上有什么 + 谁能动什么

| 路径 | 保护级 | 所有者 | 是什么 |
|---|---|---|---|
| `.keel/DATUM.md` | **L1 写门禁** | 服务器（经同意流程） | 受保护核心：`00 Intent` · `G Glossary` · `01 Concept（P1–P5 + 概念模型 + 停车场）` · `02 Trade-off Ledger` · `03 Contract Index（薄）` · `R Protected References` |
| `.keel/TECHNICAL.md` | L0 派生 | 服务器 | T1–T9 展开，各项带 `contracts: Cn` 回链 |
| `.keel/AMENDMENTS.md` | 只追加 | **仅服务器** | 每次变更一行：`# / 时间 / 层级 / 位置 / 摘要 / 取代 / consent` |
| `.keel/handoff.md` | 派生，滚动 | 服务器 | DATUM + TECHNICAL 捆绑，带 `Snapshot at amendment N` 头 |
| `.keel/state.json` | 内部 | 服务器 | `phase` · `proposals`（暂存）· `seq` 计数 · `gates` 结果 · `coreCount`（终身） |
| `.keel/probes/` | 证据 | AI 写，人读 | 骨架测试输出等验证产物 |
| `.keel/archive/` | 冻结副本 | 服务器 | `handoff-<n>.md`、`amendments-<n>.md` —— 永不删除 |

**谁能动什么**（整个安全论证压在一张矩阵上）：

| 角色 | DATUM / TECHNICAL / AMENDMENTS | state.json | probes/ |
|---|---|---|---|
| 开发者 | 从不直接——只在对话里说同意原话 | — | 读 |
| AI | 只经 `keel_*` 工具；手改被铁律禁止 | 经工具 | 写 |
| 服务器 | 唯一写入者；校验、分层、记日志 | 唯一写入者 | — |

计划新增（§12）：`.keel/probes/battery.md`（P2）与 `.keel/MODEL.md`（P4）。

---

## 11. AI 收到了什么 —— 常驻提示词清单

| # | 来源 | 到达时机 | 要义 |
|---|---|---|---|
| 1 | skill 前置 `description` | 每会话的工具/技能列表 | 触发条件：用户点名 Keel 流程 / 提到 DATUM、索引、保护引用、骨架测试，**或 `.keel/DATUM.md` 存在 ⇒ 常驻 STEWARD 模式** |
| 2 | `SKILL.md` 铁律 | skill 加载时 | 1) 语义归 AI、确定性归服务器，禁止手改；2) 同意分层 + 明确同意 + 同意经济；3) 概念→目的→术语，同回合注册；4) 振荡仅参考；5) 概念高度上限 + 停车场；6) 保护阶梯 L0–L3，按层应对 |
| 3 | `SKILL.md` 阶段分派 + 速查 | skill 加载时 | 各阶段读哪份 reference；`/keel status · check · protect · unprotect · reconcile` 的映射 |
| 4 | `references/concept.md` | 进入 CONCEPT | 激活步骤；D1–D6 强制形状；多候选分叉策略；挑战协议；迭代集合与"先声明预测"；G1 步骤含骨架测试变体与标注要求 |
| 5 | `references/tech.md` | 进入 TECH | 两文件分工；索引+technical **强制批量**；implements/contracts 的归属；具体度标准线；决策菜单纪律；G2 步骤；handoff 说明 |
| 6 | `references/steward.md` | `.keel` 存在的任何时候 | 自举回退（无 hook 就调 keel_digest）；pre-edit 检查；冲突三选项；保护引用生命周期；reconcile 双向标注；维护触发；高度测试 |
| 7 | hook 注入的 digest | SessionStart + 每次 confirm 后 | 原文切片（绝非 AI 转述）：指针、阶段、目标/范围/需求、P*、前 6 契约/术语/引用、最近 3 条修正案、STEWARD 提醒 |
| 8 | 服务器工具描述 + 错误信息 | 每次调用 | 每个工具的契约；错误自带指引——防覆盖错误直接告诉 AI 去 reject+重提；暂存结果里内嵌同意指令 |
| 9 | 工作区 `AGENTS.md`（Codex 适配） | 无 hook 宿主的每个会话 | "会话开始与确认后调 keel_digest" |

计划中的提示词增补（§12）：增量卡纪律（P1）、电题协议（P2）、菜单可感差异行（P3）、重同步规则（P4）、收敛自检（P5）。

---

## 12. 计划变更登记（均不存在；无删除计划）

| Id | 变更 | 类型 | 设计要点 |
|---|---|---|---|
| **P1** | 推导展示中的增量卡 | 附加（AI 行为） | 每个推导里程碑附 ≤5 行"模型增量"——只列新增/改变的实体、规则、失败方式。工作记忆尺寸；开发者预测连续答对时自动降密度。不落盘——它是对话态；D5 是沉淀后的幸存部分。 |
| **P2** | 预测电题 —— `.keel/probes/battery.md` | 附加（文件 + 协议） | 每项目一份累积电题。条目格式：题目 · 预期答案（折叠 `<details>`）· **锚点**（所测的 P*/C*/不变量）· 收录日期。预期答案**出题时即写**（预注册——防止事后迁就答题者）。开发者对话外自测，**只有分歧进对话**（异常才升级——省轮次、净上下文）。锚不上的题=发现未决决策，不是坏题。锚定承诺被修正 → 相应条目随波及过期。G1 评审形态：一轮重坏世界的电题。可选：consent_evidence 引用电题答案，审计行同时是理解证据。 |
| **P3** | 决策菜单附可感差异行 | 附加（AI 行为） | 每个选项一句话：选它 vs 不选它，程序行为上你能感觉到什么。让没装完整技术模型的开发者也能决策。 |
| **P4** | 人类重同步 —— `.keel/MODEL.md` | 附加（文件 + 协议） | 人类版模型文件，**随修正案 batch 滚动**（同 handoff.md 的滚动逻辑——维护零额外同意轮）。会话开始时 agent 读它并在首条回复附 ≤10 行速览（1 次读取，0 次生成轮）；可选电汔回测验证。**本文件就是原型**——`docs/MENTAL-MODEL.md` 对 Keel 仓库扮演的角色，与 `.keel/MODEL.md` 将来对每个项目扮演的角色相同。 |
| **P5** | 收敛自检启发式 | 附加（AI 行为） | "该推收敛还是继续细化"的 agent 侧信号：实体饱和（连续两轮无新实体/角色/状态；争文案不争规则）、电题可全部以承诺口吻作答、模型稳定。反面信号：有人说"如果到时候……就麻烦了"而无人接得住。参考启发式，永不作门禁。 |
| **P6** | 滚动 handoff 的冻结标记 | 暂缓 | 钉住一个不滚动的版本。仅当真实使用出现需求——当前出路是 `archive/handoff-<n>.md`。 |

---

## 13. Mermaid 装不下的常量与规则

- **分层边界正则**：引用匹配 `^(P\d|01|00)` 即触核心。其余皆外围，除非被 closure 升级。
- **数值常量**：consent 证据 ≥2 字符（审计行引用前 40 字符）· 核心 rationale ≥8 字符 · summary ≤120 字符 · gate_record 证据 ≥4 字符 · 豁免理由 ≥4 字符 · 少于 5 条拒绝压缩 · digest 切片：前 6 索引行、前 6 术语、前 6 引用、最近 3 条修正案 · 纪元核心修正案 >6 亮黄旗。
- **19 个工具**：init · digest · status · read · ripple · write_section · confirm · reject · gate · gate_record · phase · glossary_register · ref_add · ref_remove · refs_verify · clean · compact · exempt · health。
- **G2 的九个 TECHNICAL 项**：模块边界与职责 · 接口契约 · 数据模型 · 状态机 · 错误与边界策略 · 技术选型与版本 · 验收标准 · 非功能约束 · 风险与未决项。
- **语义/确定性分工**：AI 写内容、措辞、理由，判断高度；服务器管文件创建、校验、分层、暂存、哈希、门禁、阶段强制、日志追加、handoff 滚动、digest 切片。凡可程序化者皆为代码，绝不交给提示词。
- **宿主面事实**（v1.2.2 的教训）：插件 MCP = `<pluginRoot>/.mcp.json`，命名空间 `plugin:keel:keel`；hook stdout 必须是严格 JSON（`additionalContext`）；所有插件路径锚定 `${CLAUDE_PLUGIN_ROOT}`；发布门禁 = `tests/hostcompat.js` + `tests/smoke.js`（43 项检查）。
- **失败模式与出口**：暂存被遗弃 → `keel_status` 的待定提案可见，用 `keel_reject` 丢弃 · 孤儿 `## ` 块 → `keel_clean` · 未索引契约 id → 写入时自动升级 · 保护文档漂移 → `keel_refs_verify` 报告 + 再生 + 重纳 · state.json 损坏 → 回 conservative 默认（阶段 concept）——从 AMENDMENTS.md（持久历史）恢复。

---

## 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 1 | 2026-09-23 | 初版，对应 Keel v1.2.2；计划登记 P1–P6（P2、P4 的设计于 2026-09-23 讨论中定型）。 |
| 2 | 2026-09-24 | 重构为总-分图结构：§1 总图常驻 + 分图①–⑧（总图中以紫色节点占位）；计划项改为"受众色 + 虚线边框"，停用黄/橙底色；新增粗边框规则（必须显式"当前/修改后"，目前无节点使用）；全文改为中文。 |
