#!/usr/bin/env node
/* Keel smoke test v2: spawns the real MCP server and drives the v2 lifecycle.
 * Covers: initialize → init (DATUM + AMENDMENTS, no TECHNICAL) → draft free
 * writes (ai-managed) → readiness activation (switches default on, announced)
 * → staged consent (evidence / anti-clobber / batch one-row) → keel_config
 * flips (consent off = ai-managed immediate) → protected refs (add / verify /
 * tamper / staleRefs on core amendment / remove) → exempt → compaction
 * (lifetime survives) → orphan cleanup → health → digest pointer + mode line
 * → hook output contract (strict JSON / silence) → notebook mode (factory). */
'use strict';
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-smoke-'));
console.log('tmp project:', tmp);
const child = spawn(process.execPath, [path.join(__dirname, '..', 'mcp', 'server.js')], {
  cwd: tmp, stdio: ['pipe', 'pipe', 'inherit'],
});

let buf = '';
const pending = new Map();
let idc = 0;
child.stdout.on('data', d => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const l = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!l) continue;
    const m = JSON.parse(l);
    if (m.id != null && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  }
});
function rpc(method, params) {
  return new Promise(res => {
    const id = ++idc;
    pending.set(id, res);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
async function jcall(name, args) {
  const r = await rpc('tools/call', { name, arguments: args || {} });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.result && r.result.isError) throw new Error(c && c.text);
  const t = c && c.text;
  try { return JSON.parse(t); } catch (_) { return t; } // text tools (keel_read, keel_digest)
}

let failed = 0;
function ok(c, msg) { console.log((c ? '  ok - ' : '  FAIL - ') + msg); if (!c) failed++; }

const INTENT = `- Goal (one sentence): A local Markdown notes app whose core value is bidirectional links.
- Success criteria: Write [[B]] in note A and see who links to it from B.
- Out of scope: Cloud sync, multi-user editing.

### Requirements

- Requirement R1: A local Markdown notes app.
- Requirement R2: Bidirectional links between notes.`;

const CONCEPT = `### Principles (weighted priorities)

- P1: Files are the single source of truth; every index is a rebuildable cache.
- P2: Links address notes by their visible name, stored as plain text.
- P3: Renaming rewrites all mentions synchronously.

### Concept model

Entities: note (a plain .md file), link (a [[name]] mention), index (derived, rebuildable). Flows: open → render from current index; rename → targeted rewrite of mentions. Invariants: deleting the index never loses information; unresolved links stay visible.

### Parking lot

- (empty)`;

const CONCEPT2 = CONCEPT.replace('Files are the single source of truth; every index is a rebuildable cache.',
  'Files are the single source of truth; every index is a rebuildable cache (v2).');

(async () => {
  let r = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  ok(r.result.serverInfo.version === '2.0.0', 'initialize (server version 2.0.0)');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  r = await rpc('tools/list', {});
  ok(r.result.tools.length === 17, `tools/list exposes 17 tools (got ${r.result.tools.length})`);

  // 1. activation: two files, draft phase
  r = await jcall('keel_init', { project: 'smoke' });
  ok(fs.existsSync(path.join(tmp, '.keel', 'DATUM.md')), 'keel_init creates DATUM.md');
  ok(fs.existsSync(path.join(tmp, '.keel', 'AMENDMENTS.md')), 'keel_init creates AMENDMENTS.md');
  ok(!fs.existsSync(path.join(tmp, '.keel', 'TECHNICAL.md')), 'v2 creates no TECHNICAL.md');
  ok(!fs.existsSync(path.join(tmp, '.keel', 'probes')), 'v2 creates no probes/');

  // 2. draft phase: free writes, ai-managed
  r = await jcall('keel_write_section', { section: 'intent', content: INTENT, level: 'core', summary: 'goal, scope, R1–R2', rationale: 'user confirmed requirements item by item' });
  ok(r.written === true && r.bypassedConsent === true, 'draft: core write applies immediately (ai-managed)');
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'P1–P3 and concept model', rationale: 'derivation converged' });
  ok(r.written === true && !r.activated, 'draft: concept written, readiness not yet complete (no glossary term)');
  r = await jcall('keel_status', {});
  ok(r.phase === 'draft' && r.ready.ready === false, 'status reports draft + not ready');

  // 3. the completing write activates: switches default on, announced
  r = await jcall('keel_glossary_register', { term: 'reverse index', definition: 'derived name-to-notes table, always rebuildable', load_bearing: ['P1'] });
  ok(r.written === true && r.activated && r.activated.phase === 'authoritative'
    && r.activated.consentMode === true && r.activated.stewardMode === true,
    'completing write activates the DATUM (switches default ON, announced)');
  r = await jcall('keel_status', {});
  ok(r.phase === 'authoritative' && r.effective.consent === true && r.effective.steward === true, 'effective switches reported');

  // 4. authoritative + consent on: staging
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2, level: 'core', summary: 'P1 wording v2', rationale: 'clarify cache semantics' });
  ok(r.needsConsent === true && r.proposalId, 'core write staged while consent is on');
  const p1 = r.proposalId;
  let err = '';
  try { await jcall('keel_confirm', { proposal_id: p1 }); } catch (e) { err = e.message; }
  ok(/consent_evidence/.test(err), 'confirm without consent_evidence rejected');
  r = await jcall('keel_confirm', { proposal_id: p1, consent_evidence: '确认，就这么改' });
  ok(r.written === true && r.level === 'core', 'confirm with evidence writes');

  // 5. anti-clobber guard
  const cA = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v2)', '(v3)'), level: 'core', summary: 'probe A', rationale: 'clobber probe A' });
  const cB = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v2)', '(v4)'), level: 'core', summary: 'probe B', rationale: 'clobber probe B' });
  r = await jcall('keel_confirm', { proposal_id: cA.proposalId, consent_evidence: 'A first' });
  ok(r.written === true, 'first staged proposal confirms');
  err = '';
  try { await jcall('keel_confirm', { proposal_id: cB.proposalId, consent_evidence: 'B second' }); } catch (e) { err = e.message; }
  ok(/changed after this proposal was staged/.test(err), 'anti-clobber: second proposal refused at confirm');
  r = await jcall('keel_reject', { proposal_id: cB.proposalId });
  ok(r.rejected === cB.proposalId, 'rejected staging discarded');
  r = await jcall('keel_status', {});
  ok(r.pendingProposals.length === 0, 'no pending proposals left');

  // 6. batch: one consent, one row
  const before = (await jcall('keel_status', {})).counts.amendments;
  r = await jcall('keel_write_section', { sections: [
    { section: 'intent', content: INTENT.replace('Cloud sync, multi-user editing.', 'Cloud sync, multi-user editing, plugins.') },
    { section: 'concept', content: CONCEPT2.replace('(v3)', '(v3)') },
  ], level: 'core', summary: 'scope + concept in one logical change', rationale: 'one batch, one consent' });
  ok(r.needsConsent === true && r.sections.length === 2, 'batch staged as one unit');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'batch approved' });
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === before + 1, `batch adds exactly one amendment row (got +${r.counts.amendments - before})`);

  // 7. keel_config: consent off = ai self-management
  r = await jcall('keel_config', { consent: false });
  ok(r.effective.consent === false, 'keel_config turns consent off');
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v3)', '(v5)'), level: 'core', summary: 'consent-off probe', rationale: 'ai-managed write' });
  ok(r.written === true && r.bypassedConsent === true, 'consent OFF: core write applies immediately (ai-managed)');
  r = await jcall('keel_config', { consent: true });
  ok(r.effective.consent === true, 'keel_config turns consent back on (no re-validation required)');

  // 8. protected references lifecycle
  const docRel = 'docs/arch-note.md';
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1\n');
  r = await jcall('keel_ref_add', { path: docRel, carries: ['P1'] });
  ok(r.needsConsent === true, 'ref admission staged (extends protection boundary)');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it' });
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 0 && r.refs.length === 1, 'admitted ref verifies clean');
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1 — tampered\n');
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 1, 'tamper detected (report-only)');
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1\n');
  r = await jcall('keel_ripple', { targets: ['P1'] });
  ok(r.affectedCore.includes('P1') && r.staleRefs.some(s => s.path === docRel), 'ripple: P1 → affected core + stale ref');

  // 9. staleRefs surface on the amending confirm
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v5)', '(v6)'), level: 'core', summary: 'P1 line touched again', rationale: 'stale probe' });
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'stale probe confirmed' });
  ok(r.staleRefs && r.staleRefs.some(s => s.path === docRel), 'confirm returns staleRefs for the protected doc');

  // 10. ref removal
  r = await jcall('keel_ref_remove', { ref: 'R1' });
  ok(r.needsConsent === true, 'ref removal staged');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'retire it' });
  r = await jcall('keel_refs_verify', {});
  ok(r.refs.length === 0, 'ref retired from scope (file untouched)');

  // 11. exemption
  r = await jcall('keel_exempt', { summary: 'importer bypasses the rename flow', reason: 'explicitly waved through for the migration script' });
  ok(r.amendment > 0, 'exemption recorded');

  // 12. compaction: lifetime survives
  const lifeBefore = (await jcall('keel_health', {})).coreAmendmentsLifetime;
  r = await jcall('keel_compact', { entries: [{ position: '01 Concept', summary: 'P1 wording evolved v2→v6; essentials unchanged' }] });
  ok(fs.existsSync(path.join(tmp, '.keel', 'archive', path.basename(r.archived))), 'raw log archived verbatim');
  r = await jcall('keel_health', {});
  ok(r.coreAmendmentsLifetime === lifeBefore && r.coreAmendments < r.coreAmendmentsLifetime,
    'compaction resets epoch but never the lifetime counter');

  // 13. orphan cleanup
  const datumFile = path.join(tmp, '.keel', 'DATUM.md');
  fs.writeFileSync(datumFile, fs.readFileSync(datumFile, 'utf8') + '\n## Orphan junk block\nstale copy of an early misplacement\n');
  r = await jcall('keel_clean', {});
  ok(r.removed === 1 && /Orphan junk/.test(r.titles.join(',')), 'keel_clean removes orphan ## blocks');
  r = await jcall('keel_read', { section: 'intent' });
  ok(String(r).includes('Requirement R1'), 'keyed sections intact after clean');

  // 14. digest: pointer + mode line
  r = await jcall('keel_digest', {});
  ok(String(r).startsWith('[Keel] Authoritative design notebook: .keel/DATUM.md'), 'digest leads with the doc pointer');
  ok(/phase=authoritative · consent=on · steward=on/.test(String(r)), 'digest mode line shows phase + switches');

  // 15. hook output contract
  const hookDir = path.join(__dirname, '..', 'hooks');
  const parseHookOut = (s) => { const t = (s.stdout || '').toString().trim(); return t ? JSON.parse(t) : null; };
  let hs = spawnSync(process.execPath, [path.join(hookDir, 'session-start.js')], { cwd: tmp, encoding: 'utf8' });
  let hj = parseHookOut(hs);
  ok(hs.status === 0 && hj && hj.hookSpecificOutput && hj.hookSpecificOutput.hookEventName === 'SessionStart'
    && String(hj.hookSpecificOutput.additionalContext).startsWith('[Keel] Authoritative design notebook'),
    'session-start emits strict JSON additionalContext (SessionStart)');
  const noDatum = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-nodatum-'));
  hs = spawnSync(process.execPath, [path.join(hookDir, 'session-start.js')], { cwd: noDatum, encoding: 'utf8' });
  ok(hs.status === 0 && (hs.stdout || '').toString().trim() === '', 'session-start silent without .keel');
  let hp = spawnSync(process.execPath, [path.join(hookDir, 'post-confirm.js')], {
    cwd: tmp, encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'mcp__keel__keel_confirm', tool_response: { ok: true } }),
  });
  const pj = parseHookOut(hp);
  ok(hp.status === 0 && pj && pj.hookSpecificOutput.hookEventName === 'PostToolUse'
    && typeof pj.hookSpecificOutput.additionalContext === 'string', 'post-confirm emits strict JSON (PostToolUse)');
  hp = spawnSync(process.execPath, [path.join(hookDir, 'post-confirm.js')], {
    cwd: tmp, encoding: 'utf8', input: JSON.stringify({ tool_response: { isError: true } }),
  });
  ok(hp.status === 0 && (hp.stdout || '').toString().trim() === '', 'post-confirm silent on failed tool call');

  // 16. notebook mode (factory direct): switches stay off through activation
  const { makeKeel } = require(path.join(__dirname, '..', 'mcp', 'server.js'));
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-nb-'));
  const k2 = makeKeel(tmp2);
  k2.init('nb', true);
  k2.propose({ section: 'intent', content: INTENT, level: 'core', summary: 'nb intent', rationale: 'notebook mode probe' });
  k2.propose({ section: 'concept', content: CONCEPT, level: 'core', summary: 'nb concept', rationale: 'notebook mode probe' });
  const rg = k2.glossaryRegister({ term: 'reverse index', definition: 'derived table', load_bearing: ['P1'] });
  ok(rg.written === true && rg.activated && rg.activated.consentMode === false && rg.activated.stewardMode === false,
    'notebook init: activation keeps both switches OFF');
  const rc = k2.propose({ section: 'concept', content: CONCEPT2, level: 'core', summary: 'nb still free', rationale: 'notebook mode stays free' });
  ok(rc.written === true && rc.bypassedConsent === true, 'notebook mode: core writes stay ai-managed after activation');

  console.log(failed === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failed})`);
  child.kill();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
