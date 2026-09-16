# Keel

**Keel turns "design" from something that lives in chat history into an authoritative document — co-created with you at the concept level, derived step by step in plain language, then guarded in every later session against drift and erosion.**

> A ship's keel is laid first, and every later measurement of the hull refers back to it. Keel does the same for software design: the concept design is laid first, and every later session measures its changes against it.

Keel is an agent plugin for AI-assisted coding hosts (Claude Code, ZCode, and other MCP-compatible agents). It is a zero-dependency Node.js MCP server plus a skill and a session hook.

**中文说明见 [README-zh.md](README-zh.md)。**

---

## Why Keel exists

If you have co-designed software with an AI agent, you have probably hit all four of these:

1. **Unreadable reports.** The agent hands you a finished structure — modules, calls, folders — with a little annotation, but never *why it looks that way*. It reads like commented code, because the design *derivation* was never a first-class product.
2. **Requirement amnesia.** Your requirements live only in the conversation. Ten sessions later they have quietly eroded, and nothing detects it.
3. **Iteration degradation.** Ask the agent to improve its own design and it patches the artifact: v6 is a pile of historical sediment with no trace of the original idea.
4. **Participation mismatch.** Either you rubber-stamp everything, or you get dragged into implementation minutiae you never wanted to judge.

Keel's answer is one mechanism aimed at all four: a single authoritative design document (**DATUM**) at a deliberately bounded altitude, surrounded by an amendment protocol. Requirements are numbered and pinned the moment you state them. Concept designs must be shown as step-by-step derivations you can attack. Your participation *fades by design* as the design descends from concept to technical detail. And once DATUM exists, every future session is guarded by a resident steward that refuses silent divergence.

## Core concepts

### The DATUM document

`DATUM.md` is the authoritative design record. It is layered, and the layers answer different questions:

```
DATUM.md
├─ 00 Intent              your goal, success criteria, out-of-scope, numbered requirements R1..Rn
├─ G  Glossary            project-specific terms: definition, where they are load-bearing, aliases
├─ 01 Concept             design principles P1..P5 (weighted priorities) + concept model
│                         (entities/flows/invariants in everyday words; class names forbidden)
│                         + parking lot (tech details deferred to the technical phase)
├─ 02 Trade-off Ledger    every decision: alternatives, why rejected, cost; revisions as
│                         "old belief → new evidence → new principle"
├─ 03 Technical Design    nine items (module boundaries, interface contracts, data model,
│                         state machines, error policy, stack+versions, acceptance criteria,
│                         non-functional constraints, risks), each tracing back via implements: P*
└─ 04 Amendment Log       append-only, server-maintained; who changed what, when, and with
                          whose consent; compacted into archive/ (never deleted)
```

Two rules keep it trustworthy:

- **The altitude contract.** DATUM tracks design-level change (principles, concept model, module boundaries, ownership, contracts, stack choices). It deliberately does *not* track function internals, UI tweaks, or refactors — a document that tried to track everything would rot and lose authority.
- **The consent tiers.** Core changes (requirements, principles, concept model, load-bearing terms) block until you explicitly consent, and your consenting words are stored as audit evidence. Peripheral changes apply immediately and are batch-reported. The server computes which is which — not the AI's judgment.

### The derivation chain

During the concept phase, the agent may not hand you finished structures. It must show:

```
D1 Requirement facts    cites your numbered requirements; never works from memory
D2 Tensions            which requirements conflict, which constraints bind
D3 Key insights        each tagged [fact] / [assumption] / [inference]
D4 Principle candidates 3–5 numbered principles, each naming the tension it resolves
D5 Concept model       entities/flows/invariants in everyday words — no class names
D6 Rejected routes     at least one complete alternative and why it was rejected
```

You attack any step; the agent shows the ripple (which later steps change), produces the revised chain, and records the amendment. When principles are signed off, a **skeleton test** runs: a context-free subagent receives *only* your requirements and the principles, and tries to rebuild the concept model. If it can't, the principles were decoration, not a skeleton.

### The phases, and how your participation fades

```
your involvement
high │  co-create: challenge derivation steps, adjudicate forks, sign off   ← CONCEPT
mid  │        decide only: multiple-choice menus                            ← TECH
low  │              be informed; adjudicate only on conflicts              ← HANDOFF / STEWARD
     └──────────────────────────────────────────────────────────────▶ time
          the agent carries derivation, execution, memory, and discipline throughout
```

