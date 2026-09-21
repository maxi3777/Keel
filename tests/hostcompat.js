#!/usr/bin/env node
/* Keel host-compatibility gate: mechanically checks the plugin packaging
 * against the portable intersection of host behavior (ZCode + Claude Code).
 * Added after v1.2.1, where three packaging assumptions broke the plugin on
 * ZCode (bare relative MCP arg, shell-style $VAR in hooks, plain-text hook
 * stdout). Run before every release, together with the smoke test:
 *
 *   node tests/hostcompat.js && node tests/smoke.js
 *
 * Rules (sources: cached official plugins' .mcp.json/hooks usage; the
 * zcode-guide diagnosing-mcp / diagnosing-hooks reference):
 *  R1 .mcp.json — plugin-file references must anchor at ${CLAUDE_PLUGIN_ROOT};
 *     hosts resolve bare relative paths against the session working directory.
 *     Template variables expand only for plugin-provided servers.
 *  R2 hooks/hooks.json — only the seven supported events; commands use the
 *     ${...} template form (shell-style $VAR survives only where a POSIX
 *     shell happens to expand env vars — not on Windows); matcher is a valid
 *     regex or absent (invalid regexes silently never match); type stays
 *     "command" ("process" is ZCode-only).
 *  R3 version sync — plugin.json, marketplace.json and server.js agree.
 *  R4 every packaging-referenced file exists (hook scripts, skill files,
 *     references, templates, MCP entry).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let fails = 0;
const ok = (c, msg) => { console.log((c ? '  ok - ' : '  FAIL - ') + msg); if (!c) fails++; };
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// R1 — .mcp.json path anchoring
{
  const mcp = JSON.parse(read('.mcp.json'));
  ok(mcp && mcp.mcpServers && Object.keys(mcp.mcpServers).length > 0, '.mcp.json declares at least one server');
  for (const [name, srv] of Object.entries(mcp.mcpServers)) {
    ok(typeof srv.command === 'string', `.mcp.json ${name}: command is a string`);
    const toks = [srv.command, ...(srv.args || []), ...Object.values(srv.env || {})].filter(Boolean);
    for (const t of toks) {
      const looksLikePath = /\.(js|mjs|cjs|py|sh|ts)$/i.test(t) || /^[.A-Za-z0-9_-]+\//.test(t);
      const anchored = t.startsWith('${') || t.startsWith('/') || t.startsWith('@') || /^[A-Za-z]:[\\/]/.test(t);
      ok(!(looksLikePath && !anchored), `.mcp.json ${name}: "${t}" — plugin-file paths must anchor at \${CLAUDE_PLUGIN_ROOT}`);
    }
    if (srv.args) {
      const entry = srv.args.find(a => a.startsWith('${CLAUDE_PLUGIN_ROOT}'));
      if (entry) {
        const p2 = entry.replace('${CLAUDE_PLUGIN_ROOT}', root);
        ok(fs.existsSync(p2), `.mcp.json ${name}: server entry exists (${path.basename(p2)})`);
      }
    }
  }
}

// R2 — hooks.json host surface
{
  const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse', 'PostToolUseFailure', 'Stop'];
  const KNOWN_VARS = /^\$\{(CLAUDE_PLUGIN_ROOT|ZCODE_PLUGIN_ROOT|CLAUDE_PROJECT_DIR|ZCODE_PROJECT_DIR|CLAUDE_SESSION_ID|user_config\.[A-Za-z0-9_.]+)\}$/;
  const hj = JSON.parse(read('hooks/hooks.json'));
  for (const [ev, groups] of Object.entries(hj.hooks || {})) {
    ok(EVENTS.includes(ev), `hooks.json: event "${ev}" is host-supported (one of the seven)`);
    for (const g of groups || []) {
      if (g.matcher !== undefined) {
        let compiles = true;
        try { new RegExp(g.matcher); } catch (_) { compiles = false; }
        ok(compiles, `hooks.json ${ev}: matcher "${g.matcher}" compiles as a regex (invalid ones never match silently)`);
      }
      for (const h of g.hooks || []) {
        ok(h.type === 'command', `hooks.json ${ev}: type "command" (the portable form; "process" is ZCode-only)`);
        ok(!/\$(?!\{)[A-Za-z_]/.test(h.command), `hooks.json ${ev}: command uses \${...} templates, not shell-style $VAR`);
        for (const v of h.command.match(/\$\{[^}]+\}/g) || []) {
          ok(KNOWN_VARS.test(v), `hooks.json ${ev}: known template variable ${v}`);
        }
        const script = (h.command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, root).match(/"([^"]+)"/) || [])[1];
        if (script) ok(fs.existsSync(script), `hooks.json ${ev}: script exists (${path.basename(script)})`);
      }
    }
  }
}

// R3 — version sync
{
  const pj = JSON.parse(read('.claude-plugin/plugin.json'));
  const mk = JSON.parse(read('.claude-plugin/marketplace.json'));
  const { VERSION } = require('../mcp/server.js');
  ok(/^[a-z0-9][a-z0-9._-]{0,127}$/.test(pj.name || ''), `plugin.json: name "${pj.name}" matches the host pattern`);
  ok(pj.version === VERSION, `version sync: plugin.json ${pj.version} === server.js ${VERSION}`);
  for (const p of mk.plugins || []) {
    ok(p.version === VERSION, `version sync: marketplace.json ${p.name} ${p.version} === server.js ${VERSION}`);
  }
}

// R4 — packaging-referenced files exist
{
  const files = [
    'skills/keel/SKILL.md',
    'templates/DATUM.md', 'templates/TECHNICAL.md', 'templates/AMENDMENTS.md',
    'mcp/server.js',
  ];
  for (const f of files) ok(fs.existsSync(path.join(root, f)), `file exists: ${f}`);
  const skill = read('skills/keel/SKILL.md');
  for (const m of new Set(skill.match(/references\/[A-Za-z0-9_-]+\.md/g) || [])) {
    ok(fs.existsSync(path.join(root, 'skills', 'keel', m)), `SKILL.md reference exists: ${m}`);
  }
}

console.log(fails === 0 ? '\nHOSTCOMPAT PASS' : `\nHOSTCOMPAT FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
