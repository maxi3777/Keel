---
name: keel-relax-probe
description: Constraint-relaxation probe — systematically ask which constraint, if relaxed, unlocks a better design, and what that relaxation would cost. Use when the user asks to challenge constraints, explore what-if relaxations, probe the boundary of assumptions, or when a design feels over-constrained. Part of the Keel iteration tools; works with or without a DATUM.
---

# Constraint-relaxation probe (Keel iteration tool)

1. **Enumerate the active constraints**: from the conversation and — if a DATUM exists — from 00 (Out of scope) and 01 (P* lines) via `keel_read`.
2. **Declare the prediction first**: for each constraint, predict whether relaxing it would change the design's shape at all, before exploring.
3. **Probe the load-bearing ones**: design as if the constraint were relaxed; measure what breaks — requirements violated, guarantees lost, costs added, who pays.
4. **Record predicted vs actual**. A relaxation that survives contact → propose it as a requirement/principle amendment through the keel module's write path; one that fails → record the rejection reason in one line.
5. Never relax silently: every probed constraint ends as either unchanged (with a better-justified reason) or a visible amendment.

Temp discipline: working notes live in the system temp directory and are deleted when done. Nothing persists except what you report and what is amended into the DATUM.
