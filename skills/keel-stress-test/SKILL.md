---
name: keel-stress-test
description: Assumption stress-test — attack the stated assumptions of a design or plan before committing to it. Use when the user asks to stress-test assumptions, challenge the design's premises, find weak assumptions, or probe whether an idea survives contact with hard scenarios. Part of the Keel iteration tools; works with or without a DATUM.
---

# Assumption stress-test (Keel iteration tool)

1. **Collect the assumptions**: from the conversation, and — if `.keel/DATUM.md` exists — from 01 of the DATUM (lines tagged `[assumption]`, plus anything the design silently depends on) via `keel_read`.
2. **Declare the prediction first**: for each assumption, state before testing what breaks and in which scenario if it is wrong. Never test first and predict after.
3. **Attack each** with the strongest realistic counter-scenario: scale (10×, 100×), time (aging, deadlines, clock/timezone behavior), adversarial users, concurrency, resource limits, empty/full edge states.
4. **Record predicted vs actual**: which assumptions fell, which held, which you could not decide.
5. A fallen assumption → show its ripple (which requirements/principles it supported — `keel_ripple` when a DATUM exists), then draft the revision.
6. Adopted revisions enter the DATUM through the keel module's write path (`keel_write_section`), if a DATUM exists — otherwise report findings only.

Temp discipline: any working notes live in the system temp directory and are deleted when done. Nothing persists except what you report in the conversation and what is amended into the DATUM.
