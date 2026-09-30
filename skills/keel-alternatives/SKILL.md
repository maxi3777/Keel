---
name: keel-alternatives
description: Alternative insight generation — produce 2–3 genuinely different solution directions for a stated problem or design fork. Use when the user asks for alternatives, other approaches, different routes, or wants to compare design options before committing. Part of the Keel iteration tools; works with or without a DATUM.
---

# Alternative insight generation (Keel iteration tool)

1. **Fix the shared facts first**: requirements and binding constraints, from the conversation and — if a notebook exists — from the root page's 00 plus the matched module page's 00 (plain markdown, read directly). All alternatives must share the same facts; only the resolution forks.
2. **Declare the prediction first**: which conflict between requirements or constraints each candidate claims to resolve better, stated before any detailed design.
3. **Generate 2–3 candidates that differ in mechanism, not wording**. Mark the fork point explicitly (the step where the routes genuinely diverge).
4. **After drafting, judge each candidate's real strengths against the prediction**; recommend one, with the cost of choosing wrong stated plainly.
5. The user adjudicates the fork. If a notebook exists, the adopted route — plus one line per rejected route with the rejection reason — enters it through the keel module's write path (`keel_write_section`, targeting the owning page); otherwise report only.

Temp discipline: working notes live in the system temp directory and are deleted when done. Nothing persists except what you report and what is amended into the DATUM.