- **CONCEPT** — you and the agent co-create. One candidate by default; 2–3 full derivation chains only at genuine forks.
- **TECH** — the agent elaborates the nine technical items; you answer decision menus (option + recommendation + reasoning + cost of being wrong). The deliverable's concreteness bar: *a plan/build phase receiving it makes no further design decisions.*
- **HANDOFF** — the server snapshots `handoff.md`, ready for your usual plan/build workflow.
- **STEWARD** — from then on, in *every* session (see below).

### STEWARD: how residency actually works

"Resident" means three concrete things, not one:

1. **SessionStart hook** (mechanical). `hooks/hooks.json` registers a session-start command. If `.keel/DATUM.md` exists in the working directory, the hook prints a *verbatim excerpt* of DATUM (goal, out-of-scope, requirements, principles, top glossary terms, last amendments) which the host injects into the new session's context. This is not an AI summary and cannot hallucinate — it is sliced by code from the document itself.
2. **Skill trigger** (behavioral). The skill's description tells the host to load the Keel protocol whenever `.keel/DATUM.md` exists, which activates the behavioral rules: run the pre-edit check, stop on conflicts, offer amend/drop/exempt.
3. **MCP server** (mechanical backstop). Even if both of the above fail, DATUM writes only go through the server, which stages core changes until consent arrives. Divergence without a paper trail is not possible through the supported path.

## A worked example

You: `/keel I want to send selected text to an AI, and follow-ups should be able to refer back to earlier selections`

The agent extracts numbered requirements (R1 select-and-ask, R2 follow-ups can refer back), confirms them with you, then derives:

```
D2  Tension: "the current selection" is instantaneous; "conversation context"
    is persistent — different lifecycles.
D3  Insight [assumption]: a selection belongs to the conversation context,
    not to a single request.
D4  P1: user actions mutate context; they never fire requests directly.
    P2: the conversation is the single authoritative source of context.
D5  user action → context event → conversation state → request
D6  Rejected: building the prompt directly and sending it — on follow-up,
    "what I selected earlier" is already gone.
```

You: *"D3 is wrong — selections expire; stale ones shouldn't be referenced."*

The agent shows the ripple (D3 becomes a lifecycle-carrying context event → P2 gains an expiry rule → the model gains an expiry flow), asks for consent, and records the revision in the ledger. Note what never appeared: a single class name or tech choice — yet the design materially changed, and the change is on the record.

Later, in an unrelated session: *"add merge-multiple-selections-into-one-question"*. The digest is already in context; the pre-edit check flags that this touches P2 and contract C3; the agent stops and offers: amend DATUM (with ripple) / drop / explicit exemption. Requirements don't erode silently — that's the whole point.

## Installation

**Prerequisite**: Node.js ≥ 18 (the MCP server has zero npm dependencies).

### From the plugin marketplace (recommended — Claude Code, ZCode, and compatible hosts)

This repository doubles as its own plugin marketplace, so it installs exactly like marketplace plugins such as Superpowers:

```bash
claude plugin marketplace add maxi3777/Keel
claude plugin install keel@keel-marketplace
```

Inside an interactive session the same steps are slash commands: `/plugin marketplace add maxi3777/Keel`, then `/plugin install keel@keel-marketplace`. (On hosts with a different command syntax, e.g. `$plugin`, the same two operations apply; the plugin name is `keel`.)

Installing the plugin registers all three components at once:

- the **MCP server** (`.mcp.json` → `node mcp/server.js`, resolved relative to the plugin root),
- the **skill** (`/keel` on slash-command hosts; the skill description also auto-triggers resident STEWARD mode whenever `.keel/DATUM.md` exists),
- the **SessionStart hook** (`hooks/hooks.json`, with `$CLAUDE_PLUGIN_ROOT` expanded by the host).

To update later: `claude plugin marketplace update keel-marketplace` followed by reinstalling, or simply pin a ref when adding the marketplace (`maxi3777/Keel@v1.0.0`).

Optionally, verify the mechanical layer end-to-end on a clone:

```bash
git clone https://github.com/maxi3777/Keel.git
node Keel/tests/smoke.js     # expect: SMOKE PASS
```

### Other MCP-compatible hosts (manual wiring)

