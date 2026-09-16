# Keel Protocol (v1.0)

Keel's heart is not a workflow — it is an authoritative design document (the DATUM) with a bounded altitude and an amendment protocol. The phases, the participation rules, and the iteration rules are protective mechanisms grown around that document.

This document is the full specification. For a gentler introduction, read the README first.

## 0. Design axioms

1. **Semantics belong to the AI; determinism belongs to code.** Anything programmable (persisting files, validating formats, appending log rows, slicing digests, computing traceability closures, checking checklists, counting oscillation) is executed by the MCP server, never by the model.
2. **Authority comes from restraint.** DATUM keeps its authority precisely because it does not track function-level changes; the authority stays real precisely because every amendment is forced to be visible.
3. **Enforcement lives outside the model.** Prompt-only discipline decays (internal experiments: unstructured iteration collapsed in rounds 3–4 twice; structured runs had zero collapses). Enforcement triangle: the skill layer guides, the hook layer forces, the MCP server is the only legal write path.
4. **Design principles are weighted priorities, not invariants.** When an iteration makes P1 fight P2, the guard does not adjudicate — it escalates the tension to the user with three exits: adjust weights and record / revise the iteration / revise the principle itself.
5. **The oscillation metric is a reference only** — never a threshold, never a gate.

## 1. DATUM structure and the altitude contract

```
.keel/
├─ DATUM.md     00 Intent → G Glossary → 01 Concept (P* + concept model + parking lot)
│               → 02 Trade-off Ledger → 03 Technical Design (T1..T9, with implements links)
│               → 04 Amendment Log (append-only, server-maintained, compacted periodically)
├─ handoff.md   Mechanical snapshot taken by the server after G2 passes
├─ probes/      Subagent experiment records (skeleton tests etc.)
└─ archive/     Raw amendment logs preserved by compaction (never deleted)
```

**Altitude test (what counts as a design-level change)**:

| Change type | Enters DATUM? |
|---|---|
| Touches P* / the concept model | Yes (core-tier consent) |
| Module responsibility / boundaries / data ownership / cross-module contracts | Yes |
| User-visible behavior contracts, stack-level choices | Yes |
| Contract-preserving implementation details (function internals, local optimization) | No |
| UI tweaks, renames, equivalent refactors | No (default) |
| Unsure | Run `keel_ripple` once and record the outcome (calibration data) |

**Traceability closure**: every 03 item carries `implements: P*`; every glossary term carries its load-bearing locations. A peripheral write whose closure touches core (`P*`/`01`/`00` references) is **auto-escalated** to core-tier staging by the server — a mechanical guarantee that does not rely on the AI's judgment.

## 2. Consent tiers

