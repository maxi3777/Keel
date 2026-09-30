# DATUM — <project>

<!-- Maintained exclusively by the Keel MCP server (keel_* tools).
     Hand-editing bypasses the consent mechanism, traceability closure, and
     the amendment log — never do it. Reads are free: this is plain markdown.
     This is the project's authoritative notebook: requirements (00), the
     concept model (01), load-bearing terms (G), and hash-pinned protected
     documents (R). History lives in AMENDMENTS.md (append-only).
     Modes: draft (writes apply immediately, logged ai-managed) →
     authoritative (declared by the agent via keel_config {authoritative:true}
     when the essentials are recorded; consent + steward switches then take
     effect, both default on). Flip switches via keel_config. -->

## 00 Intent

- Goal (one sentence): (TBD)
- Success criteria: (TBD)
- Out of scope: (TBD)

### Requirements

- Requirement R1: (TBD)

## G Glossary

<!-- Registration bar: only terms that are load-bearing somewhere in DATUM or
     have an ambiguity history belong here; everyday words are not registered.
     A term's consent tier is inherited from where it is load-bearing:
     P*/01/00 = core, everything else = peripheral.
     When one word is used with two meanings, this table is the arbiter. -->

| Term | Definition (one concept-level sentence) | Load-bearing in | Aliases | Status |
|---|---|---|---|---|

## 01 Concept

### Principles (weighted priorities, 3–5 items)

- P1: (TBD)

### Decisions (pre-design directions)

<!-- One line per settled direction, each self-contained for a cold reader:
     - Decision D1: <choice> — because <reason> — revisit if <condition>
     The "because" survives the session that produced it; the "revisit if"
     states when the decision stops holding. -->

- Decision D1: (TBD)

### Concept model

<!-- A prose preamble of at most a few sentences carries the narrative feel;
     the addressable skeleton below is what the digest slices and the
     amendment log can cite line-by-line:
     - Entity: <name> — <one line>
     - Flow: <name>: 1) … 2) …
     - Invariant: <always-true statement>
     Entities should be referenced by at least one Flow/Invariant — an
     unreferenced entity is usually decoration. Mermaid blocks are allowed
     as projections of the prose (never replacements for it); the server
     checks their fence/bracket/quote balance on write. -->

- Invariant: (TBD)

### Open questions (what is knowingly undecided)

<!-- - OPEN: <question> — blocks <R*/P*> if anything — default: <the safe
     interim choice, so a cold session never has to invent one> -->

- (none open)

## R Protected References

<!-- Derived documents admitted into the anti-degradation scope. Protection is
     tamper-evidence, not write-gating: whole-file SHA-256 recorded at
     admission and re-checked on verify; edits stay free, mismatches are
     detected and reported. carries = the core claims (P*/01/00 refs) this
     document renders; it may be empty when the document is protected for its
     own sake. Adding or removing a reference extends the protection boundary
     and therefore follows the core tier while consent is active. -->

| ref | path | carries | sha256 | admitted | status |
|---|---|---|---|---|---|