1. **MCP server** — add to your *project's* `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "keel": { "command": "node", "args": ["/absolute/path/to/Keel/mcp/server.js"] }
     }
   }
   ```

2. **Skill** — copy or symlink `skills/keel/` into your host's skills directory.

3. **Session hook (STEWARD bootstrap)** — register `node /absolute/path/to/Keel/hooks/session-start.js` as a session-start command. Without hook support, the skill falls back to calling `keel_digest` at session start — you lose automatic injection, not enforcement (writes remain server-gated).

**Verify**: in a scratch directory, tell your agent `/keel test project` — you should see `.keel/DATUM.md` created and a confirmation request for extracted requirements. `/keel status` should report `phase=concept`.

## Usage by phase and scenario

### Starting a new design

Type `/keel <what you want>`. Confirm the extracted requirements. Answer the derivation chain by attacking steps (D1–D6) — that is the entire job. Attack early steps when you disagree with the framing; attack D3 `[assumption]` items when you doubt the facts.

### Iterating during the concept phase

`/keel iterate <technique>` with one of: `assumption stress-test`, `alternative insight generation`, `constraint-relaxation probe`, `skeleton test`. Every invocation declares its prediction first and records the deviation after — iterations stay auditable and altitude-capped (tech-level outputs go to the parking lot, keeping the concept document simple).

### Signing off: G1

When the concept converges, you sign off the principles *in their priority order*, the mechanical gate runs, and the skeleton test tries to rebuild the concept model from principles alone. Passing all of this unlocks the technical phase — the server refuses to advance otherwise.

### The technical phase: decide, don't read

You will be shown decision menus only. Choices are ledgered automatically. When all nine items are filled (each tracing to principles), you review a summary, G2 passes, and `handoff.md` is snapshotted — feed it to your usual plan/build workflow.

### Any later session (STEWARD)

You just work. The digest is in context automatically. When a task touches the design level, the agent stops at the conflict and offers amend / drop / exempt. Useful commands:

- `/keel status` — phase, gates, pending proposals, batch notification of peripheral changes, health summary.
- `/keel check <change>` — "would this touch the design level?" (traceability closure).
- `/keel amend` — propose a design-level change yourself.
- `/keel reconcile` — audit the code against DATUM contracts; drift is labeled *stale document* vs *rogue code*.
- `/keel digest` — re-show the excerpt at any time.

### Maintenance

When the amendment log grows, `keel_status` suggests compaction: the agent merges superseded entries into summaries, the server archives the raw log verbatim under `.keel/archive/` (never deleted). The health summary reports core-amendment frequency and an **oscillation** count (positions revised back and forth ≥2 times) — both are *reference metrics*: Keel deliberately never thresholds on them.

## How enforcement actually works

| Layer | Mechanism | Guarantee |
|---|---|---|
| Skill | behavioral protocol | guides the agent (best-effort; prompts decay) |
| Hook | SessionStart injection | every session starts with the verbatim design excerpt |
| MCP server | sole legal write path | core writes staged until consented; peripheral writes auto-escalate when their traceability closure touches core; phase advances blocked until gates pass; append-only log with consent evidence |

The division of labor is an axiom of this project: **the AI produces semantics (what to write); code performs every deterministic action (where it lands, in what format, with which checks).**

## Research background and references

Keel condenses two rounds of survey-and-experiment research on agent problem-solving policy and self-driven design improvement (46 + 48 works surveyed; 384-round controlled iteration experiments). The mechanisms below are drawn from that work and from the papers listed; where Keel's use differs from the paper's original flow, the difference is deliberate.

| Reference | Venue / link | What Keel draws on | Deliberate differences |
|---|---|---|---|
| Huang et al., *When Can LLMs Actually Correct Their Own Mistakes?* | TACL 2024 · [arXiv:2406.01297](https://arxiv.org/abs/2406.01297) | Self-correction works only with external signals | Keel operationalizes the "signal" as the skeleton-test subagent rebuild and code-vs-DATUM reconciliation, not tool feedback on answers |
| Shinn et al., *Reflexion* | NeurIPS 2023 · [arXiv:2303.11366](https://arxiv.org/abs/2303.11366) | Persisted verbal self-reflection across trials | Keel persists design-level reflections as ledgered revisions with consent and ripple, not free-form memory strings |
| Madaan et al., *Self-Refine* | NeurIPS 2023 · [arXiv:2303.17651](https://arxiv.org/abs/2303.17651) | Iterative self-feedback structure | Used only with an external record (prediction vs deviation); plain self-refinement without a signal is not trusted |
| Agrawal et al., *GEPA* | ICLR 2026 · [arXiv:2507.19457](https://arxiv.org/abs/2507.19457) | Reflective candidate evolution with Pareto retention | Keel borrows reflect-then-revise only; adds prediction declaration; invocation is manual, never an autonomous outer loop |
| Zhang et al., *ACE (Agentic Context Engineering)* | ICLR 2026 · [arXiv:2510.04618](https://arxiv.org/abs/2510.04618) | Evolving context with delta updates and compaction | Keel compacts the amendment log but never deletes raw history (archive/), adds human notification, and promotes entries by reuse |
| Nguyen et al., *RSEA* | 2026 · [arXiv:2606.28374](https://arxiv.org/abs/2606.28374) | Held-out keep-better monotonic selection | Keel replaces the numeric objective with priority-tension escalation to the user (principles are weighted priorities, so "better" is the user's call) |
| Ye et al., *ReEvo* | NeurIPS 2024 · [arXiv:2402.01130](https://arxiv.org/abs/2402.01130) | "Verbal gradients" from failures guiding the next candidate | Keel's supersedes chains record the same knowledge; the oscillation statistic built on them is new |
| Liu et al., *EoH (Evolution of Heuristics)* | ICML 2024 · [arXiv:2401.12137](https://arxiv.org/abs/2401.12137) | Thought/artifact co-evolution in a population | Keel keeps a population only as the rejected-alternatives archive (D6), re-opened when assumptions change; no automated evolution |
| Romera-Paredes et al., *FunSearch* | Nature 625 (2024) · [paper](https://www.nature.com/articles/s41586-023-06924-6) | Program databases retaining best candidates | Same keep-the-best archive semantics, applied to design derivations rather than programs |
| Google DeepMind, *AlphaEvolve* | 2025 · [arXiv:2506.13131](https://arxiv.org/abs/2506.13131) | Evolutionary database with lineage | Lineage → the amendment log; the evolution loop itself is out of scope |
| Hu et al., *Darwin Gödel Machine* | ICLR 2026 · [arXiv:2505.22954](https://arxiv.org/abs/2505.22954) | Archive-based open-ended self-improvement | Archive concept only; Keel contains no self-referential self-modification |
| Zhao et al., *ExpeL* | AAAI 2024 · [arXiv:2308.10144](https://arxiv.org/abs/2308.10144) | Experience distillation into reusable insights | Considered; deferred beyond v1 (the revision log is the minimal experience layer) |
| Wang et al., *Agent Workflow Memory* | 2024 · [arXiv:2409.07429](https://arxiv.org/abs/2409.07429) | Workflow induction into memory | Considered; deferred beyond v1 |
| Rodriguez-Ordoñez et al., *Magentic-One* | 2024 · [arXiv:2411.04468](https://arxiv.org/abs/2411.04468) | Dual task/progress ledgers in an outer loop | Rejected: DATUM is deliberately the single ledger |

Internal evidence that shaped the mechanics (not from papers): in the authors' 384-round controlled experiments, unstructured iteration collapsed in rounds 3–4 twice while structured runs had zero collapses — the direct motivation for mechanical enforcement (hooks/server) instead of prompt discipline.

## Limitations and non-goals

- Keel is for **deep participants**. If you only rubber-stamp, the concept phase becomes theater.
- Below a complexity bar, the ceremony outweighs the value; the agent should say so, or you should use a lighter flow.
- Single design authority: v1 does not handle multiple agents concurrently authoring one DATUM.
- No autonomous design evolution: Keel deliberately does not run unattended outer loops that mutate designs.
- The full specification, including failure modes and the research-provenance table, is in [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

## Development

```bash
node tests/smoke.js   # end-to-end: spawns the real server, drives init → consent → gates → handoff → compaction
```

Repository layout: `.claude-plugin/` (plugin + marketplace manifests) · `mcp/server.js` (server) · `skills/keel/SKILL.md` (agent protocol) · `templates/DATUM.md` · `hooks/` (session bootstrap) · `docs/PROTOCOL.md` (specification) · `tests/smoke.js`.
