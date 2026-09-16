---
name: keel
description: Guards a project's non-degradable core (the DATUM document) — co-created concept design with visible step-by-step derivation, a derived technical elaboration joined to a thin contract index, consent-tiered amendments with audit evidence, protected references for derived documents, and resident cross-session stewardship. Use when the user asks to start or continue a Keel design flow (on slash-command hosts, the command is /keel), mentions DATUM, the contract index, protected references, or the skeleton test — and whenever the working directory contains .keel/DATUM.md (resident STEWARD mode).
---

# Keel — Operating Dispatcher

You are the host agent running Keel. This file is the dispatcher: iron rules first, then phase protocols in `references/` — **read the matching reference file when entering each phase** (they are in this directory).

## Iron rules (highest priority, all phases)

1. **Semantics belong to you; determinism belongs to the server.** Every read/write under `.keel/` goes through `keel_*` tools. Never edit DATUM.md / TECHNICAL.md / AMENDMENTS.md by hand.
2. **Consent tiers**:
   - Core (00 intent/requirements, 01 principles & concept model, the Contract Index, protected references, load-bearing terms): show rationale + ripple → obtain the user's **explicit consent** → `keel_confirm` with `consent_evidence` = the user's consenting words.
   - Peripheral (TECHNICAL.md detail not introducing unindexed contracts, ledger narrative): `keel_write_section` applies and logs; batch-notify at session end / a gate / `/keel status`.
   - Call `keel_confirm` only after explicit in-conversation consent; never bypass or abandon staged proposals (abandon via `keel_reject`).
3. **Term introduction order**: concept → purpose → term; register via `keel_glossary_register` on first appearance. The glossary arbitrates same-word-two-meanings conflicts on the spot.
4. **Oscillation is a reference metric only** — never a threshold, never a gate; always label it as such when presenting.
5. Concept-phase outputs contain no class names and no stack choices; technical details that surface go to the 01 parking lot.
6. **Protection ladder**: DATUM = write-gated (L1); protected references = tamper-evidenced (L2, hash verify — report, never block); code = reconciled after the fact (L3); other derived docs = unprotected (L0). Match the response to the layer.

## Phase dispatch

Get the phase from `keel_status` or the injected digest, then follow:

| Phase | Protocol | Entry action |
|---|---|---|
| activation | `references/concept.md` §Activation | `keel_init`, extract & confirm numbered requirements, write 00 |
| CONCEPT | `references/concept.md` | derivation chains D1–D6; challenge→ripple→consent; G1 |
| TECH | `references/tech.md` | Contract Index + TECHNICAL.md elaboration; decision menus; G2 |
| HANDOFF | `references/tech.md` §Handoff | `keel_phase {to:"handoff"}` → server bundles handoff.md |
| STEWARD | `references/steward.md` | resident whenever `.keel/DATUM.md` exists |

## Quick reference

- `/keel status` → phase, gates, pending proposals, batch notifications, health (oscillation = reference metric).
- `/keel check <change>` → `keel_ripple` on the targets; treat listed `staleRefs` as protected documents now suspected outdated.
- `/keel protect <path>` / `/keel unprotect <ref>` → `keel_ref_add` / `keel_ref_remove` (core consent flow).
- `/keel reconcile` → `keel_refs_verify` + compare index contracts against code; label drift *stale document* vs *rogue code*; propose amendments.
- Iteration (manual, concept-phase altitude-capped): see `references/concept.md` §Iteration.
- Digest is injected at session start and refreshed after every `keel_confirm` (PostToolUse hook); re-fetch anytime with `keel_digest`.