| Tier | Scope | Flow |
|---|---|---|
| Core (blocking) | 00 requirements/intent; 01 principles & concept model; load-bearing terms | Explain (rationale ≥8 chars) + ripple → explicit user consent → `keel_confirm` (consent_evidence = the user's consenting words, kept as an audit trail) |
| Peripheral (notify) | 03 details not touching core; log compaction; term archival | `keel_write_section` applies and logs immediately → batch notification at session end / a gate / `/keel status` |
| Escalation rule | Closure touches core | Server auto-escalates to core tier |

Design intent: a well-converged design should not produce many core amendments. **Core-amendment frequency is a quality gauge** — after G1, frequent core changes raise a yellow flag (suggest re-running the skeleton test) instead of being silently absorbed.

## 3. Phase protocol

```
        manual activation
IDLE ────────────▶ CONCEPT ──G1──▶ TECH ──G2──▶ HANDOFF ──▶ handed to plan/build
                     │  ▲
                     ▼  │ insights overturned: technical phase may roll back to revise the concept (via the ledger)
          ═══ STEWARD resident layer: overlays every session while DATUM exists ═══
```

### CONCEPT (user co-creates deeply)

Every concept design must be shown as a derivation chain D1–D6: D1 requirement facts (cite R* numbers only) → D2 tensions → D3 key insights (tagged [fact]/[assumption]/[inference]) → D4 principle candidates (3–5, each naming the tension it resolves) → D5 concept model (class names forbidden) → D6 rejected routes (≥1, with reasons). The concept design proper is D4 + D5 (D6 as guardrail).

- One candidate by default; a genuine fork (at D3/D4) produces 2–3 chains **sharing the same D1/D2**, with fork points marked.
- Challenge protocol: attack any Di → ripple display → revised chain → core-tier consent → ledgered.
- Iteration (manual invocation, altitude-capped in concept phase): assumption stress-test / alternative insight generation / constraint-relaxation probe / skeleton test. Protocol = declare the prediction first → execute → record the deviation. Technical-layer outputs go to the parking lot.

### G1 (hard gate)

1. The user signs off each P* in the current priority order (recorded in the ledger).
2. `keel_gate g1`: mechanical checks (goal/out-of-scope filled, ≥1 requirement, 3–5 principles, ≥1 ledger entry, ≥1 active term).
3. Skeleton test (semantic): a context-free subagent receives only 00 + P* and rebuilds the concept model; diffed against D5 with a rebuild-coverage report. Low coverage → the principles are decoration, return to derivation. Recorded via `keel_gate_record` with evidence.
4. `keel_phase {to:"tech"}`.

### TECH (the user only decides)

Decision menus: options + recommendation + reasoning + cost of choosing wrong; choices land in the ledger. Elaborate T1..T9 (each with `implements`). Concreteness bar: **the plan phase receiving the handoff makes no further design decisions**.

### G2 (hard gate) → HANDOFF

`keel_gate g2` (nine items filled, each with implements) → the user reviews the 03 summary and all decision points (`keel_gate_record`) → `keel_phase {to:"handoff"}` → the server snapshots handoff.md.

### STEWARD (resident stewardship, four checkpoints)

1. **Session bootstrap**: the SessionStart hook injects the digest (verbatim slicing, never AI paraphrase).
2. **Change detection**: before acting, ask "does this touch P*, contracts, ownership, or boundaries?"; when unsure, `keel_ripple`.
3. **Amendment protocol**: on conflict, stop; three options — amend / drop / explicit exemption (`keel_exempt`, reason mandatory). Silent divergence is forbidden.
4. **Principle guard**: iteration outputs pass the P* check first (priority semantics: conflicts escalate to the user, never auto-adjudicated). New requirements are diffed against 00; conflicts or scope extensions become requirement-change proposals.

`/keel reconcile`: audit the code against 03 contracts and label each drift's direction (stale document vs rogue code).

## 4. Glossary (G)

The language-level DATUM: a design can silently degrade while the words drift, even when nothing else changed.

- Fields: term / concept-level definition / load-bearing locations / aliases / status.
- **Consent tier inherited from load-bearing locations**: terms load-bearing at P*/01/00 are core; terms only load-bearing in 03 are peripheral.
- Registration bar (the first anti-bloat gate): only terms that are load-bearing somewhere in DATUM or have an ambiguity history are registered.
- Introduction order: concept → purpose → term; registered on first appearance.
- Arbitration: when one word carries two meanings, the table is the arbiter; propose splitting the term on the spot.
- The digest carries the top terms, so every session speaks the same language.

## 5. Anti-bloat (lesson from experience-playbook research)

1. Entry templates with field caps (summary ≤120 characters).
2. Compaction: when the log exceeds the threshold and superseded entries accumulate, the AI merges summaries → `keel_compact` archives the raw text (never deleted). Compaction reorganizes; it never rewrites history.
3. Promotion by reuse: only entries referenced by later decisions are worth carrying into summaries; the rest stays archived.
4. Compaction itself is peripheral tier (logged + batch-notified).

## 6. Health and oscillation (reference metric)

- `keel_health` / `keel_status`: core-amendment counts, yellow flag (core amendments > 6 suggest the concept never converged), oscillation statistics.
- Oscillation definition: the same "location" accumulates ≥2 amendments carrying "supersedes" markers (back-and-forth revisions). Both ledger revision entries and amendment rows carry the field; the server counts it mechanically.
- **Displayed only; no threshold; gates nothing.**

## 7. Failure modes (honest boundaries)

1. Threshold mis-calibration → noise or a dead document. Mitigation: outcomes land in the amendment log; reviewed at every gate.
2. Derivation theater: a user who only rubber-stamps gets no concept-phase value. Keel is built for deep participants.
3. Tasks too small: the AI should discourage activation below a complexity bar, or degrade to a mini mode (00 + P* only).
4. Concurrent multi-agent design authorship: DATUM assumes a single writer; v1 does not handle concurrent design authority.
5. Keel deliberately does not do autonomous design evolution (no outer loop mutating designs unattended); that is a different product.

## 8. Research provenance

| Mechanism | Origin |
|---|---|
| D1–D3 problem-understanding first / assumption ledger | Internal research round 1 (epistemic loop; hypothesis-ledger experiments) |
| Skeleton test = subagent rebuild | Round-1 finding: self-review without external signal fails; confirmed by Huang et al. (TACL 2024) |
| Principle guard: keep-better → priority escalation | Round-2 experiment ranking + RSEA held-out selection, adapted |
| Multi-candidate chains sharing D1/D2 + rejected-route archive | Round-2: archive/population ideas (DGM/AlphaEvolve/FunSearch lineage) |
| Enforcement triangle (mechanical, outside the model) | Round-2 experiments: bare iteration collapsed; structured runs did not |
| Revision entries "old belief → new evidence → new principle" | Round-2 experiment: experience-playbook distillation, weakened form |
| Iteration protocol "prediction → execution → deviation" | Round-1: prediction–observation–deviation loops |
| Decision menus + ledger | Round-1 conclusion: policy value shows in auditability |

Full paper list with links: see the References section of the README.
