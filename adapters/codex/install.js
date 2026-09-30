#!/usr/bin/env node
/*
 * Keel → Codex CLI adapter installer.
 *
 * Codex channel mapping:
 *   skills   → ~/.codex/skills/<name>/        (keel + keel-stress-test +
 *              keel-alternatives + keel-relax-probe + keel-skeleton)
 *   MCP      → ~/.codex/config.toml           ([mcp_servers.keel] appended if absent)
 *   hooks    → ~/.codex/hooks.json            (SessionStart → session-start.js;
 *              PostToolUse on keel_confirm → post-confirm.js — same payload
 *              fields and the same {"hookSpecificOutput":{additionalContext}}
 *              output contract as the plugin hooks)
 *
 * Codex trusts non-managed hooks only after the user reviews them once
 * (/hooks; trust is recorded against the hook definition). Re-run that review
 * whenever this installer rewrites the hook commands.
 *
 * Usage:
 *   node adapters/codex/install.js             install (idempotent)
 *   node adapters/codex/install.js --uninstall remove skill dirs + config block + hook entries
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');
const skillsSrc = path.join(repoRoot, 'skills');
const serverSrc = path.join(repoRoot, 'mcp', 'server.js');
const hookSessionStart = path.join(repoRoot, 'hooks', 'session-start.js');
const hookPostConfirm = path.join(repoRoot, 'hooks', 'post-confirm.js');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const skillsDst = path.join(codexHome, 'skills');
const configPath = path.join(codexHome, 'config.toml');
const hooksPath = path.join(codexHome, 'hooks.json');
const CONFIG_MARK = '[mcp_servers.keel]';
const MATCHER = 'keel_confirm|mcp__keel__keel_confirm';
const KEEL_SKILLS = fs.existsSync(skillsSrc)
  ? fs.readdirSync(skillsSrc).filter(n => n === 'keel' || n.startsWith('keel-'))
  : [];

const ours = cmd => typeof cmd === 'string' && (cmd.includes(hookSessionStart) || cmd.includes(hookPostConfirm));
const stripOurHookEntries = hooksObj => {
  const out = {};
  for (const [event, groups] of Object.entries(hooksObj || {})) {
    const kept = (Array.isArray(groups) ? groups : [])
      .map(g => (g && Array.isArray(g.hooks))
        ? { ...g, hooks: g.hooks.filter(h => !(h && h.type === 'command' && !ours(h.command))) }
        : g)
      .filter(g => g && (!Array.isArray(g.hooks) || g.hooks.length));
    if (kept.length) out[event] = kept;
  }
  return out;
};

function uninstall() {
  for (const name of KEEL_SKILLS) fs.rmSync(path.join(skillsDst, name), { recursive: true, force: true });
  if (fs.existsSync(configPath)) {
    const lines = fs.readFileSync(configPath, 'utf8').split(/\r?\n/);
    const out = [];
    let skipping = false;
    for (const ln of lines) {
      if (ln.trim() === CONFIG_MARK) { skipping = true; continue; }
      if (skipping && /^\[/.test(ln)) skipping = false;
      if (!skipping) out.push(ln);
    }
    fs.writeFileSync(configPath, out.join('\n').replace(/\n{3,}/g, '\n\n'));
  }
  if (fs.existsSync(hooksPath)) {
    let hj = null;
    try { hj = JSON.parse(fs.readFileSync(hooksPath, 'utf8')); } catch (_) { hj = null; }
    if (hj && typeof hj === 'object') {
      const cleaned = stripOurHookEntries(hj.hooks);
      if (Object.keys(cleaned).length) fs.writeFileSync(hooksPath, JSON.stringify({ hooks: cleaned }, null, 2) + '\n');
      else fs.rmSync(hooksPath, { force: true });
    }
  }
  console.log(`Keel uninstalled from Codex (${KEEL_SKILLS.length} skill dirs removed; [mcp_servers.keel] stripped; hook entries removed).`);
}

function install() {
  if (!fs.existsSync(skillsSrc)) throw new Error(`skills source not found: ${skillsSrc}`);
  if (!fs.existsSync(serverSrc)) throw new Error(`server not found: ${serverSrc}`);
  fs.mkdirSync(skillsDst, { recursive: true });
  const installed = [];
  for (const name of KEEL_SKILLS) {
    const dst = path.join(skillsDst, name);
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(path.join(skillsSrc, name), dst, { recursive: true });
    installed.push(dst);
  }

  let cfg = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  if (!cfg.includes(CONFIG_MARK)) {
    // TOML literal (single-quoted) strings preserve Windows backslashes verbatim.
    cfg += `\n[mcp_servers.keel]\ncommand = "node"\nargs = ['${serverSrc}']\nstartup_timeout_sec = 60\n`;
    fs.writeFileSync(configPath, cfg);
  }

  // hooks.json (user-level): merge our entries, keep any user entries intact.
  let hj = null;
  if (fs.existsSync(hooksPath)) { try { hj = JSON.parse(fs.readFileSync(hooksPath, 'utf8')); } catch (_) { hj = null; } }
  if (!hj || typeof hj !== 'object' || Array.isArray(hj)) hj = { hooks: {} };
  if (!hj.hooks || typeof hj.hooks !== 'object') hj.hooks = {};
  const hooks = stripOurHookEntries(hj.hooks); // idempotency: drop our previous entries first
  const cmd = p => `node "${p}"`;
  (hooks.SessionStart = hooks.SessionStart || []).push({ hooks: [{ type: 'command', command: cmd(hookSessionStart) }] });
  (hooks.PostToolUse = hooks.PostToolUse || []).push({ matcher: MATCHER, hooks: [{ type: 'command', command: cmd(hookPostConfirm) }] });
  fs.writeFileSync(hooksPath, JSON.stringify(hj, null, 2) + '\n');

  console.log(`Keel v2 installed for Codex:
  skills  → ${installed.join('\n           ')}
  mcp     → ${configPath} (${CONFIG_MARK})
  hooks   → ${hooksPath} (SessionStart; PostToolUse on ${MATCHER})
  server  → ${serverSrc}
Next (one-time): review the hooks in Codex via /hooks so they are trusted —
untrusted hook definitions are skipped silently. Verify with:
  codex exec --skip-git-repo-check -C <some-dir> --dangerously-bypass-approvals-and-sandbox \\
    "call keel_status and paste its result"`);
}

if (process.argv.includes('--uninstall')) uninstall();
else install();
