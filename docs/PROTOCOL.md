# Keel Protocol — v2.3.0

> Keel is the AI's **authoritative notebook**: a routed page set — a root DATUM, module pages, a global glossary — recording requirements, decisions, invariants and concept models, keeping them from silently degrading, and otherwise leaving the agent free. There is no workflow to direct, no phase pipeline, no numeric gates. The agent thinks and plans autonomously; the only ritual is the glance — *after planning, before implementing, match the plan against the digest (root pins + INDEX covers); read only what matched; zero matches → say so and proceed.*

## 1. Axioms

1. **Semantics belong to the AI; determinism belongs to the server.** Every `.keel/` write goes through `keel_*` tools; hand edits are forbidden, INDEX and the amendment log are server-owned. **Reads are free**: the notebook files are plain markdown — open them directly; `keel_digest` is the map, not the gate.
2. **Record outcomes, never process.** The notebook holds what was decided (requirements, principles, decisions, invariants, concept models), not how the agent reasoned. Nothing constrains the agent before it commits.
3. **Authority is per-page and bounded; switches are project-level and free.** Each page carries its own phase; consent and stewardship are switches the user flips anytime, either way, no re-validation.
4. **Anything programmable is code.** File creation, validation, tiering, hashing, routing-table serialization, id-uniqueness enforcement, logging — never delegated to the model.
5. **Clarity over counters.** The server enforces no quantity checks; it enforces presence (a summary, a rationale for core, consent evidence, an exemption reason), the line formats the parser depends on, global claim-id uniqueness, and the well-formedness of mermaid blocks (fence/bracket/quote balance — syntax, never semantics). Quality is the skill's **lifespan-clarity rule**: every recorded line must be intelligible in any later session without the current conversation.

## 2. File layout (protection mechanisms)

```
consent-gated (before the fact)   writes to authoritative pages/surfaces — while consent is ON
tamper-evidenced (after the fact) protected references (SHA-256-verified)
unprotected                       everything else
```

- `.keel/DATUM.md` — **root page**, project-global core. `00 Intent`: goal (one sentence) · success criteria · out of scope **with its reason** · numbered requirements `- Requirement R1..Rn:` (a constraint is a requirement phrased as a boundary — same format, no separate namespace). `01 Concept`: weighted principles `- P1: …` (priority = list order, typically 3–5) · decisions `- Decision D1: <choice> — because <reason> — revisit if <condition>` · the global concept model — a short prose preamble plus addressable lines `- Entity: …`, `- Flow: …`, `- Invariant: …` (everyday words, no class names; assumptions tagged `[assumption]`; **root keeps only invariants any session could violate** — they are injected everywhere via the digest) · open questions `- OPEN: <question> — blocks <id> — default: <safe interim choice>`. Mermaid blocks are **projections of the prose, never replacements**; the server checks their fence/bracket/quote balance on write.
- `.keel/pages/terms.md` — the **global glossary** (G): term / concept-level definition / load-bearing in / aliases / status.
- `.keel/pages/<module>.md` — **module pages**, same altitude, module-scoped: module scope and requirements in 00; concept model, decisions, open questions in 01. No P\* lines (priorities are project-global, root only).
- `.keel/INDEX.md` — the server-maintained **routing table**: pages (`page / path / covers / lastAmend`) + protected references (`ref / path / carries / sha256 / admitted / status`; default ids `REF1..`; `carries` = claim ids or page names, may be empty when the document is protected for its own sake).
- `.keel/AMENDMENTS.md` — one global append-only log: `# / time / tier / location / summary / supersedes / consent` (Location carries page names). Consent values: `yes ("…")`, `batch-notified`, `ai-managed` (draft surfaces or consent OFF), `exempted`. Compacted into `archive/` (verbatim, never deleted).
- `.keel/state.json` — per-page `phase`/`epoch` · `consentMode` · `stewardMode` · `proposals` (staged) · `seq` counters · `coreCount` (lifetime, survives compaction).
- `.keel/archive/` — compaction snapshots, pre-reopen page snapshots, removed-page snapshots.

