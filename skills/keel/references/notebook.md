# Notebook protocol (authoring, modes, amendments)

## Drafting (phase = draft)

- Write freely: core-level writes apply immediately and are logged `ai-managed`. No consent is requested; the consent mechanism and STEWARD are inactive by design.
- Record in the user's own words wherever possible:
  - **00 Intent** — goal (one sentence), success criteria, out of scope, numbered requirements `R*`. Requirements that originate from the user are confirmed with them; gaps you discover are raised as proposals.
  - **01 Concept** — principles as `- P1: …` lines (3–5, weighted priorities — this exact line format is mechanically load-bearing), the concept model under them (entities / flows / invariants, everyday words, no class names), and technical details that surface along the way into the parking lot.
  - Terms: register load-bearing words via `keel_glossary_register` the same turn they first appear.
- **Readiness** is computed mechanically by the server: goal filled · out-of-scope filled · ≥1 requirement · principles 3–5 · ≥1 glossary term. When it first passes, the DATUM becomes authoritative, both switches default ON, and the write result carries `activated` — **tell the user at that moment** (what turned on, and that `keel_config` can flip either off).

## Authoritative phase

- **consent ON (default)**: core-tier writes (00/01 content, load-bearing terms, protected references) are staged until `keel_confirm` with `consent_evidence` = the user's consenting words. Peripheral writes (parking-lot notes and other non-core content) apply immediately and are batch-notified at session end or via `keel_status`.
- **Consent economy**: a user message that specifies a change verbatim counts as consent only when its ripple closure is empty — compute the closure first (`keel_ripple` / the staged result's `closure`); if non-empty, stop and show the ripple.
- **consent OFF** (`keel_config {consent:false}`): all writes apply immediately, logged `ai-managed`. You are trusted; the audit trail still records everything. Batch-notify as with peripheral writes.
- **Batches**: one logical change across sections = one call with `sections:[{section,content},…]` — one amendment row, and one consent when active. Never split a logical change into sequential writes.
- Staged proposals must never be abandoned silently — confirm or `keel_reject` them; `keel_status` lists pending ones.
- **Amendments superseding earlier ones** fill `overturns` (feeds the oscillation reference metric).

## Protected references (R)

- `keel_ref_add {path, carries}` admits a derived document into the anti-degradation scope (whole-file SHA-256 pinned at admission; carries = the P*/01/00 refs it renders). `keel_ref_remove` retires one. `keel_refs_verify` re-hashes — report, never block; after intentional regeneration, re-admit (remove + add) with the user.
- When a core amendment lands, `keel_confirm` returns `staleRefs` — relay the list to the user; the owning workflow regenerates the document. Keel detects, it never regenerates (it does not know the derivation function).
- With consent OFF these too apply immediately (`ai-managed`) — the boundary moves at the user's trust level.
