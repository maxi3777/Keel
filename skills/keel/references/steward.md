# Steward protocol (glance, post-plan check, maintenance)

## The glance (always — every mode, every session)

After you finish a plan and before implementing: read the digest (a verbatim mechanical excerpt of the DATUM — doc pointer, mode line, goal/requirements/P*, top terms and protected refs, recent amendments; injected at session start and refreshed after every confirm; re-fetch anytime with `keel_digest`) and check the plan against it — goal, out-of-scope, requirements, principles, concept model. Outcomes:

- **No conflict** → proceed with implementation.
- **Conflict** → amend / drop the change / `keel_exempt` with the user (reason required).
- **Disagreement with the DATUM itself** → propose an amendment with rationale. The notebook is authoritative, not sacred.

## Post-plan check (steward switch ON)

When the steward switch is on, the glance becomes a structured check at the same point — after planning, never before, so your thinking stays free:

1. Compare the plan against all five glance items (goal, out-of-scope, requirements, principles, concept model), then go deeper on the principles and requirements it touches.
2. `keel_ripple` the involved P* ids or glossary terms whenever involvement is uncertain.
3. Treat staleRefs last reported by `keel_confirm` or `keel_ripple` as protected documents now suspected outdated — relay to the user.
4. New requirements discovered mid-work: diff against 00 first — conflicts and scope growth become visible proposals (with cost estimate and ripple), never silent absorption.
5. Tensions between a plan and a weighted principle escalate to the user with three exits: adjust the weights (reorder the P* lines) / revise the plan / revise the principle.

With the steward switch off, only the glance applies — the habit is yours, the structure is gone.

## Session bootstrap

The SessionStart hook injects the digest verbatim; the PostToolUse hook refreshes it after every confirm. On hosts without hooks (Codex), call `keel_digest` at session start and after confirmations. The digest's first line is the document pointer — any other workflow in the session may use it to find the notebook.

## Maintenance

- `keel_status`: phase, switches (configured value vs effective value — effective = configured AND phase authoritative), section counts, pending proposals, health (oscillation = reference metric).
- When the amendment log grows long → `keel_compact`: you write merged summary entries, the server archives the raw log verbatim (never deleted; it refuses below 5 entries).
- Orphan `## ` blocks (DATUM headings no tool can reach — historical misplacements, legacy v1 sections) → `keel_clean`; the amendment-log row it appends records the removed titles, not their bodies.
- **Legacy v1 projects** may carry TECHNICAL.md and old DATUM sections 02 (Trade-off Ledger) and 03 (Contract Index): TECHNICAL.md is now an ordinary unprotected file (admit via `keel_ref_add`, archive, or delete); orphan 02/03 blocks can be stripped with `keel_clean` — archive their content elsewhere first if it matters.
