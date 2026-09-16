# DATUM — <project>

<!-- Maintained exclusively by the Keel MCP server (keel_* tools).
     Hand-editing bypasses the consent protocol, traceability closure, and the
     amendment log — never do it.
     Consent tiers: core (sections 00/01 and load-bearing terms) = explain +
     blocking user consent; peripheral = mechanical logging + batch notification.
     Peripheral writes whose traceability closure touches core are auto-escalated. -->

## 00 Intent

- Goal (one sentence): (TBD)
- Success criteria: (TBD)
- Out of scope: (TBD)
- Requirement R1: (TBD)

## G Glossary

<!-- Registration bar: only terms that are load-bearing somewhere in DATUM or
     have an ambiguity history belong here; everyday words are not registered.
     A term's consent tier is inherited from where it is load-bearing:
     P*/01/00 = core, 03 = peripheral.
     When one word is used with two meanings, this table is the arbiter. -->

| Term | Definition (one concept-level sentence) | Load-bearing in | Aliases | Status |
|---|---|---|---|---|

## 01 Concept

### Design principles P* (current priority order, 3–5 items)

- P1: (TBD)

### Concept model (entities / flows / boundaries / invariants; no class names)

(TBD)

### Parking lot (technical details surfaced during concept phase, deferred to the technical phase)

- (empty)

## 02 Trade-off Ledger

<!-- Entry template (copy and fill):
### L1 Title [decision|revision]
- Tier: core|peripheral
- Decision, or: old belief → new evidence → new principle:
- Alternatives and why rejected:
- Cost:
- Evidence:
- Supersedes: L0 (revision entries only; feeds the oscillation reference metric — never a threshold)
-->

## 03 Technical Design

<!-- Every item must carry an implements: traceability field (P* or 01 Concept model)
     so ripple closures can be computed mechanically by the server.
     Concreteness bar: after handoff, a plan/build phase must not need to make any
     further design decisions — only implementation-path planning. -->

### T1 Module boundaries & responsibilities
- implements: (TBD)
(TBD)

### T2 Interface contracts
- implements: (TBD)
(TBD)

### T3 Data model
- implements: (TBD)
(TBD)

### T4 State machines
- implements: (TBD)
(TBD)

### T5 Error & edge policy
- implements: (TBD)
(TBD)

### T6 Stack choices & versions
- implements: (TBD)
(TBD)

### T7 Acceptance criteria
- implements: (TBD)
(TBD)

### T8 Non-functional constraints
- implements: (TBD)
(TBD)

### T9 Risks & open items
- implements: (TBD)
(TBD)

## 04 Amendment Log

<!-- Append-only, maintained by the server. Manual edits are forbidden.
     Compaction archives the raw log to archive/ and never deletes it. -->

| # | Time | Tier | Location | Summary | Supersedes | Consent |
|---|---|---|---|---|---|---|
