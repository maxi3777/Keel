# Keel Protocol (v1.1)

Keel's heart is not a workflow — it is the **non-degradable core** of a project: an authoritative design document (DATUM) with a bounded altitude and an amendment protocol, plus a derived elaboration layer that joins back to it. The phases, participation rules, and iteration rules are protective mechanisms grown around that core.

This is the full specification. For a gentler introduction, read the README first.

## 0. Design axioms

1. **Membership criterion: non-degradability.** Information enters DATUM not because it is useful, but because losing or drifting it would degrade the project. Everything derivable from the core lives outside it and can be regenerated.
2. **Semantics belong to the AI; determinism belong to code.** Anything programmable (persisting files, validating formats, appending log rows, slicing digests, computing joins and closures, hashing references, checking checklists, counting oscillation) is executed by the MCP server, never by the model.
3. **Authority comes from restraint.** DATUM keeps its authority precisely because it does not track function-level changes and does not try to contain everything; the authority stays real because every amendment is forced to be visible.
4. **Enforcement lives outside the model.** Prompt-only discipline decays. Enforcement triangle: the skill layer guides, hooks force, the MCP server is the only legal write path.
5. **Design principles are weighted priorities, not invariants.** When an iteration makes P1 fight P2, the guard escalates the tension to the user; it never adjudicates.
6. **The oscillation metric is a reference only** — never a threshold, never a gate.

## 1. Protection ladder and file layout

Four protection levels; the files are organized by level, not by size:

```
L1  write-gating (before the fact)   DATUM.md — the guarded core
L2  tamper-evidence (after the fact)  protected references (derived docs with admitted hashes)
L3  audit (after the fact)            code vs the Contract Index (reconcile)
L0  unprotected                       TECHNICAL.md and any other derived document
```

```
.keel/
├─ DATUM.md       guarded core (L1)
│   00 Intent · G Glossary · 01 Concept (P* + concept model + parking lot)
│   02 Trade-off Ledger · 03 Contract Index (thin) · R Protected References
├─ TECHNICAL.md   derived elaboration (L0): T1..T9, joined to the index via contracts:
├─ AMENDMENTS.md  history: append-only, compacted into archive/ (never deleted)
├─ handoff.md     mechanical bundle (DATUM + TECHNICAL) snapshotted after G2
├─ probes/        subagent experiment records (skeleton tests etc.)
└─ archive/       raw amendment logs preserved by compaction
```

Correctness of the core is bidirectional: it must be **complete** (every design-level fact of the project is represented — missing facts mean rogue code) and **consistent** (every represented fact is still true — untruth means a stale document). Reconcile checks both directions.

**The Contract Index ↔ TECHNICAL join.** The index holds one guarded line per contract/boundary/stack choice with its `implements: P*` and a `detail: T#` link; TECHNICAL.md elaborates T1..T9, each carrying `contracts: Cn` back-links. `implements:` lives only in the index (single source of traceability); unindexed contract ids are mechanically rejected via closure escalation. Ripple closures are computed as T → C → P joins.

**Altitude test** (what counts as design-level, i.e. index-worthy): touches P*/concept model/module responsibility & boundaries/data ownership/cross-module contracts/user-visible behavior contracts/stack-level choices. Contract-preserving internals, UI tweaks, renames, equivalent refactors never enter DATUM.

## 2. Consent tiers

