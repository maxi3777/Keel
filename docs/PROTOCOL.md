# Keel Protocol — v2.2.0

> Keel is the AI's **authoritative notebook**. It records requirements, decisions, invariants and the concept model, keeps them from silently degrading, and otherwise leaves the agent free. There is no workflow to direct, no phase pipeline, no numeric gates, no handoff bundle. The agent thinks and plans autonomously; the only ritual is the glance — *after planning, before implementing, check the plan against the notebook; match, don't bulk-read; zero matches → say so and proceed.*

## 1. Axioms

1. **Semantics belong to the AI; determinism belongs to the server.** Every `.keel/` write goes through `keel_*` tools; hand edits are forbidden and the amendment log is server-owned. **Reads are free**: the notebook files are plain markdown — open them directly; `keel_digest` is the map, not the gate.
2. **Record outcomes, never process.** The notebook holds what was decided (requirements, principles, decisions, invariants, concept model), not how the agent reasoned. Nothing constrains the agent before it commits.
3. **Authority is bounded and switchable.** The DATUM is the single authoritative record *of its altitude* (non-degradable design facts). Consent and stewardship are switches the user controls freely — flipping either way never requires re-validation.
4. **Anything programmable is code.** File creation, validation, tiering, hashing, slicing, logging — never delegated to the model.
5. **Clarity over counters.** The server enforces no quantity checks; it enforces presence (a summary, a rationale for core, consent evidence, an exemption reason), the line formats the parser depends on, and the well-formedness of mermaid blocks (fence/bracket/quote balance — syntax, never semantics). Quality is the skill's **lifespan-clarity rule**: every recorded line must be intelligible in any later session without the current conversation.

## 2. File layout (protection mechanisms)

```
consent-gated (before the fact)   DATUM.md core — while consent is ON
tamper-evidenced (after the fact) R Protected References (SHA-256-verified)
unprotected                       everything else
```

- `.keel/DATUM.md` —
  - `00 Intent`: goal (one sentence) · success criteria · out of scope **with its reason** · numbered requirements `- Requirement R1..Rn:` (a constraint is a requirement phrased as a boundary — same format, no separate namespace).
  - `G Glossary`: term / concept-level definition / load-bearing at / aliases / status.
  - `01 Concept`: weighted principles `- P1: …` (priority = list order, typically 3–5) · decisions `- Decision D1: <choice> — because <reason> — revisit if <condition>` · the concept model — a short prose preamble plus addressable lines `- Entity: …`, `- Flow: …`, `- Invariant: …` (everyday words, no class names; assumptions tagged `[assumption]`) · open questions `- OPEN: <question> — blocks <id> — default: <safe interim choice>`. Mermaid blocks are allowed as **projections of the prose, never replacements**; the server checks their fence/bracket/quote balance on write.
  - `R Protected References`: ref / path / carries / sha256 / admitted / status; default ids `REF1..`, server-managed table; `carries` may be empty when the document is protected for its own sake.
