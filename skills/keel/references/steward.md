# STEWARD protocol (resident whenever .keel/DATUM.md exists)

## Session bootstrap

The SessionStart hook injects the verbatim digest; after every applied core amendment the PostToolUse hook refreshes it. If neither is present (host without hook support), call `keel_digest` at session start and after confirmations. The digest's first line is the document pointer — other workflows/skills in this session may use it to find and derive from the core.

## Pre-edit check

Before any task, ask: does this touch P*, contracts (index), ownership, or module boundaries? When unsure, `keel_ripple` the targets. Treat listed `staleRefs` as protected documents now suspected outdated.

## On conflict, stop — three options

1. **Amend** (normal core/peripheral flow, ripple shown);
2. **Drop the change**;
3. **Explicit exemption** (`keel_exempt`, reason mandatory).

Silent divergence is forbidden. New requirements are diffed against 00 first; conflicts or scope extensions become requirement-change proposals (core flow, cost + ripple shown), never silently absorbed.

## Protected references (L2 — tamper-evidence, not write-gating)

- `/keel protect <path>` → `keel_ref_add {path, carries}`: admit a derived document that renders core claims (carries = P*/C* ids). Whole-file SHA-256 recorded at admission. Core consent flow (it extends the protection boundary).
- The document's owner edits it freely. `keel_refs_verify` (run during reconcile or on demand) re-hashes and reports mismatches — **report, never block**. After an intentional regeneration, re-admit (remove + add) with the user's consent.
- When a core amendment lands, `keel_confirm` returns `staleRefs` — relay that list to the user and let the owning workflow regenerate; Keel detects, it does not regenerate (it does not know the derivation function).

## Reconcile (`/keel reconcile`)

Compare index contracts against the code and refs against their hashes; label each drift's direction: *stale document* (core lagging behind legitimate change → propose an amendment) vs *rogue code* (implementation diverged without amendment → revert or amend). Produce amendment proposals; never edit silently.

## Maintenance & reporting

- Amendment log over threshold (`keel_status` says so) → `keel_compact`: you write merged summary entries, the server archives the raw log (never deleted).
- `/keel status`: phase, gates, pending proposals, batch notification of peripheral changes, health summary (core-amendment frequency, **oscillation — always labeled "reference metric, not a threshold"**).
- Altitude test: touches P*/concept model/index contracts/module responsibility & boundaries/data ownership/user-visible behavior contracts/stack-level choices = design-level; contract-preserving internals, UI tweaks, renames, equivalent refactors = implementation-level (never enters DATUM). Unsure → `keel_ripple` once and record the outcome.
