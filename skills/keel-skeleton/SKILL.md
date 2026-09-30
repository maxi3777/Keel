---
name: keel-skeleton
description: Skeleton test — rebuild the concept model from the requirements and principles alone, then diff against the recorded one; low coverage means the principles are decoration that cannot carry the design. Use when the user asks for a skeleton test, to check whether the principles carry the design, or whether the concept is self-consistent. Part of the Keel iteration tools; requires a DATUM.
---

# Skeleton test (Keel iteration tool)

1. **Inputs, strictly limited**: the owning page's 00 (goal/scope + requirements) and the P\* lines of the root page ONLY — read the files directly and take nothing else from them. Do not read the concept model itself.
2. **Rebuild**: entities, flows, invariants — as a reader who knows nothing else about the project.
3. **Evidence quality**: prefer a true fresh-process rebuild where a shell and a host CLI exist — e.g. `codex exec --ephemeral "<00 + P* verbatim> — rebuild the concept model"` (or the host's headless equivalent) — and label the result `external (fresh process)`. Self-simulation only where no such facility exists, labeled `self-simulated (no subagent facility)`, with the user told this check is weakened.
4. **Diff against the recorded concept model**: coverage = the share of recorded entities / flows / invariants the rebuild recovers, plus any contradictions found. Zero contradictions is the bar (a contradiction is a finding, not a style issue); coverage below roughly half means the principles are decoration.
5. **Low coverage → the principles are decoration**: report exactly which principle fails to carry which part; propose principle revisions through the keel module's write path (`keel_write_section`, targeting the owning page), if the user adopts them.

Temp discipline: the rebuild output and any working files are temporary — report findings in the conversation, delete the files. Nothing is stored unless amended into the DATUM.