| Tier | Scope | Flow |
|---|---|---|
| Core (blocking) | 00 requirements/intent; 01 principles & concept model; the Contract Index; protected references; load-bearing terms | Explain (rationale ≥8 chars) + ripple → explicit user consent → `keel_confirm` (consent_evidence = the user's consenting words, audit trail) |
| Peripheral (notify) | TECHNICAL.md detail with resolvable contracts; ledger narrative; compaction | `keel_write_section` applies and logs → batch notification at session end / a gate / `/keel status` |
| Escalation rule | Closure touches core, or a `contracts:` id is unindexed | Server auto-escalates to core staging |

A well-converged design should not produce many core amendments. **Core-amendment frequency is a quality gauge** — after G1, frequent core changes raise a yellow flag (re-run the skeleton test) instead of being silently absorbed.

## 3. Phase protocol

```
        manual activation
IDLE ────────────▶ CONCEPT ──G1──▶ TECH ──G2──▶ HANDOFF ──▶ handed to plan/build
                     │  ▲
                     ▼  │ insights overturned: technical phase may roll back via the ledger
          ═══ STEWARD resident layer: overlays every session while DATUM exists ═══
```

### CONCEPT — derivation chains D1–D6

D1 requirement facts (cite R* only) → D2 tensions → D3 key insights ([fact]/[assumption]/[inference]) → D4 principle candidates (3–5, each naming the tension it resolves) → D5 concept model (no class names) → D6 rejected routes (≥1, with reasons). One candidate by default; genuine D3/D4 forks produce 2–3 chains sharing D1/D2. Challenge protocol: attack any Di → ripple → revised chain → core consent → ledgered revision. Iteration is manual and altitude-capped (assumption stress-test / alternative insight generation / constraint-relaxation probe / skeleton test), with prediction declared before execution and deviation recorded after.

### G1 (hard gate)

User signs off each P* in priority order (ledgered) → `keel_gate g1` (mechanical: goal/out-of-scope/≥1 requirement/3–5 principles/≥1 ledger entry/≥1 term) → skeleton test (context-free subagent rebuilds the model from 00+P* only; diffed against D5) recorded via `keel_gate_record` → `keel_phase {to:"tech"}`.

### TECH — index + elaboration as one logical unit

Decision menus (options + recommendation + reasoning + cost of being wrong), choices ledgered. Index entries (core consent) and TECHNICAL items (peripheral, join-escalated when needed) are written together. Concreteness bar: **the plan phase receiving the handoff makes no further design decisions.**

### G2 (hard gate) → HANDOFF

`keel_gate g2`: nine TECHNICAL items filled with resolvable `contracts:` links; every index row has `implements` + `detail`; join integrity in both directions → user reviews index + summary (`keel_gate_record`) → `keel_phase {to:"handoff"}` snapshots the bundle (DATUM + TECHNICAL).

### STEWARD — resident stewardship

1. **Session bootstrap**: SessionStart hook injects the verbatim digest, led by the document pointer (path + access method) so any workflow in the session can find and derive from the core; a PostToolUse hook refreshes the digest after every applied core amendment — no new session required.
2. **Pre-edit check**: does this touch P*, index contracts, ownership, boundaries? `keel_ripple` when unsure; `staleRefs` in the result list protected documents now suspected outdated.
3. **On conflict, stop**: amend / drop / explicit exemption (`keel_exempt`, reason mandatory). New requirements diff against 00 first; silent absorption is forbidden.
4. **Principle guard**: iteration outputs pass the P* check; tensions escalate to the user (three exits: adjust weights / revise the iteration / revise the principle).

## 4. Protected references (L2)

Derived documents admitted into the anti-degradation scope:

- **Admission** (`keel_ref_add {path, carries}`): the file must exist (path relative to the project root); whole-file SHA-256 is recorded; `carries` lists the core claims (P*/C*/R*) the document renders. Admission extends the protection boundary → core consent.
- **Verification** (`keel_refs_verify`): re-hash and report matches/mismatches. Tamper-evidence, not write-gating — the owning workflow edits freely; mismatches are reported, never blocked. After an intentional regeneration, re-admit (remove + add) with consent.
- **Stale propagation**: when a core amendment lands, `keel_confirm` returns `staleRefs` — the owning workflow regenerates. Keel detects; it does not regenerate (it does not know the derivation function). Relaying the stale list to the user is the host agent's job.
- **Removal** (`keel_ref_remove`): shrinks the boundary (core consent); the document itself is untouched.

Granularity decision (v1.1): whole-file hash — admitted documents are expected to be write-then-admit and rarely edited, so whole-file fidelity with zero intrusion beats block-marker precision; claim-block markers remain a future refinement if edit frequency grows.

## 5. Glossary (G)

The language-level core. Registration bar: load-bearing in DATUM or an ambiguity history. Consent tier inherited from where a term is load-bearing (P*/01/00 = core). Introduction order: concept → purpose → term, registered on first appearance; the table arbitrates same-word-two-meanings conflicts. The digest carries the top terms so every session speaks the same language.

## 6. Anti-bloat

1. Entry templates with field caps (summary ≤120 characters).
2. Compaction (threshold 5): AI-merged summaries; raw log archived verbatim, never deleted.
3. Promotion by reuse: only entries referenced later are worth carrying into summaries.
4. The core is size-capped by its membership criterion: it contains only non-degradable information; the fat elaboration lives in the unprotected TECHNICAL.md.

## 7. Health and oscillation (reference metric)

`keel_health` / `keel_status`: core-amendment counts, yellow flag (core amendments > 6), oscillation (same location revised back-and-forth ≥2 times, computed mechanically from `supersedes` fields). **Displayed only; no threshold; gates nothing.**

## 8. Failure modes (honest boundaries)

1. Threshold mis-calibration → noise or a dead document. Outcomes land in the amendment log; reviewed at every gate.
2. Derivation theater: a user who only rubber-stamps gets no concept-phase value.
3. Tasks too small: discourage activation below a complexity bar.
4. Single design authority: v1 does not handle concurrent multi-agent DATUM authorship.
5. Whole-file hashing flags cosmetic satellite edits as mismatches — acceptable while satellites are rarely edited; revisit with claim-block markers if that changes.
6. Stale-satellite regeneration is not Keel's job; if the host agent fails to relay `staleRefs`, satellites silently age.
7. Keel deliberately does not run autonomous design evolution.

## 9. Research provenance

| Mechanism | Origin |
|---|---|
| D1–D3 problem-understanding first / assumption ledger | Internal research round 1 (epistemic loop) |
| Skeleton test = subagent rebuild | Round-1 finding: self-review without external signal fails; Huang et al. (TACL 2024) |
| Principle guard: keep-better → priority escalation | Round-2 experiment ranking + RSEA held-out selection, adapted |
| Archive of rejected routes; re-open on assumption change | Round-2: archive/population ideas (DGM/AlphaEvolve/FunSearch lineage) |
| Enforcement triangle | Round-2: bare iteration collapsed; structured runs did not |
| Revision entries "old belief → new evidence → new principle" | Round-2: experience-playbook distillation (ACE lineage), weakened |
| Iteration protocol "prediction → execution → deviation" | Round-1: prediction–observation–deviation loops |
| Decision menus + ledger | Round-1: policy value shows in auditability |

Full paper list with links: see the References section of the README.
