---
name: keel-skeleton
description: Skeleton test — rebuild the concept model from the requirements and principles alone, then diff against the recorded one; low coverage means the principles are decoration that cannot carry the design. Use when the user asks for a skeleton test, to check whether the principles carry the design, or whether the concept is self-consistent. Part of the Keel iteration tools; requires a DATUM.
---

# Skeleton test (Keel iteration tool)

1. **Inputs, strictly limited**: 00 (goal + requirements) and the P* lines of 01 ONLY — via `keel_read`. Do not read the concept model itself.
2. **Rebuild**: entities, flows, invariants — as a reader who knows nothing else about the project.
3. **Evidence quality**: prefer a true fresh-process rebuild where a shell and a host CLI exist — e.g. `codex exec --ephemeral "<00 + P* verbatim> — rebuild the concept model"` (or the host's headless equivalent) — and label the result `external (fresh process)`. Self-simulation only where no such facility exists, labeled `self-simulated (no subagent facility)`, with the user told this check is weakened.
4. **Diff against the recorded concept model**: coverage of entities / flows / invariants, and contradictions. Zero contradictions is the bar; a contradiction is a finding, not a style issue.
5. **Low coverage → the principles are decoration**: report exactly which principle fails to carry which part; propose principle revisions through the keel module's write path, if the user adopts them.

Temp discipline: the rebuild output and any probe files are temporary — report findings in the conversation, delete the files. Nothing is stored unless amended into the DATUM.
