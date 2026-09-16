# DATUM — <project>

<!-- Maintained exclusively by the Keel MCP server (keel_* tools).
     Hand-editing bypasses the consent protocol, traceability closure, and the
     amendment log — never do it.
     DATUM holds only the non-degradable core: membership criterion is
     "losing or drifting this would degrade the project". Full technical
     elaboration lives in TECHNICAL.md (derived); history lives in
     AMENDMENTS.md (append-only).
     Consent tiers: core (00/01, the Contract Index, protected references, and
     load-bearing terms) = explain + blocking user consent; peripheral =
     mechanical logging + batch notification. Peripheral writes whose
     traceability closure touches core are auto-escalated. -->

## 00 Intent

- Goal (one sentence): (TBD)
- Success criteria: (TBD)
- Out of scope: (TBD)
- Requirement R1: (TBD)

## G Glossary

<!-- Registration bar: only terms that are load-bearing somewhere in DATUM or
     have an ambiguity history belong here; everyday words are not registered.
     A term's consent tier is inherited from where it is load-bearing:
     P*/01/00 = core, index = peripheral.
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

## 03 Contract Index

<!-- Thin and guarded: one line per contract, module boundary, or stack choice.
     This table is what STEWARD measures changes against; it must stay thin.
     Full elaboration lives in TECHNICAL.md and joins back via the detail link
     (T# → an item there; that item links back via contracts: Cn).
     The implements column is the single source of traceability to core. -->

| ID | Contract (one line) | implements | detail |
|---|---|---|---|

## R Protected References

<!-- Derived documents admitted into the anti-degradation scope. Protection is
     tamper-evidence, not write-gating: whole-file SHA-256 recorded at
     admission and re-checked on verify/reconcile; edits stay free, mismatches
     are detected and reported. Adding or removing a reference extends the
     protection boundary and therefore follows the core consent flow. -->

| ref | path | carries | sha256 | admitted | status |
|---|---|---|---|---|---|
