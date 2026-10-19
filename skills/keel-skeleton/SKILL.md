---
name: keel-skeleton
description: Skeleton test — rebuild the concept model from the requirements and principles alone, then diff against the recorded one; low coverage means the principles are decoration that cannot carry the design. Use when the user asks for a skeleton test, to check whether the principles carry the design, or whether the concept is self-consistent. Part of the Keel iteration tools; requires a notebook.
---

# Skeleton test (Keel iteration tool)

1. **Inputs, strictly limited**: the owning page's 00 (goal/scope + requirements) and the P\* lines of the root page ONLY — read the files directly and take nothing else from them. Do not read the concept model itself.
2. **Rebuild**: entities, flows, invariants — as a reader who knows nothing else about the project.
3. **Evidence quality**: prefer a fresh-context rebuild — a subagent with no conversation history, given ONLY the 00 + P\* text verbatim in its prompt and instructed not to read project files — labeled `external (fresh context)`. Where the host provides no subagent facility, an ephemeral headless run (e.g. `codex exec --ephemeral`) is allowed only with the user's explicit go-ahead — it spawns a separate process with its own cost. Self-simulation only where neither exists, labeled `self-simulated`, with the user told this check is weakened.
4. **Diff against the recorded concept model**: coverage = the share of recorded entities / flows / invariants the rebuild recovers, plus any contradictions found. Zero contradictions is the bar (a contradiction is a finding, not a style issue); coverage below roughly half means the principles are decoration.
5. **Low coverage → the principles are decoration**: report exactly which principle fails to carry which part; propose principle revisions through the keel module's write path (`keel_write_section`, targeting the owning page), if the user adopts them.

Temp discipline: the rebuild output and any working files live in `.keel/tmp/` — created on demand, deleted when done, never anywhere else in the project. Report findings in the conversation; nothing is stored unless amended into the notebook.
