# Steward protocol (glance, post-plan check, maintenance)

## The glance (always — every mode, every session)

After you finish a plan and before implementing: read the digest (a verbatim mechanical excerpt of the notebook — doc pointer, mode line, goal/out-of-scope/requirements, P*/invariants/decisions, top terms and protected refs, recent amendments; injected at session start and refreshed after every confirm; re-fetch anytime with `keel_digest`) and check the plan against it.

- **Match, do not bulk-read**: name the requirements, principles, invariants and decisions the plan touches. The notebook files are plain markdown — open the DATUM itself only when a match needs the context around the matched line.
- **Zero matches** (the plan provably touches no digest line) → say so in one line and proceed. An unrelated plan owes the notebook nothing more.
- **No conflict** → proceed with implementation.
- **Conflict** → amend / drop the change / `keel_exempt` with the user (reason required).
- **Disagreement with the DATUM itself** → propose an amendment with rationale. The notebook is authoritative, not sacred.

## Post-plan check (steward switch ON)

When the steward switch is on, the glance becomes a structured check at the same point — after planning, never before, so your thinking stays free:

1. Compare the plan against every digest item (goal, out-of-scope, requirements, principles, invariants, decisions), then go deeper on the ones it touches.
2. `keel_ripple` the involved P*/R*/D* ids or glossary terms whenever involvement is uncertain.
3. Treat staleRefs last reported by `keel_confirm` or `keel_ripple` as protected documents now suspected outdated — relay to the user.
4. New requirements discovered mid-work: diff against 00 first — conflicts and scope growth become visible proposals (with cost estimate and ripple), never silent absorption.
5. Tensions between a plan and a weighted principle escalate to the user with three exits: adjust the weights (reorder the P* lines) / revise the plan / revise the principle.

With the steward switch off, only the glance applies — the habit is yours, the structure is gone.

## Session bootstrap

The SessionStart hook injects the digest verbatim; the PostToolUse hook refreshes it after every confirm. On hosts without hooks, call `keel_digest` at session start and after confirmations. The digest's first line is the document pointer — any other workflow in the session may use it to find the notebook.

## Maintenance

- `keel_status`: phase, switches (configured value vs effective value — effective = configured AND phase authoritative), section counts, pending proposals, health (oscillation = reference metric).
- When the amendment log grows long → `keel_compact`: you write merged summary entries, the server archives the raw log verbatim (never deleted; it refuses below 5 entries).
- Orphan `## ` blocks (headings no tool can reach) → `keel_clean`; the amendment-log row it appends records the removed titles, not their bodies.
- **Periodic audit (trigger-based; the README recommends it to the user)**: after major rework, after a compaction, or after a long absence — run `keel_refs_verify` (report, never block; re-admit after intentional changes) and re-check the notebook's own hygiene: every Entity referenced by some Flow or Invariant, every Invariant stated so a cold session can check it, every OPEN line still open. An OPEN line that quietly stopped being open is a decision made in practice but never recorded — close it by writing the Decision or Requirement it became.
