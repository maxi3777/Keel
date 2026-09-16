# TECH phase protocol (index, elaboration, G2, handoff)

## The two-file split

- **DATUM.md §03 Contract Index** — thin, guarded (core tier): one line per contract / module boundary / stack choice: `| Cn | one-line contract | implements: P* | detail: T# |`.
- **TECHNICAL.md** — derived elaboration (L0): T1..T9, each carrying `contracts: Cn` linking back to the index. The index is the guarded representation; this file is what plan/build consumes.

Rules:
- Write the index entry and the TECHNICAL elaboration **as one logical unit** — propose the index (core consent), then the elaboration (peripheral; the server escalates automatically if a `contracts:` id is unindexed or its closure touches core).
- `implements:` lives **only** in the index (single source of traceability); `contracts:` lives only in TECHNICAL.md. Unindexed contract ids are mechanically rejected via closure escalation.
- Concreteness bar: **a plan/build phase receiving the handoff makes no further design decisions.**

## Decision menus

Present every fork as a menu: options A/B(/C) + recommendation + reasoning + cost of choosing wrong. Record the user's choice in the 02 ledger. The user never has to read the full elaboration.

The nine TECHNICAL items: T1 module boundaries & responsibilities · T2 interface contracts · T3 data model · T4 state machines · T5 error & edge policy · T6 stack choices & versions · T7 acceptance criteria · T8 non-functional constraints · T9 risks & open items.

## G2 (TECH → HANDOFF, hard gate)

1. `keel_gate g2`: nine items filled with resolvable `contracts:` links; every index row has `implements` + `detail`; join integrity both directions.
2. Show the user the index + TECHNICAL summary and all decision points → record "user reviewed" via `keel_gate_record`.
3. `keel_phase {to:"handoff"}` → the server mechanically bundles `handoff.md` (DATUM + TECHNICAL).

## Handoff

After the snapshot, the design is handed to the usual plan/build workflow. STEWARD remains resident (see `references/steward.md`). Later design-level changes still go through the amendment protocol — handoff freezes a deliverable, not the core.
