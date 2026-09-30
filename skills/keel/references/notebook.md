# Notebook protocol (layout, authoring, per-page phases, amendments)

## Layout — what lives where

- **Root page** (`.keel/DATUM.md`): the project-global core. 00 Intent — goal (one sentence), success criteria, out of scope **with its reason**, numbered requirements `R1..Rn` (a constraint is a requirement phrased as a boundary: same `- Requirement R-n:` format, no separate namespace). 01 Concept — weighted principles `- P1: …` (priority = list order, typically 3–5), decisions `- Decision D-n: <choice> — because <reason> — revisit if <condition>`, the global concept model (prose preamble + `- Entity:` / `- Flow:` / `- Invariant:` lines), open questions `- OPEN: … — blocks … — default: <safe interim choice>`. **Root keeps only invariants any session could violate** — the digest injects them everywhere; module-local invariants live on module pages.
- **Terms page** (`.keel/pages/terms.md`): the global glossary. One vocabulary across all pages.
- **Module pages** (`.keel/pages/<name>.md`): the same shape as the root page — a 00 and a 01 — module-scoped: module scope and requirements in 00; concept model, decisions, open questions in 01. No P\* lines: priorities are project-global and live on root only.
- **INDEX.md**: the routing table (pages + protected references), server-maintained. You never write it directly.
- **AMENDMENTS.md**: one global append-only log; the Location column carries page names. Its consent values: `yes ("…")` (the user's words) · `batch-notified` (peripheral) · `ai-managed` (self-managed: draft surfaces, or consent off) · `exempted`.

Claim ids (`Requirement R-n`, `P-n`, `Decision D-n`) are **globally unique across all pages** — pick numbers no other page uses; the server rejects collisions.

## Drafting (a page in phase = draft)

- Write freely: writes apply immediately and are logged `ai-managed`. No consent is requested; consent and steward are inactive for this page by design (the glance habit still applies — see references/steward.md). Section keys map to the page headings: `intent` = the page's `00`, `concept` = its `01`; `glossary` = the terms page's `G` (the glossary lives only there).
- Start with `keel_init {project}` if `.keel` does not exist; add module pages with `keel_page_add {name, covers}` when the time comes (boundaries still in flux → keep the knowledge on root).
- Record in the user's own words wherever possible, and for the whole lifecycle (iron rule 2 of the skill). Key assumptions stay tagged inline `[assumption]`. Technical details that surface along the way land in Open questions, not the concept model.
- Mermaid in a concept model: a block is a **projection of the prose, never a replacement** — accompany every diagram with the sentences it renders. The server checks only fence/bracket/quote balance on write; what the diagram says is yours.
- Terms: register load-bearing words via `keel_glossary_register` the same turn they first appear. To retire a term, edit its row to status `archived` — a `keel_write_section` write on the terms page's glossary section (core-tier while consent is on, if the term is load-bearing).
- Draft writes are ungated but not unlogged: `keel_write_section` still takes `level`, a one-line `summary`, and — for core — a `rationale`. And `content` always replaces the **entire** section: Read the page first (plain markdown — reads are free) and merge your change in.

## Phases and activation (per page)

- **Activation is your declaration, not a mechanical check**: when a page's essentials are recorded in language that survives the session (iron rule 2), call `keel_config {authoritative:true, page}` (page defaults to root). One-way per epoch; the project switches take effect for that page, default ON — **tell the user at that moment**. If any line still needs this conversation to be readable, finish it before activating. A `notebook:true` project activates the same way; its switches simply start off (the user can flip either on anytime).
- An **epoch** is a page's generation: 1 from init (or page creation), +1 on each reopen. "One-way" applies within the current epoch.
- **Gating** (mechanical, per write): staged when consent is on and (the target page is authoritative, **or** the change's closure cites an authoritative surface — e.g. a glossary row anchored to an id homed on one). Draft pages therefore write freely **except** closure-touching changes: a term registered on the draft terms page but citing an authoritative claim still stages. A peripheral write whose closure cites an authoritative surface is auto-escalated.
- **Tiers**: a *glossary term*'s tier follows the cited surface — citing an id homed on (or the name of) an authoritative page = core; citing only draft surfaces = peripheral. *Boundary- and routing-moving operations* (reference add/remove, page add/remove/covers) are core-tier while **any** page is authoritative. For your own section writes, choose `level` yourself: `core` for requirements, principles, decisions, invariants and concept-model lines; `peripheral` for OPEN notes and non-load-bearing content.

## Authoritative phase

- **consent ON (default)**: staged core writes wait for `keel_confirm` with `consent_evidence` = the user's consenting words. A staged write returns `proposalId`, its `closure` and its `level` — branch on that closure. Peripheral writes apply immediately and are batch-notified (visible in `keel_status` — mention them to the user when convenient).
- **Consent economy**: stage the change first (`keel_write_section`); read the returned `closure`. If it is empty and the user's message already specified the change verbatim, that message may serve as `consent_evidence` — confirm immediately, no further user round. If the closure is non-empty, stop: show the ripple (affected ids/pages, stale refs) and get fresh consent. Admitting a protected reference with carries always has non-empty closure — one ripple-and-consent round by design, the protection boundary is moving; one without carries has empty closure and may confirm on the user's verbatim words.
- **Batches**: one logical change across sections of a page = one `keel_write_section` call with `sections:[{section, content},…]` — one amendment row, one consent. Never split a logical change into sequential writes.
- Staged proposals must never be abandoned silently — confirm or `keel_reject` them; `keel_status` lists pending ones.
- Amendments superseding earlier ones fill `overturns` (feeds the oscillation reference metric).

## Module pages

- `keel_page_add {name, covers}`: kebab-case name; covers = what the page governs, **in stable anchors** — repo paths/globs, glossary terms, claim ids. INDEX routes every future session by these anchors; vague covers ("backend stuff") cause silent missed reads. Update with `keel_page_covers` when scope shifts.
- `keel_page_remove {page}`: refuses at staging while protected references still carry the page's ids — nothing is snapshotted or applied; the error lists the blockers. Once clear, it stages; the confirmed result reports glossary terms whose citations went dangling. Relay both lists when they appear.
- Single-module is just an INDEX with no module rows yet: add pages when a module's knowledge is dense enough to need its own addressable home; merge back by moving lines to root and removing the page.

## Reopen (module rework)

- **When to reopen vs amend**: changing a line is an amendment (one consent round). Rewriting a *cluster* of coupled lines — where intermediate states aren't worth approving one by one — is a reopen: batch-draft mode for one page.
- **Mechanics** (server, on `keel_config {phase:'draft', page}`): the page is snapshotted into archive/, its pending proposals are dropped, the epoch increments, the phase flips, and a reset row marks the epoch boundary in the log. A reverse ripple reports everything citing the page (its ids or its name): glossary terms and protected references to re-affirm once the page is re-declared.
- **The content stays**: a draft page is not an empty page — the old text remains the best available starting point. Whether an old invariant was *refuted* or *pending re-affirmation* is decided line-by-line during the rewrite (re-affirmed as an ordinary write / overturned with `overturns` citing the old id / dropped silently, the reset row being the boundary evidence).
- Re-declare when the essentials are again stable; announce again, as with any activation.

## Protected references (INDEX)

- `keel_ref_add {path, carries?}` admits a derived document into the protected set (whole-file SHA-256 pinned at admission; carries = the claim ids or page names it renders; carries may be **empty** when the document is protected for its own sake, e.g. a notes-only project). `keel_ref_remove` retires one. `keel_refs_verify` re-hashes — report, never block; after intentional regeneration, re-admit (remove + add) with the user. The refs table in INDEX is server-managed: `keel_write_section` has no route to it.
- When a core amendment lands, `keel_confirm` returns `staleRefs` — relay the list to the user; the owning workflow regenerates the document. Keel detects, it never regenerates.
