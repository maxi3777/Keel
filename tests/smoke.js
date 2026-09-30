#!/usr/bin/env node
/* Keel smoke test v2.2: spawns the real MCP server and drives the v2.2 lifecycle.
 * Covers: initialize → init → draft free writes (no numeric gates) → predicate
 * line formats (P-n, Decision, Entity, Flow, Invariant, OPEN) → digest slices
 * invariants+decisions → mermaid well-formedness (balanced passes, unbalanced
 * quotes and unclosed fences rejected) → no keel_read (reads are free) →
 * declaration via keel_config → staged consent (evidence / anti-clobber /
 * batch one-row) → config flips → protected refs (REF ids / add with and
 * without carries / verify / tamper / staleRefs / direct-write rejection /
 * remove) → glossary edge → pipes rejected → exempt → compaction → orphan
 * cleanup (verified by reading the file) → digest pointer + mode lines →
 * hook output contract → notebook mode. */
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
  try { return JSON.parse(t); } catch (_) { return t; } // text tools (keel_digest)
}

let failed = 0;
function ok(c, msg) { console.log((c ? '  ok - ' : '  FAIL - ') + msg); if (!c) failed++; }
async function expectError(name, args, re, msg) {
  let err = '';
  try { await jcall(name, args); } catch (e) { err = e.message; }
  ok(re.test(err), `${msg} (got: ${err.slice(0, 80) || 'no error'})`);
}

const F = '```'; // markdown fence, kept out of template literals for clarity

const INTENT = `- Goal (one sentence): A local Markdown notes app whose core value is bidirectional links.
- Success criteria: Write [[B]] in note A and see who links to it from B.
- Out of scope: Cloud sync, multi-user editing — because every machine it runs on is single-user.

### Requirements

- Requirement R1: A local Markdown notes app.
- Requirement R2: Bidirectional links between notes.
- Requirement R3: The system must keep working with no network connection at all.`;

const CONCEPT = `### Principles (weighted priorities)

- P1: Files are the single source of truth; every index is a rebuildable cache.

### Decisions (pre-design directions)

- Decision D1: Offline-first, no cloud service — because R3 is a hard boundary — revisit if the user base ever becomes multi-device.

### Concept model

A note is one plain file; links are mentions; everything derived is a cache.

- Entity: note — a plain .md file, addressed by its visible name
- Entity: link — a [[name]] mention inside a note's text
- Flow: rename: 1) find mentions 2) rewrite them 3) refresh the index
- Invariant: deleting the index never loses information
- Invariant: unresolved links stay visible in the note that mentions them

### Open questions (what is knowingly undecided)

- OPEN: how to represent attachments — blocks R3 — default: treat as plain files, no special handling`;

const CONCEPT2 = CONCEPT.replace('every index is a rebuildable cache.', 'every index is a rebuildable cache (v2).');

