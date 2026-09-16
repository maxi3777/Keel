# Keel — Codex CLI adapter

Installs Keel into the Codex CLI (tested on codex-cli 0.153.x, Windows/Linux, Node ≥ 18).

## Channel mapping

| Keel component | Claude Code / ZCode | Codex CLI |
|---|---|---|
| Skill (protocol) | plugin skills dir | `~/.codex/skills/keel/` (same SKILL.md + references/ layout) |
| MCP server | plugin `.mcp.json` | `~/.codex/config.toml` → `[mcp_servers.keel]` |
| SessionStart / PostToolUse hooks | plugin hooks | **not available** — documented fallback applies: the skill instructs the agent to call `keel_digest` at session start and after every applied core amendment |

Enforcement is unaffected by the missing hooks: DATUM writes remain server-gated (the MCP server is the only legal write path). What Codex loses is only the *automatic* context injection.

## Install / uninstall

```bash
node adapters/codex/install.js                # idempotent
node adapters/codex/install.js --uninstall
```

## Verify

```bash
codex exec --skip-git-repo-check -C /some/scratch/dir \
  --dangerously-bypass-approvals-and-sandbox \
  "call keel_status and paste its result verbatim"
```

A `No .keel/DATUM.md …` error means the MCP wiring is correct; create a design with the normal flow (`/keel <requirement>`-style request, or just say you want to start a Keel design).

## Per-project activation (recommended)

Codex loads `AGENTS.md` from the working directory. To make a project Keel-governed, add to its `AGENTS.md`:

```markdown
This project is governed by Keel. At the start of every session, call `keel_digest`
and follow the `keel` skill protocol for anything touching the design level.
Never edit files under `.keel/` by hand.
```
