---
name: keel-stress-test
description: Assumption stress-test — attack the stated assumptions of a design or plan before committing to it. Use when the user asks to stress-test assumptions, challenge the design's premises, find weak assumptions, or probe whether an idea survives contact with hard scenarios. Part of the Keel iteration tools; works with or without a notebook.
---

# Assumption stress-test (Keel iteration tool)

1. **Collect the assumptions**: from the conversation, and — if a notebook exists — from the concept sections of the relevant pages (root page first; a matched module page if the topic is module-scoped; lines tagged `[assumption]`, plus anything the design silently depends on). All notebook files are plain markdown — read them directly.
2. **Declare the prediction first**: for each assumption, state before testing what breaks and in which scenario if it is wrong. Never test first and predict after.
3. **Attack each** with the strongest realistic counter-scenario: scale (10×, 100×), time (aging, deadlines, clock/timezone behavior), adversarial users, concurrency, resource limits, empty/full edge states.
4. **Record predicted vs actual**: which assumptions fell, which held, which you could not decide. Findings that stay unresolved — undecided assumptions, fallen ones whose revision is not yet adopted — do not evaporate: if a notebook exists, park each as an `- OPEN:` line on the owning page (`keel_write_section`; three slots — question — what it blocks — a safe interim default — with the slot words in the project's language); the same OPEN reappearing across runs is the signal that the weakness is systematic, not incidental.
5. A fallen assumption → show its ripple (which requirements/principles it supported — `keel_ripple` when a notebook exists), then draft the revision.
6. Adopted revisions enter the notebook through the keel module's write path (`keel_write_section`, targeting the owning page), if a notebook exists — otherwise report findings only.

Temp discipline: with a notebook, working notes live in `.keel/tmp/` — created on demand, deleted when done, never anywhere else in the project; without one, in the system temp directory. Nothing persists except what you report in the conversation and what is amended into the notebook.
