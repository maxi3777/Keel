# Steward protocol (glance, post-plan check, maintenance)

## The glance (always — every mode, every session)

After you finish a plan and before implementing: read the digest (a verbatim mechanical excerpt — doc pointer, per-page phase line, **root pins** [goal, out-of-scope, requirements, P\*, invariants, decisions], the **INDEX verbatim** [pages with covers and lastAmend, protected references], recent amendments, habit line; injected at session start and refreshed after every confirm; re-fetch anytime with `keel_digest`) and check the plan against it.

- **Root pins always apply.** They are the lines any session could violate — including sessions that look unrelated. That is why they are injected everywhere.
- **INDEX covers route**: match the plan against `covers`; read only the matched pages (plain markdown, free reads). Zero matches (the plan provably touches no pin and no page) → say so in one line and proceed; an unrelated plan owes the notebook nothing more.
- **Watermark rule**: if a matched page's `lastAmend` is newer than your last read of that page, re-read it — memory of a page is evidence, not the source.
- **No conflict** → proceed with implementation.
- **Conflict** → amend / drop the change / `keel_exempt` with the user (reason required).
- **Disagreement with the notebook itself** → propose an amendment with rationale. The notebook is authoritative, not sacred.

## Post-plan check (steward switch ON)

When the steward switch is on, the glance becomes a structured check at the same point — after planning, never before, so your thinking stays free:

1. Compare the plan against every root pin, then go deeper on the matched pages — their requirements, invariants and decisions.
2. `keel_ripple` the involved claim ids, page names or glossary terms whenever involvement is uncertain.
3. Treat staleRefs last reported by `keel_confirm` or `keel_ripple` as protected documents now suspected outdated — relay to the user.
4. New requirements discovered mid-work: diff against the owning page's 00 first (root for project-global ones) — conflicts and scope growth become visible proposals (with cost estimate and ripple), never silent absorption.
5. Tensions between a plan and a weighted principle escalate to the user with three exits: adjust the weights (reorder the P\* lines on root) / revise the plan / revise the principle.

With the steward switch off, only the glance applies — the habit is yours, the structure is gone.

## Session bootstrap

The SessionStart hook injects the digest verbatim; the PostToolUse hook refreshes it after every confirm. The Codex adapter registers the same hooks in `~/.codex/hooks.json`; on hosts without hooks, call `keel_digest` at session start and after confirmations. The digest's first line is the document pointer — any other workflow in the session may use it to find the notebook.

## Maintenance

- `keel_status`: per-page phases and epochs, switches (configured value vs effective value — effective requires at least one authoritative page), per-page counts, pending proposals, health (oscillation = reference metric).
- When the amendment log grows long → `keel_compact`: you write merged summary entries, the server archives the raw log verbatim (never deleted; it refuses below 5 entries).
- Orphan `## ` blocks on any page (headings no tool can reach) → `keel_clean`; the amendment row records the removed titles, not their bodies.
- **Periodic audit (trigger-based; the README recommends it to the user)**: after major rework, after a compaction, or after a long absence — run `keel_refs_verify` (report, never block; re-admit after intentional changes) and re-check notebook hygiene:
  - every Entity referenced by some Flow or Invariant (an unreferenced entity is usually decoration);
  - every Invariant stated so a cold session can check it;
  - every OPEN line still open — an OPEN that quietly closed is a decision made in practice but never recorded; write the Decision or Requirement it became;
  - **covers still describe their pages** (anchors resolve: paths exist, terms registered, ids homed) — covers rot silently, and missed reads follow;
  - **reopen watch**: a page still draft long after a reset row is protection silently off — name it (no thresholds; the reset row in the log is the marker).
