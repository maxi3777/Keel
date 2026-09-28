# Keel Protocol — v2.0.0

> v2 doctrine: Keel is the AI's **authoritative notebook**. It records requirements and the concept model, keeps them from silently degrading, and otherwise leaves the agent free. There is no workflow to direct, no phase pipeline, no gates, no handoff bundle. The agent thinks and plans autonomously; the only ritual is the glance — *after planning, before implementing, check the plan against the DATUM.*
>
> What changed from v1: TECH/HANDOFF phases, G1/G2 gates, the Contract Index (03), the Trade-off Ledger (02, folded into the amendment log's `supersedes` field), TECHNICAL.md, handoff.md, and the slash-command surface were removed. Iteration functions became standalone sub-skills. Consent and STEWARD became switchable modes. See §9 Migration.

## 1. Axioms

1. **Semantics belong to the AI; determinism belongs to the server.** Every `.keel/` read/write goes through `keel_*` tools; hand edits are forbidden and the amendment log is server-owned.
2. **Record outcomes, never process.** The notebook holds what was decided (requirements, principles, concept model), not how the agent reasoned. Nothing constrains the agent before it commits.
3. **Authority is bounded and switchable.** The DATUM is the single authoritative record *of its altitude* (non-degradable design facts). Consent and stewardship are switches the user controls freely — flipping either way never requires re-validation.
4. **Anything programmable is code.** File creation, validation, tiering, hashing, slicing, logging — never delegated to the model.

## 2. File layout (protection levels)

```
L1  write-gating (before the fact)    DATUM.md — guarded core, while consent is ON
L2  tamper-evidence (after the fact)  R Protected References (hash-verified)
L0  unprotected                       everything else
```

- `.keel/DATUM.md` — `00 Intent` (goal one-sentence · success criteria · out of scope · numbered requirements `R*`) · `G Glossary` (term / concept-level definition / load-bearing at / aliases / status) · `01 Concept` (`- P1: …` weighted principles, 3–5; concept model: entities/flows/invariants in everyday words; parking lot) · `R Protected References` (ref / path / carries / sha256 / admitted / status).
- `.keel/AMENDMENTS.md` — append-only: `# / time / tier / location / summary / supersedes / consent`. Consent values: `yes ("…")` (user's words), `batch-notified` (peripheral), `ai-managed` (draft phase or consent OFF), `exempted`. Compacted into `archive/amendments-<n>.md` (verbatim, never deleted).
- `.keel/state.json` — `phase` (`draft`|`authoritative`) · `consentMode` · `stewardMode` · `proposals` (staged) · `seq` counters · `coreCount` (lifetime, survives compaction).
- `.keel/archive/`.

## 3. Modes and readiness

- **draft**: the mechanical readiness check has not passed. All writes apply immediately; would-be-core writes are logged `ai-managed`. Consent and steward are inactive by design.
- **Readiness** (computed from content, never stored): 00 goal filled · 00 out-of-scope filled · ≥1 filled requirement · 01 principles 3–5 filled · ≥1 active glossary term.
- **Activation**: the write that completes readiness flips the phase to `authoritative`. Both switches default ON (a `notebook:true` init keeps both OFF). The server returns `activated` with the switch states and instructs the agent to **announce the activation to the user**.
- **Switches**: `keel_config {consent, steward}` — booleans, effective only while authoritative. consent OFF ⇒ all writes immediate, logged `ai-managed`. steward OFF ⇒ only the glance habit. Flipping is the user's call, in either direction, with no re-validation.

## 4. The write path (cross-cutting)

```
intent → keel_write_section (single or sections-batch)
  → mechanical validation (known section · no amendments writes · no duplicate
    section in batch · content non-empty · no "## " inside sections ·
    summary ≤120 chars; core requires rationale ≥8)
  → closure scan (glossary load-bearing column · refs carries column;
    matches of /^(P\d|01|00)/ touch core) → peripheral w/ non-empty closure
    escalates to core
  → if peripheral OR consent inactive → apply immediately + audit row
  → else stage PR-n (per-section baseContent snapshot) → user consent →
    keel_confirm(consent_evidence ≥2 chars, quoted to 40 in the row)
  → anti-clobber: any section changed since staging ⇒ confirm refused with
    recovery instructions (keel_reject, re-propose)
  → apply → audit row (+lifetime core counter if tier contains core)
  → staleRefs: protected refs whose carries intersect this change's core refs
    (computed against the pre-apply snapshot) returned to the agent to relay
  → maybe-activate readiness (draft → authoritative)
```

Batch = one logical change across sections: one consent, one audit row. The consent-economy rule (skill-level): a user message that specifies a change verbatim counts as consent only when its ripple closure is empty.

`keel_glossary_register` computes its tier from `load_bearing` (P*/01/00 ⇒ core). `keel_ref_add` / `keel_ref_remove` are core-tier while consent is active (they move the protection boundary).

## 5. The glance and the post-plan check (STEWARD)

- **Glance (always, every mode)**: after finishing a plan, before implementing — check against goal/scope/requirements/principles/concept model. No conflict → proceed. Conflict → amend / drop / `keel_exempt` (reason mandatory). Disagreement with the DATUM → propose an amendment with rationale.
- **Post-plan check (steward ON)**: the same moment, structured — enumerate touched areas, compare against P*, `keel_ripple` when unsure, relay `staleRefs`, escalate principle tensions to the user (three exits: adjust weights / revise the plan / revise the principle). New requirements diff against 00 first; scope growth becomes a visible proposal, never silent absorption.
- **Residency mechanics**: SessionStart hook injects the verbatim digest (strict-JSON `additionalContext`; doc pointer first, mode line, goal/scope/requirements, P*, top 6 terms, top 6 refs, last 3 amendments, glance reminder); PostToolUse hook refreshes after every confirm; hook-less hosts call `keel_digest` themselves.

## 6. Protected references (L2)

Write-then-admit: the owning workflow edits freely; `keel_ref_add {path, carries}` pins the whole-file SHA-256 at admission (core-tier while consent is active); `keel_refs_verify` re-hashes — report, never block; after intentional regeneration, re-admit (remove + add). Core amendments return `staleRefs` for affected refs; regeneration belongs to the owning workflow — Keel detects, never regenerates.

## 7. Maintenance and health

- `keel_status` — phase, switches (configured + effective), readiness checks, counts, pending proposals, batch notifications, legacy-file notes.
- `keel_clean` — removes orphan `## ` blocks (incl. legacy v1 02/03 headers; maintenance row records titles only).
- `keel_compact` — refused below 5 rows; the AI supplies merged summaries; the raw log is archived verbatim; the lifetime core counter survives.
- `keel_health` — epoch count (since last compaction; labeled) + lifetime count; yellow flag above 6 epoch core amendments; oscillation (≥2 overturns at one position) is a reference metric only — never a threshold, never a gate.
- `keel_exempt` — explicit waiver, reason mandatory.

## 8. Iteration sub-skills (outside the main module)

`keel-stress-test` (attack assumptions), `keel-alternatives` (2–3 genuinely different directions), `keel-relax-probe` (constraint relaxation cost/benefit), `keel-skeleton` (rebuild the concept model from 00 + P* alone; fresh-process evidence preferred, self-simulation labeled). All four: declare the prediction first, record the deviation; work with or without a DATUM (skeleton requires one); temp files live in the system temp dir and are deleted after; adopted findings return through the main module's write path.

## 9. Migration (v1 → v2)

`state.json` phases map automatically (`concept`→draft, `tech`/`handoff`→authoritative). TECHNICAL.md and 02/03 DATUM sections become ordinary unprotected content — archive elsewhere if needed, admit via `keel_ref_add`, strip headers with `keel_clean` (titles logged, bodies not — archive first). `probes/` is no longer created; existing probe files are inert.

## 10. Failure modes

Abandoned staging → visible in `keel_status`, discard with `keel_reject` · orphan `## ` blocks → `keel_clean` · unindexed contracts (v1) → no longer possible; the index is gone · protected-doc drift → `keel_refs_verify` report + regenerate + re-admit · corrupted `state.json` → conservative defaults (draft); AMENDMENTS.md is the durable history.

## 11. Research provenance

See the references table in [`README.md`](../README.md) (14 papers with deliberate-difference notes) and the research summaries in the authors' archives. The core internal evidence remains: unstructured iteration collapsed in rounds 3–4 twice in 384-round controlled experiments; structured runs had zero collapses — hence mechanical enforcement over prompt discipline.
