# Keel

**An authoritative notebook for your AI agent: the project's requirements and concept model, recorded once and guarded against silent drift across sessions — while leaving the AI maximum freedom in how it thinks and works.**

> The palest ink is better than the best memory. Keel gives the agent that pen, and makes sure what lands on paper cannot silently change.

Keel is a plugin for Claude Code, ZCode, Codex CLI, and other MCP-compatible hosts: a zero-dependency Node.js MCP server, one main skill, four iteration sub-skills, and a session hook. It directs no workflow — the AI thinks and plans freely. The only ritual is the glance: after planning, before implementing, check the plan against the notebook (**match, don't bulk-read; a provably unrelated plan reads nothing and says so**).

**中文说明见 [README-zh.md](README-zh.md)。**

## Why

AI-assisted development has a memory problem, not a thinking problem. The agent plans brilliantly — then ten sessions later has quietly forgotten the goal, drifted from the agreed concept, or rewritten a settled decision. The conversation is a terrible storage medium.

Keel guards exactly two things:

1. **The topic does not degrade.** Requirements are pinned the moment you state them; the concept model (weighted principles, entities, invariants) is recorded in your own words. Nothing below that altitude is guarded at all.
2. **Promises do not silently change.** Once a page is declared authoritative, core amendments wait for your explicit consent — your words stored as audit evidence — unless you switch that off and let the AI self-manage.

Everything else — how the AI reasons, plans, structures work — is intentionally free. Keel records outcomes, never process.

## The notebook

```
.keel/
├─ DATUM.md       root page (plain markdown, free to read): 00 Intent — goal /
│                 scope with reasons / numbered requirements R-n · 01 Concept —
│                 weighted principles P1..Pn (order = priority) · decisions D-n ·
│                 concept model as Entity/Flow/Invariant lines · open questions
├─ INDEX.md       server-maintained routing table: pages (path / covers /
│                 lastAmend watermark) + protected references
├─ pages/
│  ├─ terms.md    global glossary (one vocabulary across all pages)
│  └─ <module>.md module pages: module-scoped requirements + concept model,
│                 decisions, open questions (no P-n — priorities are global)
├─ AMENDMENTS.md  one global append-only history: what changed, when, with whose
│                 consent; compacted into archive/ (never deleted)
└─ archive/ · state.json
```

The membership criterion is *non-degradability*: the notebook records design-level facts only — a document that tried to guard everything would rot and lose authority. Claim ids (`R-n`, `P-n`, `D-n`) are globally unique across all pages; the server enforces it.

## How it works

### Per-page phases

Phases are per page — a finished module can be guarded while an unfinished one keeps writing freely:

```
each page:  draft ──(the agent declares this page's essentials recorded:
            keel_config {authoritative:true, page})──▶ authoritative
            one-way per epoch; reopen ({phase:"draft", page}) is user-directed:
            snapshot archived, pending proposals dropped, reverse ripple reported

project switches (active while any page is authoritative; default ON):
  consent  ON — core writes staged until you consent / OFF — AI self-manages (logged)
  steward  ON — structured post-plan check              / OFF — the glance habit alone
```

While a page is draft, the AI writes it freely — every change logged, never a question. When it judges a page complete, in language that survives the session, it declares that page authoritative itself and **announces that to you at the moment**. `keel_config {consent, steward}` flips either switch anytime, in either direction, no re-validation; a pure-notebook project (`keel_init {notebook:true}`) starts with both off.

### The glance

After planning, before implementing, the agent checks the plan against the **root pins** (goal, scope, requirements, principles, invariants, decisions — the lines any session could violate) plus the **INDEX covers** (stable anchors: repo paths, glossary terms, claim ids), then reads only the matched pages. Zero matches → one line, proceed. Conflict → amend / drop / explicit exemption. Disagreement with the notebook itself → propose an amendment — the notebook is authoritative, not sacred.

The timing is deliberate: the check comes *after* planning, so it never constrains how the agent thinks — only what it commits to.

### Consent tiers (while consent is ON)

- **Core** (authoritative surfaces: page content, terms citing authoritative claims, protected references, routing metadata): rationale + ripple shown → your explicit consent → applied, your consenting words stored as evidence.
- **Peripheral** (open-question notes and other non-core content): applied immediately, batch-reported.

Which is which is computed by the server via traceability closure, not by the AI's judgment. A staged proposal is refused at confirm if its target changed underneath (anti-clobber), and one logical change across sections is one batched proposal: one consent, one audit row.

The server enforces presence checks, the parser's line formats, and mermaid well-formedness — and nothing else: no numeric quality gates. Quality is governed by the **lifespan-clarity rule**: every recorded line must be readable in any later session without the current conversation.

### Protected references

Your other documents (an API spec, an architecture note, a generated mental model) can be admitted into the anti-degradation scope: Keel records the whole-file SHA-256 and re-verifies on demand (`carries` = the claim ids or pages the document renders; optional — a document can be protected for its own sake). Protection is tamper-*evidence*, not write-gating: the owning workflow edits freely; divergence is detected and reported, never blocked. When a core amendment lands, Keel reports which protected documents are now suspected stale.

### Iteration sub-skills

Four standalone thinking tools, split from the main skill so they can be invoked directly:

| Skill | What it does |
|---|---|
| `keel-stress-test` | Attack the stated assumptions with hard scenarios (declare predictions first) |
| `keel-alternatives` | 2–3 genuinely different solution directions for a fork |
| `keel-relax-probe` | Which constraint, if relaxed, unlocks a better design — and what it costs |
| `keel-skeleton` | Rebuild the concept model from 00 + P\* alone; low coverage means the principles are decoration |

All four work with or without a notebook (skeleton requires one), keep temp files only in the system temp directory and delete them when done, and feed adopted findings back through the main module's write path.

### Enforcement layers

| Layer | Mechanism | Guarantee |
|---|---|---|
| Skill | behavioral protocol (glance, stop-on-conflict, announce activation) | guides the agent (best-effort; prompts decay) |
| Hook | SessionStart digest injection, PostToolUse refresh | every session starts with a verbatim, code-sliced excerpt of the notebook |
| MCP server | sole legal write path | core writes staged until consented; closure-based escalation; anti-clobber; append-only log with consent evidence |

The division of labor is an axiom: **the AI produces semantics; code performs every deterministic action.** On hosts without hooks, the skill calls `keel_digest` itself at session start and after confirmations.

## Installation

**Prerequisite**: Node.js ≥ 18 (zero npm dependencies).

### Plugin marketplace — Claude Code, ZCode, compatible hosts

This repository doubles as its own plugin marketplace, so it installs like any marketplace plugin:

```bash
claude plugin marketplace add maxi3777/Keel
claude plugin install keel@keel-marketplace
```

Inside an interactive session the same steps are slash commands (`/plugin marketplace add maxi3777/Keel`, then `/plugin install keel@keel-marketplace`). To update later: refresh the marketplace and reinstall, or pin a ref when adding (`maxi3777/Keel@v2.3.0`).

Optionally verify the mechanical layer on a clone:

```bash
git clone https://github.com/maxi3777/Keel.git
node Keel/tests/hostcompat.js   # packaging gate vs the host contract
node Keel/tests/smoke.js        # expect: SMOKE PASS
```

### Codex CLI

```bash
node adapters/codex/install.js     # --uninstall to remove
```

Copies the five skills to `~/.codex/skills/`, appends `[mcp_servers.keel]` to `~/.codex/config.toml`, and registers the SessionStart/PostToolUse hooks in `~/.codex/hooks.json`. One-time: review the hooks via `/hooks` — Codex skips untrusted hook definitions. Validated end-to-end with codex-cli 0.153.4.

### Other MCP-compatible hosts

Add the server to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "keel": { "command": "node", "args": ["/absolute/path/to/Keel/mcp/server.js"] }
  }
}
```

Then copy or symlink each directory under `skills/` into your host's skills directory. The session hook is optional — without it, the skill calls `keel_digest` itself.

**Verify**: in a scratch directory, tell your agent *"use keel to start a test project"* — you should see `.keel/DATUM.md` created, free writes while draft, and the activation announcement once the agent declares the notebook complete.

## Usage

No slash subcommands — one skill, natural language:

- **Start** — *"use keel to record this project"* → init, requirement extraction, free authoring while draft, per-page activation announcements.
- **Work** — nothing to say; the glance happens by itself. When a plan conflicts with the notebook, the agent stops and offers amend / drop / exempt. Example: the agent plans *merge several selections into one question*, glances, finds it touches P2 (*the conversation is the single authoritative source of context*), and stops with the three options instead of quietly proceeding.
- **Grow into modules** — *"give the orders module its own page"* → `keel_page_add` (+ covers); routing and the zero-match rule take care of the rest.
- **Rework a module** — *"redo the orders page"* → reopen that page (snapshot, batch-draft, reverse ripple), then re-declare when stable.
- **Adjust trust** — *"turn consent off"* / *"turn steward on"* → `keel_config`, either direction, no re-validation.
- **Protect documents** — *"protect this architecture doc"* → `keel_ref_add` (+ verify on demand).
- **Check in and maintain** — *"keel status"* → `keel_status` (phases, switches, pending proposals, health — all reference metrics, never thresholds). When the amendment log grows, the agent compacts it (raw log archived verbatim, never deleted). After major rework, a compaction, or a long absence, run a periodic audit: `keel_refs_verify` plus a notebook-hygiene pass.

## Limitations

- Keel guards **the topic, not the process**. For guaranteed deliverable concreteness, get it from your plan/build workflow and protect its output via `keel_ref_add`.
- Consent is only as meaningful as your attention — but there is no phase pipeline to rubber-stamp: either you are asked for twelve words, or you have explicitly opted out.
- Single design authority: concurrent authoring of one notebook is serialized by the anti-clobber check at confirm time (the later proposal is refused and re-proposed).
- No autonomous evolution: Keel never runs unattended loops that mutate the design.

## Development

```bash
node tests/hostcompat.js   # packaging gate vs the host contract
node tests/smoke.js        # end-to-end: draft → declaration → consent → modules → refs → maintenance
```

Layout: `.claude-plugin/` (plugin + marketplace manifests) · `mcp/server.js` · `skills/keel/` (main skill + `references/`) · `skills/keel-stress-test|keel-alternatives|keel-relax-probe|keel-skeleton/` · `templates/` · `hooks/` · `adapters/codex/` · `docs/PROTOCOL.md` (spec) · `docs/MENTAL-MODEL.md` · `tests/`.

## References

Keel condenses two rounds of survey-and-experiment research on agent self-improvement (46 + 48 works surveyed; 384-round controlled experiments, in which unstructured iteration collapsed twice while mechanically structured runs never did — the direct motivation for enforcement by hooks and server rather than prompt discipline). The mechanisms Keel actually uses trace to a short list of those works: the stress-test to the failure-clustering lineage (ExpeL, Self-Harness), the alternatives skill to the novelty-gate lineage (ShinkaEvolve), the rejected-route archive and supersedes chains to EoH and ReEvo, log compaction to ACE, and the glance and skeleton test to the external-signal principle (Huang et al.) — the skeleton test itself is original to Keel, and the constraint-relaxation probe has no direct ancestor in the surveyed corpus. The rest of the corpus informed what Keel deliberately rejects: autonomous outer loops, workflow induction, numeric keep-better gates.

1. Huang et al. *When Can LLMs Actually Correct Their Own Mistakes?* TACL, 2024. [arXiv:2406.01297](https://arxiv.org/abs/2406.01297)
2. Shinn et al. *Reflexion: Language Agents with Verbal Reinforcement Learning.* NeurIPS, 2023. [arXiv:2303.11366](https://arxiv.org/abs/2303.11366)
3. Madaan et al. *Self-Refine: Iterative Refinement with Self-Feedback.* NeurIPS, 2023. [arXiv:2303.17651](https://arxiv.org/abs/2303.17651)
4. Zhao et al. *ExpeL: LLM Agents Are Experiential Learners.* AAAI, 2024. [arXiv:2308.10144](https://arxiv.org/abs/2308.10144)
5. Shanghai AI Laboratory. *Self-Harness: Harnesses That Improve Themselves.* 2026. [arXiv:2606.09498](https://arxiv.org/abs/2606.09498)
6. Sakana AI. *ShinkaEvolve: Towards Open-Ended and Sample-Efficient Program Evolution.* ICLR, 2026. [arXiv:2509.19349](https://arxiv.org/abs/2509.19349)
7. Liu et al. *Evolution of Heuristics: Towards Efficient Automatic Algorithm Design Using Large Language Models.* ICML, 2024. [arXiv:2401.02051](https://arxiv.org/abs/2401.02051)
8. Ye et al. *ReEvo: Large Language Models as Hyper-Heuristics with Reflective Evolution.* NeurIPS, 2024. [arXiv:2402.01145](https://arxiv.org/abs/2402.01145)
9. Zhang et al. *Agentic Context Engineering.* ICLR, 2026. [arXiv:2510.04618](https://arxiv.org/abs/2510.04618)

## License

[MIT](LICENSE) © 2026 maxi3777
