# DATUM — <project>

<!-- Root page of the Keel notebook (module pages live under pages/; routing
     in INDEX.md). Maintained exclusively by the Keel MCP server (keel_* tools);
     hand-editing bypasses consent, traceability closure and the amendment log —
     never do it. Reads are free: plain markdown.
     The root page holds what is project-global: identity, scope, numbered
     requirements, weighted priorities, cross-module invariants, global
     decisions and open questions. Module-level knowledge lives on module pages.
     History lives in AMENDMENTS.md (append-only).
     Phases are per-page: draft (writes apply immediately, logged ai-managed) →
     authoritative (declared by the agent via keel_config {authoritative:true,
     page:"root"} when the essentials are recorded; consent + steward then apply
     to this page, both default on). Reopen: keel_config {phase:"draft",
     page:"root"} — user-directed, snapshotted. -->

## 00 Intent

- Goal (one sentence): (TBD)
- Success criteria: (TBD)
- Out of scope: (TBD)

### Requirements

<!-- Number them R1, R2, … as you record them; ids are globally unique across
     all pages (root and modules share one namespace). A constraint is a
     requirement phrased as a boundary — same line format. -->

- Requirement: (TBD)

## 01 Concept

### Principles (weighted priorities, 3–5 items)

- P1: (TBD)

### Decisions (pre-design directions)

<!-- One line per settled direction, each self-contained for a cold reader:
     - Decision D1: <choice> — because <reason> — revisit if <condition>
     Number them D1, D2, … — ids are globally unique across all pages.
     The "because" survives the session that produced it; the "revisit if"
     states when the decision stops holding. -->

- Decision: (TBD)

### Concept model

<!-- A prose preamble of at most a few sentences carries the narrative feel;
     the addressable skeleton below is what the digest slices and the
     amendment log can cite line-by-line:
     - Entity: <name> — <one line>
     - Flow: <name>: 1) … 2) …
     - Invariant: <always-true statement>
     This page keeps only invariants ANY session could violate (the digest
     injects them everywhere); module-local ones live on module pages.
     Entities should be referenced by at least one Flow/Invariant — an
     unreferenced entity is usually decoration. Mermaid blocks are allowed
     as projections of the prose (never replacements for it); the server
     checks their fence/bracket/quote balance on write. -->

- Invariant: (TBD)

### Open questions (what is knowingly undecided)

<!-- - OPEN: <question> — blocks <R*/P*> if anything — default: <the safe
     interim choice, so a cold session never has to invent one> -->

- (none open)
