# Steward protocol (glance, post-plan check, maintenance)

## The glance (always — every mode, every session)

After you finish a plan and before implementing: read the digest (injected at session start and refreshed after every confirm; re-fetch anytime with `keel_digest`) and check the plan against it — goal, out-of-scope, requirements, principles, concept model. Outcomes:

- **No conflict** → proceed with implementation.
- **Conflict** → amend / drop the change / `keel_exempt` with the user (reason mandatory).
- **Disagreement with the DATUM itself** → propose an amendment with rationale. The notebook is authoritative, not sacred.

## Post-plan check (steward switch ON)

When steward mode is on, the glance becomes a structured check at the same point — after planning, never before, so your thinking stays free:

1. Enumerate the areas the plan touches; compare against P* / requirements.
2. `keel_ripple` the involved P* ids or glossary terms when unsure.
3. Treat listed `staleRefs` as protected documents now suspected outdated — relay to the user.
4. New requirements discovered mid-work: diff against 00 first — conflicts and scope growth become visible proposals (with cost + ripple), never silent absorption.
5. Tensions between a plan and a weighted principle escalate to the user with three exits: adjust the weights / revise the plan / revise the principle.

With steward OFF, only the glance applies — the habit is yours, the structure is gone.

## Session bootstrap

The SessionStart hook injects the verbatim digest; the PostToolUse hook refreshes it after every confirm. On hook-less hosts (Codex), call `keel_digest` at session start and after confirmations. The digest's first line is the document pointer — any other workflow in the session may use it to find the notebook.

## Maintenance

- `keel_status`: phase, switches (configured + effective), readiness checks, pending proposals, batch notifications, health (oscillation = reference metric).
- Log over threshold → `keel_compact`: you write merged summary entries, the server archives the raw log verbatim (never deleted).
- Orphan `## ` blocks → `keel_clean`.
- **Legacy v1 projects** may carry TECHNICAL.md and old 02/03 DATUM sections: TECHNICAL.md is now an ordinary unprotected file (admit via `keel_ref_add`, archive, or delete); orphan 02/03 blocks can be stripped with `keel_clean` — archive their content elsewhere first if it matters (the maintenance row records titles, not bodies).
