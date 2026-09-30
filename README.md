# Keel

**Keel is the AI's authoritative notebook: a guarded DATUM of the project's requirements and concept model that prevents topic forgetting and silent drift across sessions — while leaving the AI maximum freedom in how it thinks and works.**

> The palest ink is better than the best memory. Keel gives the agent that pen, and makes sure what lands on paper cannot silently change.

Keel is an agent plugin for AI-assisted coding hosts (Claude Code, ZCode, and other MCP-compatible agents). It is a zero-dependency Node.js MCP server, one main skill, four iteration sub-skills, and a session hook.

**中文说明见 [README-zh.md](README-zh.md)。**

> Keel directs no workflow. The AI thinks and plans freely; the only ritual is the glance — after planning, before implementing, check the plan against the notebook (**match, don't bulk-read; zero matches → say so and proceed**). Every numeric write gate is absent by design: the server enforces presence checks, the parser's line formats, and mermaid well-formedness; quality is governed by a **lifespan-clarity rule** — every recorded line must be readable in any later session without the current conversation.

---

## Why Keel exists

AI-assisted development has a memory problem, not a thinking problem. The agent plans brilliantly and then, ten sessions later, has quietly forgotten the goal, drifted from the agreed concept, or rewritten a settled decision without anyone noticing. The conversation is a terrible storage medium.

Keel's answer is deliberately small: one authoritative document (**DATUM**) holding the requirements and the concept model, a mechanical server that owns every write, and a habit — *after you finish a plan, before you implement, look at the notebook.*

Two things are guarded, and only these two:

1. **The topic does not degrade.** Requirements are pinned the moment you state them; the concept model (weighted principles, entities, invariants) is recorded in your own words; nothing below that altitude is guarded at all.
2. **Promises do not silently change.** When the DATUM is complete, core changes wait for your explicit consent (your words stored as audit evidence) — unless you switch that off and let the AI self-manage.

Everything else — how the AI reasons, plans, structures work — is intentionally left free. Keel records outcomes, never process.

## Core concepts

### The document set, organized by protection level

```
consent-gated (before the fact)   DATUM.md — the guarded core (while consent is ON)
tamper-evidenced (after the fact) protected references (your other docs, SHA-256-verified)
unprotected                       everything else, including the AI's own working notes
```

```
.keel/
├─ DATUM.md       the notebook (plain markdown, free to read): 00 Intent (goal /
│                 scope with reasons / numbered requirements R*) · G Glossary ·
│                 01 Concept (weighted principles P1..Pn — order is priority —
│                 · decisions D* · concept model as Entity/Flow/Invariant lines
│                 · open questions) · R Protected References (default ids REF1..)
├─ AMENDMENTS.md  append-only history: what changed, when, with whose consent;
│                 compacted into archive/ (never deleted)
└─ archive/ · state.json
```

The altitude contract: DATUM's membership criterion is *non-degradability*. It records design-level facts only; a document that tried to guard everything would rot and lose authority.

### Modes: draft → authoritative, and two switches

Keel has exactly two phases and two switches:

```
draft ──(the agent declares the DATUM complete: keel_config {authoritative:true})──▶ authoritative
         a semantic judgment in one direction (one-way) — no mechanical readiness check

authoritative:  consent  ON (default) — core writes staged until you consent
                          OFF — the AI self-manages writes (still fully logged)
                steward  ON (default) — structured post-plan check
                          OFF — only the glance habit remains
```

- While **draft**, the AI writes freely; the server logs every change (`ai-managed`) and never asks.
- When the AI judges the essentials recorded (in language that survives the session), it declares the DATUM authoritative itself — one-way — **both switches take effect, default ON**, and it announces the activation to you at that moment.
- `keel_config {consent, steward}` flips either switch anytime, in either direction — no re-validation, your call. A pure-notebook project (`keel_init {notebook:true}`) starts with both off, until you say otherwise.

### The glance habit (the heart of v2)

After the agent finishes a plan and before implementing, it checks the plan against the digest — goal, scope, requirements, principles, invariants, decisions — **naming what the plan touches** (match, don't bulk-read; a provably unrelated plan owes the notebook one line: "zero matches"). Outcomes: no conflict → proceed; conflict → amend / drop / explicit exemption; **disagreement with the DATUM itself → propose an amendment** (the notebook is authoritative, not sacred). With steward ON this glance is a structured check (`keel_ripple`, stale refs, scope-growth proposals); with steward OFF it stays a plain glance.

The timing is deliberate: the check comes *after* planning, so it never constrains how the agent thinks — only what it commits to.

### Consent tiers (while consent is ON)

- **Core** (00/01 content, load-bearing terms, protected references): show rationale + ripple → your explicit consent → the server applies it, storing your consenting words as audit evidence.
- **Peripheral** (open-question notes and other non-core content): applied immediately, batch-reported.
- The server — not the AI's judgment — computes which is which, via traceability closure. A staged proposal is refused at confirm if its target changed underneath (anti-clobber), and one logical change across sections is one batched proposal: one consent, one audit row.

### Protected references

Your other documents (an API spec, an architecture note, a generated mental model) can be admitted into the anti-degradation scope: Keel records the whole-file SHA-256 and re-verifies on demand. Protection is tamper-evidence, not write-gating — the owning workflow edits freely; divergence is *detected and reported*, never blocked. When a core amendment lands, Keel reports which protected documents are now suspected stale; regeneration belongs to the owning workflow.

### Iteration sub-skills

Four standalone thinking tools, split out of the main module so they can be invoked directly and never bloat the notebook protocol:

| Skill | What it does |
|---|---|
| `keel-stress-test` | Attack the stated assumptions with hard scenarios (declare predictions first) |
| `keel-alternatives` | 2–3 genuinely different solution directions for a fork |
| `keel-relax-probe` | Which constraint, if relaxed, unlocks a better design — and what it costs |
| `keel-skeleton` | Rebuild the concept model from 00 + P* alone; low coverage means the principles are decoration |

All four work with or without a DATUM (skeleton requires one), keep temp files only in the system temp directory and delete them when done, and feed adopted findings back through the main module's write path.

## How residency actually works

"Resident" means three concrete things, not one:

1. **SessionStart hook** (mechanical). If `.keel/DATUM.md` exists in the working directory, the hook injects a *verbatim excerpt* of the notebook as hook JSON `additionalContext` — led by a document pointer, followed by the mode line (phase + switches), goal/scope/requirements, principles, invariants, decisions, top terms, protected refs, and recent amendments. Not an AI summary; sliced by code. A **PostToolUse hook** refreshes it after every applied consent. The Codex adapter registers the same hooks in `~/.codex/hooks.json`; on hosts without hooks, the skill falls back to calling `keel_digest` itself.
2. **Skill trigger** (behavioral). The main skill's description loads the protocol whenever the user mentions Keel *or* `.keel/DATUM.md` exists — so the glance habit engages even in sessions where nobody says "keel".
3. **MCP server** (mechanical backstop). DATUM writes only go through the server; while consent is ON, core changes are staged until you consent. Divergence without a paper trail is not possible through the supported path.

On hosts without hooks, the skill falls back to calling `keel_digest` at session start and after confirmations.

## A worked example

You: *“用 keel 记一下：一个本地笔记应用，核心是双向链接，改名字后链接不能断。”*

The agent initializes the notebook, extracts numbered requirements (confirming them with you), and — while the DATUM is draft — records them freely, along with principles and a concept model in everyday words. When it judges the notebook complete, it declares the DATUM authoritative (`keel_config {authoritative:true}`) and tells you: *"consent mechanism and STEWARD are now ON — say the word to switch either off."*

Later, in an unrelated session, the agent plans a new feature: *merge multiple selections into one question.* Before implementing, it glances: this touches P2 (*the conversation is the single authoritative source of context*). It stops and offers: amend DATUM (with ripple shown) / drop / explicit exemption. Requirements don't erode silently — that's the whole point.

Later still, you decide you trust the agent completely on this project: *"turn consent off."* Writes become AI-managed — every one still logged, nothing hidden — and the glance habit continues.

## Installation

**Prerequisite**: Node.js ≥ 18 (the MCP server has zero npm dependencies).

### From the plugin marketplace (recommended — Claude Code, ZCode, and compatible hosts)

This repository doubles as its own plugin marketplace, so it installs exactly like marketplace plugins such as Superpowers:

```bash
claude plugin marketplace add maxi3777/Keel
claude plugin install keel@keel-marketplace
```

Inside an interactive session the same steps are slash commands: `/plugin marketplace add maxi3777/Keel`, then `/plugin install keel@keel-marketplace`. (On hosts with a different command syntax the same two operations apply; the plugin name is `keel`.)

Installing registers the MCP server (`.mcp.json` → `node ${CLAUDE_PLUGIN_ROOT}/mcp/server.js`), the five skills (main + four iteration tools), and the SessionStart + PostToolUse hooks. To update later: update the marketplace and reinstall, or pin a ref when adding (`maxi3777/Keel@v2.2.0`).

Optionally, verify the mechanical layer end-to-end on a clone:

```bash
git clone https://github.com/maxi3777/Keel.git
node Keel/tests/hostcompat.js   # release gate: plugin packaging vs host contract
node Keel/tests/smoke.js        # expect: SMOKE PASS
```

`hostcompat.js` mechanically enforces the portable host intersection (`${CLAUDE_PLUGIN_ROOT}`-anchored paths, supported hook events, `${...}` templates, version sync, file existence). Both scripts exit non-zero on any failure and are the pre-release check.

### Codex CLI

```bash
node adapters/codex/install.js     # --uninstall to remove
```

Copies all five skills to `~/.codex/skills/`, appends `[mcp_servers.keel]` to `~/.codex/config.toml`, and registers the SessionStart/PostToolUse hooks in `~/.codex/hooks.json` (same payload and output contract as the plugin hooks). **One-time**: review the hooks via `/hooks` — Codex skips untrusted hook definitions. If hooks are disabled (`[features] hooks = false`), the documented fallback applies. Validated end-to-end with codex-cli 0.153.4.

### Other MCP-compatible hosts (manual wiring)

1. **MCP server** — add to your *project's* `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "keel": { "command": "node", "args": ["/absolute/path/to/Keel/mcp/server.js"] }
     }
   }
   ```

2. **Skills** — copy or symlink each directory under `skills/` into your host's skills directory.
3. **Session hook** — register `node /absolute/path/to/Keel/hooks/session-start.js` as a session-start command (optional; without it the skill calls `keel_digest` itself).

**Verify**: in a scratch directory, tell your agent *"use keel to start a test project"* — you should see `.keel/DATUM.md` created, free writes while draft, and the activation announcement once the agent declares the notebook complete.

## Usage by scenario

There are no slash subcommands. One skill, natural language:

- **Starting** — “用 keel 开始记录这个项目” → init, requirement extraction, free authoring while draft, activation announcement.
- **Working** — nothing to say; the glance happens by itself. When a plan conflicts with the DATUM, the agent stops and offers amend / drop / exempt.
- **Changing the notebook** — just describe the change; with consent ON you will be shown rationale + ripple and asked to confirm.
- **Adjusting trust** — “把同意机制关掉” / “打开 steward” → `keel_config` (either direction, no re-validation).
- **Protecting documents** — “把这个架构文档保护起来” → `keel_ref_add` (+ verify on demand).
- **Checking in** — “keel 状态怎么样” → `keel_status` (phase, switches, counts, pending proposals, batch notifications, health).
- **Maintenance** — when the amendment log grows, `keel_status` says so; the agent compacts it (raw log archived verbatim, never deleted). The health summary reports core-amendment counts on two clocks (since last compaction, always labeled; lifetime, never resets) plus an **oscillation** count — all *reference metrics*, never thresholds.
- **Periodic audit** (recommended; trigger-based — after major rework, after a compaction, or after a long absence) — run `keel_refs_verify` and have the agent re-check notebook hygiene: entities still referenced, invariants still checkable by a cold session, OPEN lines still open.

## How enforcement actually works

| Layer | Mechanism | Guarantee |
|---|---|---|
| Skill | behavioral protocol (glance, stop-on-conflict, announce activation) | guides the agent (best-effort; prompts decay) |
| Hook | SessionStart injection | every session starts with the verbatim notebook excerpt |
| MCP server | sole legal write path | core writes staged until consented **while consent is ON**; closure-based escalation; anti-clobber; append-only log with consent evidence |

The division of labor is an axiom: **the AI produces semantics; code performs every deterministic action.** Even in notebook mode (consent OFF) that holds — the AI decides *what* to write, the server decides *where it lands and what gets recorded*.

## Research background and references

Keel condenses two rounds of survey-and-experiment research on agent problem-solving policy and self-driven design improvement (46 + 48 works surveyed; 384-round controlled iteration experiments). The mechanisms below are drawn from that work and from the papers listed; where Keel's use differs from the paper's original flow, the difference is deliberate.

| Reference | Venue / link | What Keel draws on | Deliberate differences |
|---|---|---|---|
| Huang et al., *When Can LLMs Actually Correct Their Own Mistakes?* | TACL 2024 · [arXiv:2406.01297](https://arxiv.org/abs/2406.01297) | Self-correction works only with external signals | Keel operationalizes the "signal" as the DATUM vs plan comparison at the glance, and the skeleton-test rebuild — not tool feedback on answers |
| Shinn et al., *Reflexion* | NeurIPS 2023 · [arXiv:2303.11366](https://arxiv.org/abs/2303.11366) | Persisted verbal self-reflection across trials | Keel persists design-level reflections as logged amendments with consent and ripple, not free-form memory strings |
| Madaan et al., *Self-Refine* | NeurIPS 2023 · [arXiv:2303.17651](https://arxiv.org/abs/2303.17651) | Iterative self-feedback structure | Used only with an external record (prediction vs deviation in the iteration sub-skills); plain self-refinement without a signal is not trusted |
| Agrawal et al., *GEPA* | ICLR 2026 · [arXiv:2507.19457](https://arxiv.org/abs/2507.19457) | Reflect-then-revise candidate evolution | v2 keeps reflect-then-revise as on-demand sub-skills, never an autonomous outer loop |
| Zhang et al., *ACE (Agentic Context Engineering)* | ICLR 2026 · [arXiv:2510.04618](https://arxiv.org/abs/2510.04618) | Evolving context with delta updates and compaction | Keel compacts the amendment log but never deletes raw history (archive/), adds human notification |
| Nguyen et al., *RSEA* | 2026 · [arXiv:2606.28374](https://arxiv.org/abs/2606.28374) | Held-out keep-better monotonic selection | Keel replaces the numeric objective with the user's judgment at consent time; no automated keep-better gate |
| Ye et al., *ReEvo* | NeurIPS 2024 · [arXiv:2402.01130](https://arxiv.org/abs/2402.01130) | "Verbal gradients" from failures guiding the next candidate | Keel's supersedes chains record the same knowledge; the oscillation statistic built on them is new |
| Liu et al., *EoH (Evolution of Heuristics)* | ICML 2024 · [arXiv:2401.12137](https://arxiv.org/abs/2401.12137) | Thought/artifact co-evolution in a population | Keel keeps only the rejected-alternatives archive; no automated evolution |
| Romera-Paredes et al., *FunSearch* | Nature 625 (2024) · [paper](https://www.nature.com/articles/s41586-023-06924-6) | Program databases retaining best candidates | Same keep-the-best archive semantics, applied to design decisions rather than programs |
| Google DeepMind, *AlphaEvolve* | 2025 · [arXiv:2506.13131](https://arxiv.org/abs/2506.13131) | Evolutionary database with lineage | Lineage → the amendment log; the evolution loop itself is out of scope |
| Hu et al., *Darwin Gödel Machine* | ICLR 2026 · [arXiv:2505.22954](https://arxiv.org/abs/2505.22954) | Archive-based open-ended self-improvement | Archive concept only; Keel contains no self-referential self-modification |
| Zhao et al., *ExpeL* | AAAI 2024 · [arXiv:2308.10144](https://arxiv.org/abs/2308.10144) | Experience distillation into reusable insights | Considered; deferred (the amendment log is the minimal experience layer) |
| Wang et al., *Agent Workflow Memory* | 2024 · [arXiv:2409.07429](https://arxiv.org/abs/2409.07429) | Workflow induction into memory | Rejected in v2 by design: Keel deliberately does not direct workflows anymore |
| Rodriguez-Ordoñez et al., *Magentic-One* | 2024 · [arXiv:2411.04468](https://arxiv.org/abs/2411.04468) | Dual task/progress ledgers in an outer loop | Rejected: DATUM is deliberately the single ledger |

Internal evidence that shaped the mechanics (not from papers): in the authors' 384-round controlled experiments, unstructured iteration collapsed in rounds 3–4 twice while structured runs had zero collapses — the direct motivation for mechanical enforcement (hooks/server) instead of prompt discipline.

## Limitations and non-goals

- Keel guards **the topic, not the process**. If you need guaranteed deliverable concreteness, get it from your plan/build workflow and protect its output via `keel_ref_add`.
- Consent is only as meaningful as your attention — but there is no phase pipeline to rubber-stamp: either you are asked for twelve words, or you have explicitly opted out.
- Single design authority: Keel does not handle multiple agents concurrently authoring one DATUM.
- No autonomous evolution: Keel never runs unattended loops that mutate the design.

## Development

```bash
node tests/hostcompat.js   # packaging gate vs host contract
node tests/smoke.js        # end-to-end: draft → declaration → consent → config flips → refs → maintenance
```

Repository layout: `.claude-plugin/` (plugin + marketplace manifests) · `mcp/server.js` (server, v2) · `skills/keel/` (main skill + `references/notebook.md`, `references/steward.md`) · `skills/keel-stress-test|keel-alternatives|keel-relax-probe|keel-skeleton/` (iteration sub-skills) · `templates/` (DATUM / AMENDMENTS) · `hooks/` (session bootstrap + post-confirm refresh) · `docs/PROTOCOL.md` (spec) · `docs/MENTAL-MODEL.md` (the system's own mental model) · `tests/` (hostcompat + smoke).
