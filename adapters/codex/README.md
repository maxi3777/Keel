# Keel — Codex CLI adapter

Installs Keel into the Codex CLI (tested on codex-cli 0.153.x, Windows/Linux, Node ≥ 18).

## Channel mapping

| Keel component | Claude Code / ZCode | Codex CLI |
|---|---|---|
| Skill (protocol) | plugin skills dir | `~/.codex/skills/keel/` (same SKILL.md + references/ layout) |
| MCP server | plugin `.mcp.json` | `~/.codex/config.toml` → `[mcp_servers.keel]` |
| SessionStart / PostToolUse hooks | plugin hooks | `~/.codex/hooks.json` — Codex accepts the same event names, payload fields (`session_id`, `cwd`, `tool_response`, …) and the same `{"hookSpecificOutput":{"additionalContext":…}}` output contract, so the plugin's hook scripts run unmodified |

Enforcement is unaffected either way: notebook writes remain server-gated (the MCP server is the only legal write path). The hooks only provide the *automatic* digest injection; with hooks disabled, the skill falls back to calling `keel_digest` at session start and after confirmations.

## Install / uninstall

```bash
node adapters/codex/install.js                # idempotent
node adapters/codex/install.js --uninstall
```

**One-time after install**: review the hooks in Codex via `/hooks` — Codex records trust against the hook definition and silently skips untrusted ones. Re-review whenever the installer rewrites the hook commands (e.g. after the repository moves or a reinstall from another path). If hooks are disabled by policy (`[features] hooks = false`), the documented `keel_digest` fallback applies.

## Verify

```bash
codex exec --skip-git-repo-check -C /some/scratch/dir \
  --dangerously-bypass-approvals-and-sandbox \
  "call keel_status and paste its result verbatim"
```

A `No .keel/DATUM.md …` error means the MCP wiring is correct; start a notebook with a natural-language request (e.g. "record this project with keel"). There are no slash subcommands.

## Per-project activation (recommended)

Codex loads `AGENTS.md` from the working directory. To make a project Keel-governed, add to its `AGENTS.md`:

```markdown
This project is governed by Keel. At the start of every session, call `keel_digest`
(if no hook injected it) and follow the `keel` skill protocol for anything touching
the design level. Never edit files under `.keel/` by hand.
```
