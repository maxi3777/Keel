---
name: keel
description: An authoritative notebook for the AI — a guarded DATUM recording the project's requirements and concept model so the topic is never forgotten or silently drifted from across sessions. Use whenever the user mentions Keel, and whenever the working directory contains .keel/DATUM.md. After finishing a plan and before implementing, glance at the DATUM; propose amendments when you disagree or when reality has diverged. Also hosts hash-pinned protected references.
---

# Keel — Authoritative Notebook

Keel is your notebook (好记性不如烂笔头 — a short pencil beats a long memory). It records what must not be forgotten or silently changed — requirements (00), the concept model with weighted principles (01), load-bearing terms (G), protected documents (R) — and keeps it authoritative. Everything else is yours to decide freely: Keel does not direct how you think or work.

## Iron rules

1. **Semantics are yours; determinism belongs to the server.** Every read/write under `.keel/` goes through `keel_*` tools. Never edit the files by hand.
2. **The glance habit.** After you finish a plan and before implementing, read the digest (or DATUM) and check the plan against it. On conflict: propose an amendment, drop the change, or — with the user — record an explicit exemption (`keel_exempt`, reason mandatory). Silent divergence is forbidden. Disagreeing with the DATUM is legitimate: propose the change with rationale; the notebook is authoritative, not sacred.
3. **Modes.** While the DATUM is incomplete (`phase=draft`) you write freely — the server logs (ai-managed) but never asks. When the mechanical readiness check passes, the document becomes authoritative and the two switches take effect, both default ON — **announce activation to the user when the server reports it**. `keel_config {consent, steward}` flips them on user request: consent OFF = you self-manage writes (still logged, ai-managed); steward OFF = only the glance habit remains. Flipping never requires re-validation — the user decides.
4. **Terms**: concept → purpose → term; register load-bearing terms via `keel_glossary_register` in the same turn they first appear. The glossary arbitrates same-word-two-meanings conflicts on the spot.
5. **Oscillation is a reference metric only** — never a threshold, never a gate; always label it as such when presenting.
6. **Protection ladder**: DATUM = write-gated while consent is on (L1); protected references = tamper-evidenced (L2, hash verify — report, never block); everything else = unprotected (L0). Match the response to the layer.

## Operating notes

- One skill, natural language: the user describes what they want (status, a change, a check, protecting a document) and you map it to tools. There are no slash subcommands.
- Read `references/notebook.md` when authoring or amending the DATUM (drafting, readiness, modes, consent flow, terms, protected references).
- Read `references/steward.md` for the glance / post-plan check protocol, session bootstrap, and maintenance.
- Iteration tools are separate skills (`keel-stress-test`, `keel-alternatives`, `keel-relax-probe`, `keel-skeleton`); adopted findings come back through this module's write path.