(async () => {
  let r = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  ok(r.result.serverInfo.version === '2.2.0', 'initialize (server version 2.2.0)');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  r = await rpc('tools/list', {});
  ok(r.result.tools.length === 15, `tools/list exposes 15 tools (got ${r.result.tools.length})`);
  ok(!r.result.tools.some(t => t.name === 'keel_health' || t.name === 'keel_read'), 'keel_health and keel_read are gone (status folded; reads are free)');

  // 1. init
  r = await jcall('keel_init', { project: 'smoke' });
  ok(fs.existsSync(path.join(tmp, '.keel', 'DATUM.md')), 'keel_init creates DATUM.md');
  ok(fs.existsSync(path.join(tmp, '.keel', 'AMENDMENTS.md')), 'keel_init creates AMENDMENTS.md');

  // 2. draft phase: free writes, no numeric gates
  r = await jcall('keel_write_section', { section: 'intent', content: INTENT, level: 'core', summary: 'goal, scope, R1–R3', rationale: 'draft v1' });
  ok(r.written === true && r.bypassedConsent === true, 'draft: core write applies immediately (ai-managed)');
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'P1, D1, model, open question '.repeat(6).trim(), rationale: 'x' });
  ok(r.written === true, 'draft: terse rationale and long summary both pass — no numeric gates');
  await expectError('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'no rationale probe' }, /rationale/,
    'draft: core without any rationale still rejected (presence, not length)');

  // 3. digest slices the new predicate lines
  r = await jcall('keel_digest', {});
  const dig = String(r);
  ok(/^- Invariant: deleting the index/m.test(dig) && /^- Decision D1:/m.test(dig), 'digest carries Invariant and Decision lines');
  ok(/plain markdown — read them directly/.test(dig), 'digest pointer states reads are free');

  // 4. mermaid well-formedness
  r = await jcall('keel_write_section', { section: 'concept', level: 'peripheral', summary: 'valid mermaid', content:
    `${F}mermaid\nflowchart TD\n  A[Note] --> B["Link table"]\n${F}\n\n- Invariant: valid diagram probe` });
  ok(r.written === true, 'balanced mermaid block passes');
  await expectError('keel_write_section', { section: 'concept', level: 'peripheral', summary: 'bad quotes', content:
    `${F}mermaid\nflowchart TD\n  A[Note] --> B["unclosed]\n${F}` }, /unbalanced "/,
    'mermaid with unbalanced double quotes rejected (well-formedness)');
  await expectError('keel_write_section', { section: 'concept', level: 'peripheral', summary: 'unclosed fence', content:
    `${F}mermaid\nflowchart TD\n  A --> B` }, /closing .* fence is missing/,
    'mermaid block without a closing fence rejected');

  // 5. declaration (no auto-activation)
  r = await jcall('keel_glossary_register', { term: 'reverse index', definition: 'derived name-to-notes table, always rebuildable', load_bearing: ['P1'] });
  ok(r.written === true, 'glossary write in draft applies immediately');
  r = await jcall('keel_config', { authoritative: true });
  ok(r.phase === 'authoritative' && r.activated && r.activated.consentMode === true, 'keel_config {authoritative:true} activates (switches default ON)');
  r = await jcall('keel_config', { authoritative: true });
  ok(r.activated === undefined, 're-declaration is a no-op (one-way)');

  // 6. authoritative + consent on: staging
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2, level: 'core', summary: 'P1 wording v2', rationale: 'clarify cache semantics' });
  ok(r.needsConsent === true && r.proposalId, 'core write staged while consent is on');
  const p1 = r.proposalId;
  await expectError('keel_confirm', { proposal_id: p1 }, /consent_evidence/, 'confirm without consent_evidence rejected');
  r = await jcall('keel_confirm', { proposal_id: p1, consent_evidence: '确认' });
  ok(r.written === true && r.level === 'core', 'confirm with (short) evidence writes — presence, not length');

  // 7. anti-clobber + reject
  const cA = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v2)', '(v3)'), level: 'core', summary: 'probe A', rationale: 'clobber probe A' });
  const cB = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v2)', '(v4)'), level: 'core', summary: 'probe B', rationale: 'clobber probe B' });
  r = await jcall('keel_confirm', { proposal_id: cA.proposalId, consent_evidence: 'A first' });
  ok(r.written === true, 'first staged proposal confirms');
  await expectError('keel_confirm', { proposal_id: cB.proposalId, consent_evidence: 'B second' }, /changed after this proposal was staged/,
    'anti-clobber: second proposal refused at confirm');
  r = await jcall('keel_reject', { proposal_id: cB.proposalId });
  ok(r.rejected === cB.proposalId, 'rejected staging discarded');

  // 8. batch: one consent, one row
  const before = (await jcall('keel_status', {})).counts.amendments;
  r = await jcall('keel_write_section', { sections: [
    { section: 'intent', content: INTENT.replace('no special handling', 'no special handling') },
    { section: 'concept', content: CONCEPT2.replace('(v3)', '(v3)') },
  ], level: 'core', summary: 'scope + concept in one logical change', rationale: 'one batch, one consent' });
  ok(r.needsConsent === true && r.sections.length === 2, 'batch staged as one unit');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'batch approved' });
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === before + 1, `batch adds exactly one amendment row (got +${r.counts.amendments - before})`);

  // 9. consent off / on; pending proposals survive
  const surv = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v3)', '(v7)'), level: 'core', summary: 'survive probe', rationale: 'does this survive a flip' });
  r = await jcall('keel_config', { consent: false });
  ok(r.effective.consent === false, 'keel_config turns consent off');
  r = await jcall('keel_status', {});
  ok(r.pendingProposals.length === 1, 'pending proposals survive a switch flip');
  await jcall('keel_reject', { proposal_id: surv.proposalId });
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v3)', '(v5)'), level: 'core', summary: 'consent-off probe', rationale: 'ai-managed write' });
  ok(r.written === true && r.bypassedConsent === true, 'consent OFF: core write applies immediately (ai-managed)');
  r = await jcall('keel_config', { consent: true });
  ok(r.effective.consent === true, 'keel_config turns consent back on (no re-validation required)');

  // 10. protected refs: with carries, and without (refs-only style)
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  const docRel = 'docs/arch-note.md';
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1\n');
  const doc2Rel = 'docs/meeting-notes.md';
  fs.writeFileSync(path.join(tmp, doc2Rel), 'meeting notes\n');
  r = await jcall('keel_ref_add', { path: docRel, carries: ['P1'] });
  ok(r.needsConsent === true && r.closure.includes('P1'), 'ref admission staged; closure = carries');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it' });
  r = await jcall('keel_ref_add', { path: doc2Rel });
  ok(r.needsConsent === true && Array.isArray(r.closure) && r.closure.length === 0, 'ref without carries admitted (empty closure — tamper-evidence only)');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it too' });
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 0 && r.refs.length === 2 && r.refs.some(x => x.ref === 'REF2'), 'both refs verify clean (REF1 with carries, REF2 without)');
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1 — tampered\n');
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 1, 'tamper detected (report-only)');
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1\n');
  r = await jcall('keel_ripple', { targets: ['P1'] });
  ok(r.affectedCore.includes('P1') && r.staleRefs.some(s => s.path === docRel), 'ripple: P1 → affected core + stale ref');
  await expectError('keel_write_section', { section: 'refs', content: '| ref | path | carries | sha256 | admitted | status |', level: 'core', summary: 'direct refs write', rationale: 'should be refused' }, /keel_ref_add/,
    'direct write_section to the refs table refused (hash integrity)');

  // 11. staleRefs on the amending confirm
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v5)', '(v6)'), level: 'core', summary: 'P1 line touched again', rationale: 'stale probe' });
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'stale probe confirmed' });
  ok(r.staleRefs && r.staleRefs.some(s => s.path === docRel), 'confirm returns staleRefs for the protected doc');

  // 12. glossary edge + pipes
  r = await jcall('keel_glossary_register', { term: 'Terminology', definition: 'a term whose name starts with the header word', load_bearing: ['P1'] });
  ok(r.needsConsent === true && r.closure.includes('P1'), '"Terminology" is data, not a header — its load-bearing refs reach the closure');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'register it' });
  await expectError('keel_glossary_register', { term: 'bad|term', definition: 'pipe probe' }, /\|/, 'glossary pipes rejected');
  await expectError('keel_ref_add', { path: docRel, carries: ['P1|P2'] }, /\|/, 'ref pipes rejected');

  // 13. ref removal
  r = await jcall('keel_ref_remove', { ref: 'REF1' });
  ok(r.needsConsent === true, 'ref removal staged');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'retire it' });
  r = await jcall('keel_refs_verify', {});
  ok(r.refs.length === 1 && r.refs[0].ref === 'REF2', 'REF1 retired; the no-carries ref remains (file untouched)');

  // 14. exemption
  r = await jcall('keel_exempt', { summary: 'importer bypasses the rename flow', reason: 'ok' });
  ok(r.amendment > 0, 'exemption recorded (terse reason passes — presence, not length)');
  await expectError('keel_exempt', { summary: 'x', reason: '' }, /reason/, 'exemption without a reason rejected');

  // 15. compaction: lifetime survives
  const lifeBefore = (await jcall('keel_status', {})).coreAmendmentsLifetime;
  r = await jcall('keel_compact', { entries: [{ position: '01 Concept', summary: 'P1 wording evolved v2→v6; essentials unchanged' }] });
  ok(fs.existsSync(path.join(tmp, '.keel', 'archive', path.basename(r.archived))), 'raw log archived verbatim');
  r = await jcall('keel_status', {});
  ok(r.coreAmendmentsLifetime === lifeBefore && r.coreAmendments < r.coreAmendmentsLifetime,
    'compaction resets epoch but never the lifetime counter');

  // 16. orphan cleanup — verified by reading the file (reads are free)
  const datumFile = path.join(tmp, '.keel', 'DATUM.md');
  fs.writeFileSync(datumFile, fs.readFileSync(datumFile, 'utf8') + '\n## Orphan junk block\nstale copy of an early misplacement\n');
  r = await jcall('keel_clean', {});
  ok(r.removed === 1 && /Orphan junk/.test(r.titles.join(',')), 'keel_clean removes orphan ## blocks');
  ok(fs.readFileSync(datumFile, 'utf8').includes('Requirement R1'), 'keyed sections intact after clean (verified by direct file read)');

  // 17. digest: pointer + mode line + match reminder
  r = await jcall('keel_digest', {});
  ok(String(r).startsWith('[Keel] Authoritative design notebook: .keel/DATUM.md'), 'digest leads with the doc pointer');
  ok(/phase=authoritative · consent=on · steward=on/.test(String(r)), 'digest mode line shows phase + switches');
  ok(/Zero matches/.test(String(r)), 'digest habit line carries the zero-match rule');

  // 18. hook output contract
  const hookDir = path.join(__dirname, '..', 'hooks');
  const parseHookOut = (s) => { const t = (s.stdout || '').toString().trim(); return t ? JSON.parse(t) : null; };
  let hs = spawnSync(process.execPath, [path.join(hookDir, 'session-start.js')], {
    cwd: tmp, encoding: 'utf8',
    input: JSON.stringify({ source: 'startup', cwd: tmp }),
  });
  let hj = parseHookOut(hs);
  ok(hs.status === 0 && hj && hj.hookSpecificOutput && hj.hookSpecificOutput.hookEventName === 'SessionStart'
    && String(hj.hookSpecificOutput.additionalContext).startsWith('[Keel] Authoritative design notebook'),
    'session-start drains stdin and emits strict JSON additionalContext (SessionStart)');
  const noDatum = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-nodatum-'));
  hs = spawnSync(process.execPath, [path.join(hookDir, 'session-start.js')], { cwd: noDatum, encoding: 'utf8' });
  ok(hs.status === 0 && (hs.stdout || '').toString().trim() === '', 'session-start silent without .keel');
  let hp = spawnSync(process.execPath, [path.join(hookDir, 'post-confirm.js')], {
    cwd: noDatum, encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'mcp__keel__keel_confirm', tool_response: { ok: true }, cwd: tmp }),
  });
  const pj = parseHookOut(hp);
  ok(hp.status === 0 && pj && pj.hookSpecificOutput.hookEventName === 'PostToolUse'
    && typeof pj.hookSpecificOutput.additionalContext === 'string',
    'post-confirm resolves the project from payload cwd and emits strict JSON (PostToolUse)');
  hp = spawnSync(process.execPath, [path.join(hookDir, 'post-confirm.js')], {
    cwd: tmp, encoding: 'utf8', input: JSON.stringify({ tool_response: { isError: true } }),
  });
  ok(hp.status === 0 && (hp.stdout || '').toString().trim() === '', 'post-confirm silent on failed tool call');

  // 19. notebook mode (factory direct)
  const { makeKeel } = require(path.join(__dirname, '..', 'mcp', 'server.js'));
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-nb-'));
  const k2 = makeKeel(tmp2);
  k2.init('nb', true);
  k2.propose({ section: 'intent', content: INTENT, level: 'core', summary: 'nb intent', rationale: 'notebook mode probe' });
  k2.propose({ section: 'concept', content: CONCEPT, level: 'core', summary: 'nb concept', rationale: 'notebook mode probe' });
  const ract = k2.config({ authoritative: true });
  ok(ract.phase === 'authoritative' && ract.activated && ract.activated.consentMode === false && ract.activated.stewardMode === false,
    'notebook init: declaration keeps both switches OFF');
  const rc = k2.propose({ section: 'concept', content: CONCEPT2, level: 'core', summary: 'nb still free', rationale: 'notebook mode stays free' });
  ok(rc.written === true && rc.bypassedConsent === true, 'notebook mode: core writes stay ai-managed after activation');

  console.log(failed === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failed})`);
  child.kill();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
