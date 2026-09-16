---
name: keel
description: Keel design flow — co-created concept design with visible step-by-step derivation, technical design via decision menus, and cross-session design stewardship (authoritative DATUM document + amendment protocol). Use when the user types /keel or mentions DATUM, concept design, design phases, or the skeleton test, and whenever the working directory contains .keel/DATUM.md (resident STEWARD mode).
---

# Keel — Operating Protocol

## Iron rules (read first; highest priority)

1. **Semantics belong to you (the AI); determinism belongs to the server.** Every read/write under `.keel/` must go through `keel_*` tools. Never edit DATUM with Edit/Write.
2. **Consent tiers**:
   - Core (section 00 intent/requirements, section 01 principles & concept model, terms load-bearing at P*/01/00): show rationale + ripple → obtain the user's **explicit consent** → `keel_confirm` (with `consent_evidence` = the user's consenting words).
   - Peripheral: `keel_write_section` applies immediately and logs; **batch-notify** the user at session end / a gate / `/keel status`.
   - Call `keel_confirm` only after the user explicitly consented in the conversation. Never bypass or abandon staged proposals (abandon via `keel_reject`).
3. **Term introduction order**: concept → purpose → term; register the term (`keel_glossary_register`) the first time it appears. When one word carries two meanings, the glossary is the arbiter — point it out and propose splitting the term.
4. **The oscillation metric is a reference only** — never a threshold, never a gate. Always label it "reference metric" when presenting it.
5. During the concept phase, no class names and no technology choices; technical details that surface go to the 01 parking lot.

## Activation (`/keel <requirement description>`)

1. If `.keel` does not exist → `keel_init {project}`.
2. Extract from the user's statement: goal (one sentence) / success criteria / out-of-scope / numbered requirements R1..Rn (keep the user's wording wherever possible). **Confirm each item with the user** before writing.
3. Write section 00 at core level (their confirmation counts as consent; quote it as consent_evidence).
4. Enter CONCEPT and produce the first derivation chain.

## CONCEPT (concept phase; the user co-creates)

**Derivation-chain format** (every concept design must be presented this way):

```
D1 Requirement facts   cite R* numbers only; never work from memory
D2 Tensions            conflicts between requirements / binding constraints, stated plainly
D3 Key insights        tag each as [fact]/[assumption]/[inference] (assumption ledger)
D4 Principle candidates P1..P5 (3–5), each noting which D2 tension it resolves
D5 Concept model       entities/flows/invariants in everyday words; class names forbidden
D6 Rejected routes     ≥1 complete alternative + why rejected (a derivation with no rejected alternative is not trustworthy)
```

- **Multi-candidate policy**: one candidate by default; only when D3/D4 hit a genuine fork, present 2–3 derivation chains **sharing the same D1/D2**, with the fork points marked explicitly — the user adjudicates the fork, not the whole design anew.
- **Challenge protocol**: the user attacks any Di → show the ripple (which later steps change) → draft the revised chain → core-level propose → consent → confirm → record a revision entry in the 02 ledger ("old belief → new evidence → new principle", fill `overturns`).
- **Requirement refinement** co-evolves here: refined requirements flow back into 00 (core level); requirement gaps exposed by the concept are raised as proposals to the user.

### Concept-phase iteration (`/keel iterate <technique>`; manual invocation only)

- Allowed set (altitude-capped, optimization-oriented): `assumption stress-test` (attack [assumption] items in D3) / `alternative insight generation` (fork only at D3/D4) / `constraint-relaxation probe` ("how much simpler if we relax X?") / `skeleton test`.
- Protocol: **declare the prediction first** (which tension/metric you expect to improve) → execute → record the deviation (predicted vs actual).
- Any technical-layer output goes to the 01 parking lot, never into the concept model.

### G1 (CONCEPT → TECH, hard gate)

1. Ask the user to **sign off each P\* in the current priority order** (principles are weighted priorities, not invariants); record the sign-off as an 02 ledger entry.
2. `keel_gate g1` (mechanical checks).
3. **Skeleton test** (semantic item): dispatch a context-free subagent that receives only 00 + P* and rebuilds the concept model; diff it against D5 and report rebuild coverage. Low coverage → the P* are not the real skeleton; return to derivation. Record the result (with the probe saved under `.keel/probes/`) via `keel_gate_record`.
4. All passed → `keel_phase {to:"tech"}`.

## TECH (technical phase; the user only decides)

- Elaborate 03 items T1..T9; **each must carry an `implements:` traceability field** (P* or 01 Concept model).
- Present every fork as a **decision menu**: options A/B(/C) + recommendation + reasoning + cost of choosing wrong. Record the user's choice in the 02 ledger; the user never has to read the full text.
- Write 03 at peripheral level; the server auto-escalates writes whose closure touches core (escalation then follows the consent flow — a mechanical guarantee, not your judgment).
- Concreteness bar: **a plan/build phase receiving the handoff must not need to make any further design decisions**, only implementation-path planning.

### G2 (TECH → HANDOFF, hard gate)

1. `keel_gate g2` (nine items filled, each with implements).
2. Show the user the 03 summary + every decision point → record "user reviewed" via `keel_gate_record`.
3. `keel_phase {to:"handoff"}` → the server mechanically snapshots `.keel/handoff.md`.

## STEWARD (resident whenever DATUM exists, in every session)

- The SessionStart hook has injected the digest; if absent, call `keel_digest` (mechanical excerpt, verbatim).
- **Pre-edit check**: does this task touch P*, contracts, ownership, or module boundaries? When unsure, run `keel_ripple` for the closure.
- **On conflict, stop** and give the user three options: amend (normal core/peripheral flow) / drop the change / explicit exemption (`keel_exempt`, reason required). Silent divergence is forbidden.
- **New requirements**: diff against 00 first; conflict or scope extension → requirement-change proposal (core flow, showing cost and ripple); never absorb silently.
- `/keel reconcile`: compare 03 contracts against the code, list drift with its direction (stale document vs rogue code), and produce amendment proposals.
- When the amendment log exceeds the threshold (`keel_status` will say so) → `keel_compact`: you write the merged summary entries, the server archives the raw log (never deleted).

## Reporting (`/keel status`)

Show the user: phase, gate states, pending proposals, the batch notification of peripheral changes, and the health summary (core-amendment frequency, **oscillation reference metric** — always labeled "reference metric, not a threshold").

## Quick reference

- Altitude test: touches P*/concept model/module responsibility & boundaries/data ownership/cross-module contracts/user-visible behavior contracts/stack-level choices = design-level; contract-preserving function internals, UI tweaks, renames, equivalent refactors = implementation-level (never enters DATUM).
- Unsure → run `keel_ripple` once and record the outcome in the amendment log (calibration data for the threshold).
