# CONCEPT phase protocol (activation, derivation, G1)

## Activation

1. If `.keel` does not exist → `keel_init {project}`.
2. Extract from the user's statement: goal (one sentence) / success criteria / out-of-scope / numbered requirements R1..Rn (keep the user's wording wherever possible). **Confirm each item with the user** before writing.
3. Write section 00 at core level (their confirmation counts as consent; quote it as consent_evidence).
4. Produce the first derivation chain.

## Derivation chains (every concept design must be presented this way)

```
D1 Requirement facts   cite R* numbers only; never work from memory
D2 Tensions            conflicts between requirements / binding constraints, stated plainly
D3 Key insights        tag each as [fact]/[assumption]/[inference] (assumption ledger)
D4 Principle candidates P1..P5 (3–5), each naming which D2 tension it resolves
D5 Concept model       entities/flows/invariants in everyday words; class names forbidden
D6 Rejected routes     ≥1 complete alternative + why rejected (a derivation with no rejected alternative is not trustworthy)
```

- **Multi-candidate policy**: one candidate by default; only when D3/D4 hit a genuine fork, present 2–3 chains **sharing the same D1/D2**, with fork points marked — the user adjudicates the fork, not the whole design anew.
- **Challenge protocol**: the user attacks any Di → show the ripple (which later steps change; `keel_ripple` where contracts/terms are involved) → draft the revised chain → core-level propose → consent → confirm → record a revision entry in the 02 ledger ("old belief → new evidence → new principle", fill `overturns`).
- **Requirement refinement** co-evolves here: refined requirements flow back into 00 (core level); gaps exposed by the concept are raised as proposals to the user.

## Iteration (`/keel iterate <technique>`; manual invocation only)

- Allowed set (altitude-capped, optimization-oriented): `assumption stress-test` / `alternative insight generation` (fork only at D3/D4) / `constraint-relaxation probe` / `skeleton test`.
- Protocol: **declare the prediction first** (which tension/metric you expect to improve) → execute → record the deviation (predicted vs actual).
- Technical-layer outputs go to the 01 parking lot, never into the concept model.

## G1 (CONCEPT → TECH, hard gate)

1. Ask the user to **sign off each P\* in the current priority order** (principles are weighted priorities, not invariants); record the sign-off as an 02 ledger entry.
2. `keel_gate g1` (mechanical checks).
3. **Skeleton test** (semantic): dispatch a context-free subagent that receives only 00 + P* and rebuilds the concept model; diff against D5 and report rebuild coverage. Low coverage → the P* are decoration; return to derivation. Save the probe under `.keel/probes/` and record via `keel_gate_record`.
4. All passed → `keel_phase {to:"tech"}`.
