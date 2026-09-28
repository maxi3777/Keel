---
name: keel-alternatives
description: Alternative insight generation — produce 2–3 genuinely different solution directions for a stated problem or design fork. Use when the user asks for alternatives, other approaches, different routes, or wants to compare design options before committing. Part of the Keel iteration tools; works with or without a DATUM.
---

# Alternative insight generation (Keel iteration tool)

1. **Fix the shared facts first**: requirements and binding constraints, from the conversation and — if a DATUM exists — from 00 via `keel_read`. All alternatives must share the same facts; only the resolution forks.
2. **Declare the prediction first**: which tension each candidate claims to resolve better, stated before any detailed design.
3. **Generate 2–3 candidates that differ in mechanism, not wording**. Mark the fork point explicitly (the step where the routes genuinely diverge).
4. **Compare predicted vs actual strengths**; recommend one, with the cost of choosing wrong stated plainly.
5. The user adjudicates the fork. The adopted route — plus one line per rejected route with the rejection reason — enters the DATUM through the keel module's write path, if one exists.

Temp discipline: working notes live in the system temp directory and are deleted when done. Nothing persists except what you report and what is amended into the DATUM.