- `.keel/AMENDMENTS.md` — append-only: `# / time / tier / location / summary / supersedes / consent`. Consent values: `yes ("…")` (user's words), `batch-notified` (peripheral), `ai-managed` (draft phase or consent OFF), `exempted`. Compacted into `archive/amendments-<n>.md` (verbatim, never deleted).
- `.keel/state.json` — `phase` (`draft`|`authoritative`) · `consentMode` · `stewardMode` · `proposals` (staged) · `seq` counters · `coreCount` (lifetime, survives compaction).
- `.keel/archive/`.

## 3. Modes and activation

- **draft**: the DATUM has not been declared authoritative. All writes apply immediately; would-be-core writes are logged `ai-managed`. The consent mechanism and the steward switch are inactive by design (the glance habit still applies).
- **Activation**: the agent's explicit, one-way declaration — `keel_config {authoritative:true}` — made when it judges the essentials recorded in language that survives the session. Both switches take effect at that moment, default ON (a `notebook:true` init keeps both OFF). The config result carries `activated` with the switch states and instructs the agent to **announce the activation to the user**. Activation is never a side-effect of a write; there is no readiness formula, no count thresholds.
- **Switches**: `keel_config {consent, steward}` — booleans, effective only while authoritative. consent OFF ⇒ all writes immediate, logged `ai-managed`. steward OFF ⇒ only the glance habit. Flipping is the user's call, in either direction, with no re-validation. Pending proposals survive flips — confirm or `keel_reject` them as usual.

## 4. The write path (cross-cutting)

```
intent → keel_write_section (single or sections-batch)
  → mechanical validation (known section · no amendments writes · no direct
    refs-table writes — keel_ref_add/keel_ref_remove only · no duplicate
    section in batch · content non-empty · no "## " inside sections ·
    mermaid fence/bracket/quote balance · summary non-empty; core requires
    a non-empty rationale — presence, not length; no numeric gates)
  → closure scan (glossary load-bearing column · refs carries column;
    matches of core refs touch core) → peripheral w/ non-empty closure
    escalates to core
  → if peripheral OR consent inactive → apply immediately + audit row
  → else stage PR-n (per-section baseContent snapshot) → user consent →
    keel_confirm(consent_evidence — the user's words, quoted to 40 in the row)
  → anti-clobber: any section changed since staging ⇒ confirm refused with
    recovery instructions (keel_reject, re-propose)
  → apply → audit row (+lifetime core counter if tier contains core)
  → staleRefs: protected refs whose carries intersect this change's core refs
    (computed against the pre-apply snapshot) returned to the agent to relay
```

`content` replaces the **entire** section — the protocol is read-then-merge (reads are free; the files are plain markdown). Batch = one logical change across sections: one consent, one audit row. The consent-economy rule (skill-level): stage first; if the staged `closure` is empty and the user's message specified the change verbatim, that message may serve as `consent_evidence` for an immediate confirm; non-empty closure ⇒ show the ripple and get fresh consent (admitting a protected reference with carries always has non-empty closure; one without carries has empty closure — protecting a file for its own sake).

`keel_glossary_register` computes its tier from `load_bearing` (core refs ⇒ core) and rejects `|` in term/definition. `keel_ref_add` / `keel_ref_remove` are core-tier while consent is active (they move the protection boundary) and reject `|` in path/carries.

## 5. The glance and the post-plan check (STEWARD)

- **Glance (always, every mode)**: after finishing a plan, before implementing — check the digest against goal/scope/requirements/principles/invariants/decisions. **Match, don't bulk-read**: name what the plan touches; open the DATUM only when a match needs surrounding context. **Zero matches** → one line saying so, then proceed. No conflict → proceed. Conflict → amend / drop / `keel_exempt` (reason required). Disagreement with the DATUM → propose an amendment with rationale.
- **Post-plan check (steward ON)**: the same moment, structured — compare the plan against every digest item, then go deeper on the ones touched; `keel_ripple` when involvement is uncertain; relay `staleRefs`; escalate principle tensions to the user (three exits: adjust the weights = reorder P* lines / revise the plan / revise the principle). New requirements diff against 00 first; scope growth becomes a visible proposal, never silent absorption.
- **Residency mechanics**: SessionStart hook injects the verbatim digest (strict-JSON `additionalContext`; doc pointer first, mode line, goal/scope/requirements, P*/invariants/decisions, top 6 terms, top 6 refs, last 3 amendments, match reminder); PostToolUse hook refreshes after every confirm; hook-less hosts call `keel_digest` themselves. Hooks resolve the project directory from the payload `cwd` when the host provides it. Both hooks drain stdin (timer-guarded) and stay silent on any failure.

## 6. Protected references

Write-then-admit: the owning workflow edits freely; `keel_ref_add {path, carries?}` pins the whole-file SHA-256 at admission (core-tier while consent is active; default id `REF<n>`; `carries` optional — the core claims the document renders, if any); `keel_refs_verify` re-hashes — report, never block; after intentional regeneration, re-admit (remove + add). Core amendments return `staleRefs` for affected refs; regeneration belongs to the owning workflow — Keel detects, never regenerates.

## 7. Maintenance and health

- `keel_status` — phase, switches (configured + effective), section counts, pending proposals, batch notifications, health summary.
- Health (inside `keel_status`) — epoch count (since last compaction; labeled) + lifetime count; yellow flag above 6 epoch core amendments (advisory text only); oscillation (≥2 overturns at one position) is a reference metric only — never a threshold, never a gate.
- `keel_clean` — removes orphan `## ` blocks (misplaced headings; the amendment-log row records titles only).
- `keel_compact` — refused below 5 rows (maintenance tier); the AI supplies merged summaries; the raw log is archived verbatim; the lifetime core counter survives.
- `keel_exempt` — explicit waiver, reason required (presence, not length).
- **Periodic audit (trigger-based; recommended in the README)**: after major rework, after a compaction, or after a long absence — `keel_refs_verify`, plus notebook hygiene: every Entity referenced by some Flow/Invariant, every Invariant checkable by a cold session, every OPEN line still open (a silently-closed OPEN is an unrecorded decision — write the Decision or Requirement it became).

## 8. Iteration sub-skills (outside the main module)

`keel-stress-test` (attack assumptions), `keel-alternatives` (2–3 genuinely different directions), `keel-relax-probe` (constraint relaxation cost/benefit), `keel-skeleton` (rebuild the concept model from 00 + P* alone; coverage = share of recorded entities/flows/invariants recovered, below ~half = decoration; fresh-process evidence preferred, self-simulation labeled). All four: declare the prediction first, record the deviation; work with or without a DATUM (skeleton requires one); temp files live in the system temp dir and are deleted after; adopted findings return through the main module's write path, if a DATUM exists.

## 9. Failure modes

Abandoned staging → visible in `keel_status`, discard with `keel_reject` · orphan `## ` blocks → `keel_clean` · protected-doc drift → `keel_refs_verify` report + regenerate + re-admit · corrupted `state.json` → conservative defaults (draft); AMENDMENTS.md is the durable history · premature declaration → at most early consent rounds; the user flips switches freely.

## 10. Research provenance

See the references table in [`README.md`](../README.md) (14 papers with deliberate-difference notes) and the research summaries in the authors' archives. The core internal evidence remains: unstructured iteration collapsed in rounds 3–4 twice in 384-round controlled experiments; structured runs had zero collapses — hence mechanical enforcement over prompt discipline. The mechanical layer is *determinism duties only* (persistence, tiering, hashing, audit); semantic judgments — completeness, quality — belong to the agent under the lifespan-clarity rule.
