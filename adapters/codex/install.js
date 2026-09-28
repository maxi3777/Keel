#!/usr/bin/env node
/*
 * Keel → Codex CLI adapter installer.
 *
 * Codex channel mapping (v0.153.x):
 *   skills   → ~/.codex/skills/<name>/        (keel + keel-stress-test +
 *              keel-alternatives + keel-relax-probe + keel-skeleton)
 *   MCP      → ~/.codex/config.toml           ([mcp_servers.keel] appended if absent)
 *   hooks    → not available in Codex; the skill's documented fallback applies:
 *              the agent calls keel_digest at session start and after confirmations
 *
 * Usage:
 *   node adapters/codex/install.js             install (idempotent)
 *   node adapters/codex/install.js --uninstall remove skill dirs + config block
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');
const skillsSrc = path.join(repoRoot, 'skills');
const serverSrc = path.join(repoRoot, 'mcp', 'server.js');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const skillsDst = path.join(codexHome, 'skills');
const configPath = path.join(codexHome, 'config.toml');
const CONFIG_MARK = '[mcp_servers.keel]';
const KEEL_SKILLS = fs.existsSync(skillsSrc)
  ? fs.readdirSync(skillsSrc).filter(n => n === 'keel' || n.startsWith('keel-'))
  : [];

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
  console.log(`Keel uninstalled from Codex (${KEEL_SKILLS.length} skill dirs removed; [mcp_servers.keel] stripped).`);
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
  console.log(`Keel v2 installed for Codex:
  skills  → ${installed.join('\n           ')}
  mcp     → ${configPath} (${CONFIG_MARK})
  server  → ${serverSrc}
Note: Codex has no session hooks; the skill fallback (keel_digest at session start /
after confirmations) applies. Verify with:
  codex exec --skip-git-repo-check -C <some-dir> --dangerously-bypass-approvals-and-sandbox \\
    "call keel_status and paste its result"`);
}

if (process.argv.includes('--uninstall')) uninstall();
else install();