**Claim ids** (`Requirement R-n`, `P-n`, `Decision D-n`) are globally unique across all pages; the server rejects collisions (a rewrite may keep its own page's ids). Single-module is just an INDEX with no module rows yet — no modes, no migration, ever.

## 3. Phases, declaration, and reopen (per page)

- **draft**: the page's writes apply immediately, logged `ai-managed`. Consent and steward are inactive for it by design (the glance habit still applies globally).
- **Declaration**: the agent's explicit, one-way-per-epoch act — `keel_config {authoritative:true, page}` (page defaults to root) — made when it judges that page's essentials recorded in language that survives the session. The config result carries `activated` and instructs the agent to **announce it to the user**. Never a side-effect of a write; no readiness formula, no count thresholds.
- **Gating (mechanical)**: a write stages when consent is ON and (its target page is authoritative, or its closure cites an authoritative surface — a glossary row or protected reference anchored to one). Structural ops (page add/remove/covers, ref add/remove) move the protection boundary and stage while *any* page is authoritative; an everything-draft project stays friction-free by design. Glossary terms and references inherit tier from the surface they cite.
- **Switches**: `keel_config {consent, steward}` — project-level booleans. consent OFF ⇒ all writes immediate, logged `ai-managed`. steward OFF ⇒ only the glance. Pending proposals survive flips.
- **Reopen** (`keel_config {phase:'draft', page}`, user-directed): the server snapshots the page into archive/, drops its pending proposals, increments the epoch, logs a reset row (the epoch boundary), and reports the **reverse ripple** — glossary terms and protected references citing the page (its ids or its name) that need re-affirming after re-declaration. The content stays: a draft page is not an empty page; whether each old line was refuted or is pending re-affirmation is decided line-by-line during the rewrite (ordinary write / `overturns` citing the old id / dropped with the reset row as boundary evidence).

## 4. The write path (cross-cutting)

```
intent → keel_write_section (page defaults to root; single or sections-batch)
  → mechanical validation (known section · no amendments writes · no direct
    INDEX writes — page/ref tools only · no duplicate section in batch ·
    content non-empty · no "## " inside sections · mermaid fence/bracket/
    quote balance · global id uniqueness · summary non-empty; core requires
    a non-empty rationale — presence, not length; no numeric gates)
  → closure (citations in glossary load-bearing / ref carries; ids defined
    in the content) → peripheral w/ closure citing an authoritative surface
    escalates to core
  → if peripheral OR consent inactive for the touched surfaces → apply
    immediately + audit row (INDEX lastAmend bumped per touched page)
  → else stage PR-n (per-entry baseContent snapshot) → user consent →
    keel_confirm(consent_evidence — the user's words, quoted to 40)
  → anti-clobber: any target changed since staging ⇒ confirm refused with
    recovery instructions (keel_reject, re-propose)
  → apply → audit row (+lifetime core counter if tier contains core)
  → staleRefs: protected refs whose carries intersect this change's ids
    (computed against the pre-apply snapshot) returned to the agent to relay
```

`content` replaces the **entire** section — read-then-merge (reads are free). Batch = one logical change: one consent, one audit row. Consent economy (skill-level): stage first; empty closure + the user's verbatim specification ⇒ that message may serve as `consent_evidence`; non-empty closure ⇒ show the ripple and get fresh consent.

`keel_glossary_register` writes the terms page and computes its tier from `load_bearing` (cites an authoritative id/page ⇒ core). `keel_ref_add` / `keel_ref_remove` / `keel_page_add` / `keel_page_remove` / `keel_page_covers` move the guarded or routed surfaces (core-tier while any page is authoritative); page removal refuses while protected references still carry the page's ids and reports dangling glossary citations.

## 5. The glance and the post-plan check (STEWARD)

- **Glance (always, every mode)**: after finishing a plan, before implementing — check the digest. Root pins apply to every plan (they are the lines any session could violate); INDEX covers route to module pages. Match, don't bulk-read; zero matches → one line, proceed. Watermark rule: a matched page whose `lastAmend` moved since your last read gets re-read — memory of a page is evidence, not the source. Conflict → amend / drop / `keel_exempt`. Disagreement → propose an amendment with rationale.
- **Post-plan check (steward ON)**: the same moment, structured — every root pin, then deeper on matched pages; `keel_ripple` (ids / page names / terms) when involvement is uncertain; relay `staleRefs`; new requirements diff against the owning page's 00; principle tensions escalate with three exits (reorder P\* / revise the plan / revise the principle).
- **Residency mechanics**: SessionStart hook injects the verbatim digest (doc pointer, per-page phase line, root pins, INDEX verbatim, protected refs, last 3 amendments, habit line); PostToolUse refreshes after every confirm; hook-less hosts call `keel_digest` themselves (the Codex adapter registers the same hooks in `~/.codex/hooks.json`). Hooks resolve the project from the payload `cwd` when provided, drain stdin (timer-guarded), and stay silent on any failure.

## 6. Protected references

Write-then-admit: the owning workflow edits freely; `keel_ref_add {path, carries?}` pins the whole-file SHA-256 at admission; `keel_refs_verify` re-hashes — report, never block; after intentional regeneration, re-admit (remove + add). Core amendments return `staleRefs` for refs carrying the touched ids; regeneration belongs to the owning workflow — Keel detects, never regenerates.

## 7. Maintenance and health

- `keel_status` — per-page phases/epochs, switches (configured + effective), per-page counts, pending proposals, health summary.
- Health — epoch count (since last compaction; labeled) + lifetime count; yellow flag above 6 epoch core amendments (advisory text only); oscillation (≥2 overturns at one position) is a reference metric only — never a threshold, never a gate.
- `keel_clean` — removes orphan `## ` blocks from any page (the amendment row records titles only).
- `keel_compact` — refused below 5 rows; AI-supplied merged summaries; raw log archived verbatim; the lifetime core counter survives.
- `keel_exempt` — explicit waiver, reason required (presence, not length).
- **Periodic audit (trigger-based; recommended in the README)**: after major rework, after a compaction, or after a long absence — `keel_refs_verify`, plus notebook hygiene: entities referenced, invariants cold-checkable, OPEN lines still open (a silently-closed OPEN is an unrecorded decision), **covers still describing their pages** (covers rot silently; missed reads follow), and the reopen watch (a page still draft long after a reset row is protection silently off).

## 8. Iteration sub-skills (outside the main module)

`keel-stress-test` (attack assumptions), `keel-alternatives` (2–3 genuinely different directions), `keel-relax-probe` (constraint relaxation cost/benefit), `keel-skeleton` (rebuild a page's concept model from its 00 + P\* alone; coverage = share of recorded entities/flows/invariants recovered, below ~half = decoration; fresh-process evidence preferred, self-simulation labeled). All four: declare the prediction first, record the deviation; work with or without a notebook (skeleton requires one); temp files live in the system temp dir and are deleted after; adopted findings return through the main module's write path, if a notebook exists.

## 9. Failure modes

Abandoned staging → visible in `keel_status`, discard with `keel_reject` · orphan `## ` blocks → `keel_clean` · protected-doc drift → `keel_refs_verify` report + regenerate + re-admit · corrupted `state.json` → conservative defaults (all pages draft); AMENDMENTS.md is the durable history · premature declaration → at most early consent rounds on one page; the user flips switches freely · covers rot / routing misses → the write-gate backstops (a wrong plan still collides with the authoritative page at write time) + periodic audit names it · reopen left open → reset row in the log + reopen watch in the audit.

## 10. Research provenance

See the references table in [`README.md`](../README.md) (14 papers with deliberate-difference notes) and the research summaries in the authors' archives. The core internal evidence remains: unstructured iteration collapsed in rounds 3–4 twice in 384-round controlled experiments; structured runs had zero collapses — hence mechanical enforcement over prompt discipline. The mechanical layer is *determinism duties only* (persistence, tiering, hashing, routing, audit); semantic judgments — completeness, quality — belong to the agent under the lifespan-clarity rule.
