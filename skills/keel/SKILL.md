---
name: keel
description: An authoritative notebook for the AI — a DATUM recording the project's requirements and concept model so the topic is never forgotten or silently drifted from across sessions, plus tracked hash-pinned protected references. Use whenever the user mentions Keel, and whenever the working directory contains .keel/DATUM.md. After finishing a plan and before implementing, check it against the DATUM digest; propose amendments when you disagree or when reality has diverged.
---

# Keel — Authoritative Notebook

Keel is your notebook ("The palest ink is better than the best memory"). It records what must not be forgotten or silently changed — requirements (00), the concept model with weighted principles (01), load-bearing terms (G, the glossary), protected documents (R) — and keeps it authoritative. Beyond the guarded record and the glance habit, Keel does not direct how you think or work.

## Iron rules

1. **Semantics are yours; determinism belongs to the server** (the process behind the `keel_*` tools). Every write under `.keel/` goes through `keel_*` tools — never edit the files by hand. Reads go through `keel_read` / `keel_digest`; AMENDMENTS.md (the audit log) may be read directly.
2. **Write for the whole lifecycle.** Every line that enters the DATUM or the amendment log must be intelligible in any later session, to a reader who does not have this conversation's context: no private abbreviations, no shorthand only the current dialogue makes readable, no coined term left unregistered (rule 5). A line that needs "you had to be there" is not finished. Clarity is the bar — the server enforces no quantity checks.
3. **The glance habit.** After you finish a plan and before implementing, read the digest (a verbatim mechanical excerpt of the DATUM) and check the plan against it. On conflict: propose an amendment, drop the change, or — with the user — record an explicit exemption (`keel_exempt`, reason required). Silent divergence is forbidden. Disagreeing with the DATUM is legitimate: propose the change with rationale; the notebook is authoritative, not sacred.
4. **Modes.** While `phase=draft` you write freely — writes apply immediately, logged `ai-managed`. When you judge the essentials recorded in language that survives the session (rule 2), declare the DATUM authoritative yourself: `keel_config {authoritative:true}` — one-way, and **announce it to the user at that moment**: both switches take effect, default ON. `keel_config {consent, steward}` flips them on request: consent OFF = you self-manage writes (still logged, ai-managed); steward OFF = only the glance habit remains. Flipping never requires re-validation — the user decides.
5. **Terms**: name a load-bearing concept from its purpose, in the user's vocabulary where possible, and register it via `keel_glossary_register` in the same turn it first appears. When one word carries two meanings, the glossary row is the arbiter: cite it and resolve the conflict on the spot.
6. **Oscillation is a reference metric only** — how often one position is amended by overturning earlier amendments (≥2 reversals at the same position since the last compaction); never a threshold, never a gate; always label it as such when presenting.
7. **Two protection mechanisms, matched to the object**: DATUM core writes = consent-gated while consent is on; protected references = tamper-evidenced (SHA-256 verify — report, never block); everything else = unprotected. Respond at the matching strength: stage and ask for DATUM core, report mismatches for refs, write freely elsewhere.

## Operating notes

- One skill, natural language: the user describes what they want (starting the notebook, status, a change, a check, protecting a document) and you map it to tools. There are no slash subcommands.
- Starting a notebook: `keel_init {project}` (project = display name in the DATUM title); `notebook:true` for a pure-notebook project (both switches stay off).
- Read `references/notebook.md` when authoring or amending the DATUM (drafting, activation, modes, consent flow, terms, protected references).
- Read `references/steward.md` for the glance / post-plan check protocol, session bootstrap, and maintenance.
- Iteration tools are separate skills (`keel-stress-test`, `keel-alternatives`, `keel-relax-probe`, `keel-skeleton`); adopted findings come back through this module's write path.
