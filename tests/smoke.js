#!/usr/bin/env node
/* Keel smoke test v2.3: spawns the real MCP server and drives the v2.3
 * lifecycle. Covers: init (root + INDEX + terms page) -> draft free writes ->
 * digest (per-page phase line, root pins, verbatim index, zero-match +
 * memory-is-evidence habit) -> mermaid well-formedness -> module page add ->
 * global id uniqueness across pages -> per-page declaration (root vs module)
 * -> gating by surface (root staged while orders draft writes free) ->
 * anti-clobber -> batch one-row -> switch flips (pending survives) -> glossary
 * tier via cited authoritative surface (incl. the "Terminology"-is-data edge)
 * -> reopen (snapshot, dropped pending, reverse ripple incl. page-name
 * citations, re-declaration) -> protected refs in INDEX (with/without
 * carries, verify/tamper, staleRefs) -> ripple by id/page/term -> page covers
 * -> page remove (blocked by carrying refs, then archived) -> orphan cleanup
 * -> compaction (lifetime survives) -> hooks (strict JSON, payload cwd) ->
 * notebook mode. */
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
- Out of scope: Cloud sync — because every machine it runs on is single-user.

### Requirements

- Requirement R1: A local Markdown notes app.
- Requirement R2: The system must keep working with no network connection at all.`;

const CONCEPT = `### Principles (weighted priorities, 3–5 items)

- P1: Files are the single source of truth; every index is a rebuildable cache.

### Decisions (pre-design directions)

- Decision D1: Offline-first, no cloud service — because R2 is a hard boundary — revisit if the user base ever becomes multi-device.

### Concept model

A note is one plain file; links are mentions; everything derived is a cache.

- Entity: note — a plain .md file, addressed by its visible name
- Flow: rename: 1) find mentions 2) rewrite them 3) refresh the index
- Invariant: deleting the index never loses information

### Open questions (what is knowingly undecided)

- OPEN: how to represent attachments — blocks R2 — default: treat as plain files`;

const CONCEPT2 = CONCEPT.replace('every index is a rebuildable cache.', 'every index is a rebuildable cache (v2).');
const OINTENT = `- Scope (what this module owns): the orders lifecycle.
- Out of scope (module boundary): payments.

### Requirements

- Requirement R10: An order is immutable once shipped.`;
const OCONCEPT = `### Concept model

- Entity: order — one customer purchase intent
- Invariant: an order never has negative totals

### Decisions (pre-design directions)

- Decision D10: no edits post-ship — because audit — revisit if legal says otherwise

### Open questions (what is knowingly undecided)

- (none open)`;

(async () => {
  let r = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  ok(r.result.serverInfo.version === '2.3.0', 'initialize (server version 2.3.0)');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  r = await rpc('tools/list', {});
  ok(r.result.tools.length === 18, `tools/list exposes 18 tools (got ${r.result.tools.length})`);
  ok(!r.result.tools.some(t => t.name === 'keel_health' || t.name === 'keel_read'), 'keel_health and keel_read stay gone (reads are free)');
  ok(r.result.tools.some(t => t.name === 'keel_page_add' || t.name === 'keel_page_remove' || t.name === 'keel_page_covers'), 'page lifecycle tools present');

  // 1. init: routed notebook
  r = await jcall('keel_init', { project: 'smoke' });
  for (const f of ['DATUM.md', 'INDEX.md', 'AMENDMENTS.md', 'state.json']) ok(fs.existsSync(path.join(tmp, '.keel', f)), `keel_init creates ${f}`);
  ok(fs.existsSync(path.join(tmp, '.keel', 'pages', 'terms.md')), 'keel_init creates pages/terms.md (global glossary)');
  ok(/root \| DATUM\.md/.test(fs.readFileSync(path.join(tmp, '.keel', 'INDEX.md'), 'utf8')), 'INDEX ships root + terms rows');

  // 2. draft free writes on root
  r = await jcall('keel_write_section', { section: 'intent', content: INTENT, level: 'core', summary: 'goal, scope, R1–R2', rationale: 'x' });
  ok(r.written === true && r.bypassedConsent === true, 'draft: root core write applies immediately (ai-managed)');
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'P1 D1 model open '.repeat(6).trim(), rationale: 'x' });
  ok(r.written === true, 'draft: terse rationale and long summary pass — no numeric gates');
  await expectError('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'no rationale probe' }, /rationale/,
    'draft: core without any rationale still rejected (presence, not length)');

  // 3. digest in draft
  r = String(await jcall('keel_digest', {}));
  ok(/pages: root=draft/.test(r) && /no page declared authoritative yet/.test(r), 'digest per-page phase line + undeclared hint');
  ok(/^- Invariant: deleting the index/m.test(r) && /^- Decision D1:/m.test(r), 'digest carries root pins (invariants, decisions)');

  // 4. mermaid well-formedness
  r = await jcall('keel_write_section', { section: 'concept', level: 'peripheral', summary: 'valid mermaid', content:
    `${F}mermaid\nflowchart TD\n  A[Note] --> B["Link table"]\n${F}\n\n- Invariant: valid diagram probe` });
  ok(r.written === true, 'balanced mermaid block passes');
  await expectError('keel_write_section', { section: 'concept', level: 'peripheral', summary: 'bad quotes', content:
    `${F}mermaid\nflowchart TD\n  A[Note] --> B["unclosed]\n${F}` }, /unbalanced "/, 'mermaid unbalanced quotes rejected');
  await expectError('keel_write_section', { section: 'concept', level: 'peripheral', summary: 'unclosed fence', content:
    `${F}mermaid\nflowchart TD\n  A --> B` }, /fence is missing/, 'mermaid without closing fence rejected');

  // 5. module page: add, routing row, id uniqueness
  r = await jcall('keel_page_add', { name: 'orders', covers: ['src/orders/**', 'order'] });
  ok(r.written === true, 'page_add applies immediately while everything is draft');
  ok(fs.existsSync(path.join(tmp, '.keel', 'pages', 'orders.md')), 'page file created from template');
  ok(/\| orders \| pages\/orders\.md \| src\/orders\/\*\*; order \|/.test(fs.readFileSync(path.join(tmp, '.keel', 'INDEX.md'), 'utf8')), 'INDEX carries the covers row');
  r = await jcall('keel_write_section', { page: 'orders', section: 'intent', content: OINTENT, level: 'core', summary: 'orders intent', rationale: 'x' });
  ok(r.written === true, 'module page draft write free');
  r = await jcall('keel_write_section', { page: 'orders', section: 'concept', content: OCONCEPT, level: 'core', summary: 'orders concept', rationale: 'x' });
  ok(r.written === true, 'module page concept write free');
  await expectError('keel_write_section', { page: 'orders', section: 'intent', content: '### Requirements\n\n- Requirement R1: duplicate probe', level: 'core', summary: 'dup', rationale: 'x' }, /globally unique/,
    'claim id defined on another page rejected (global id uniqueness)');

  // 6. per-page declaration: root authoritative, orders stays draft
  r = await jcall('keel_config', { authoritative: true });
  ok(r.activated && r.activated.page === 'root', 'keel_config {authoritative:true} declares the ROOT page (announce note attached)');
  r = await jcall('keel_config', { authoritative: true });
  ok(r.activated === undefined, 're-declaration is a no-op (one-way per epoch)');
  r = await jcall('keel_status', {});
  ok(r.pages.find(p => p.name === 'root').phase === 'authoritative' && r.pages.find(p => p.name === 'orders').phase === 'draft', 'status shows per-page phases');
  ok(r.effective.consent === true && r.effective.steward === true, 'effective switches on with root authoritative');

  // 7. gating by surface
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2, level: 'core', summary: 'P1 wording v2', rationale: 'clarify cache semantics' });
  ok(r.needsConsent === true && r.proposalId, 'root write staged while root is authoritative');
  await expectError('keel_confirm', { proposal_id: r.proposalId }, /consent_evidence/, 'confirm without consent_evidence rejected');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: '确认' });
  ok(r.written === true && r.level === 'core', 'confirm with (short) evidence writes');
  r = await jcall('keel_write_section', { page: 'orders', section: 'intent', content: OINTENT + '\n- Requirement R11: refunds', level: 'core', summary: 'R11', rationale: 'x' });
  ok(r.written === true && r.bypassedConsent === true, 'orders (still draft) writes free while root is authoritative');

  // 8. anti-clobber + reject
  const cA = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v2)', '(v3)'), level: 'core', summary: 'probe A', rationale: 'a' });
  const cB = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v2)', '(v4)'), level: 'core', summary: 'probe B', rationale: 'b' });
  r = await jcall('keel_confirm', { proposal_id: cA.proposalId, consent_evidence: 'A first' });
  ok(r.written === true, 'first staged proposal confirms');
  await expectError('keel_confirm', { proposal_id: cB.proposalId, consent_evidence: 'B second' }, /after staging/, 'anti-clobber: second proposal refused at confirm');
  r = await jcall('keel_reject', { proposal_id: cB.proposalId });
  ok(r.rejected === cB.proposalId, 'rejected staging discarded');

  // 9. batch across sections of one page: one row, one consent
  const before = (await jcall('keel_status', {})).counts.amendments;
  r = await jcall('keel_write_section', { sections: [
    { section: 'intent', content: INTENT },
    { section: 'concept', content: CONCEPT2.replace('(v3)', '(v3)') },
  ], level: 'core', summary: 'one logical change', rationale: 'batch' });
  ok(r.needsConsent === true && r.sections === undefined, 'batch staged as one unit');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'batch approved' });
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === before + 1, `batch adds exactly one amendment row (got +${r.counts.amendments - before})`);

  // 10. switch flips; pending survives
  const surv = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v3)', '(v7)'), level: 'core', summary: 'survive probe', rationale: 's' });
  await jcall('keel_config', { consent: false });
  r = await jcall('keel_status', {});
  ok(r.pendingProposals.length === 1, 'pending proposals survive a switch flip');
  await jcall('keel_reject', { proposal_id: surv.proposalId });
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v3)', '(v5)'), level: 'core', summary: 'consent-off probe', rationale: 'x' });
  ok(r.written === true && r.bypassedConsent === true, 'consent OFF: writes apply immediately (ai-managed)');
  await jcall('keel_config', { consent: true });

  // 11. glossary: tier follows the cited surface; "Terminology" is data
  r = await jcall('keel_glossary_register', { term: 'order', definition: 'one customer purchase intent', load_bearing: ['P1', 'orders'] });
  ok(r.needsConsent === true && r.closure.includes('P1'), 'term citing an authoritative id staged; closure shows the citation');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'register it' });
  r = await jcall('keel_glossary_register', { term: 'Terminology', definition: 'a term whose name starts with the header word', load_bearing: ['P1'] });
  ok(r.needsConsent === true, '"Terminology" is data, not a header — its citations reach the closure');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'ok' });
  await expectError('keel_glossary_register', { term: 'bad|term', definition: 'pipe probe' }, /\|/, 'glossary pipes rejected');

  // 12. protected references live in INDEX
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  const docRel = 'docs/arch-note.md';
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1\n');
  r = await jcall('keel_ref_add', { path: docRel, carries: ['P1'] });
  ok(r.needsConsent === true, 'ref admission staged while any page is authoritative');
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it' });
  ok(/\| REF1 \|/.test(fs.readFileSync(path.join(tmp, '.keel', 'INDEX.md'), 'utf8')), 'ref row lands in INDEX (not DATUM)');
  const doc2Rel = 'docs/meeting-notes.md';
  fs.writeFileSync(path.join(tmp, doc2Rel), 'meeting notes\n');
  r = await jcall('keel_ref_add', { path: doc2Rel });
  ok(r.needsConsent === true && r.closure.length === 0, 'ref without carries staged with empty closure (tamper-evidence only)');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it too' });
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 0 && r.refs.length === 2, 'both refs verify clean');
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1 — tampered\n');
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 1, 'tamper detected (report-only)');
  fs.writeFileSync(path.join(tmp, docRel), 'architecture note v1\n');
  await expectError('keel_write_section', { section: 'refs', content: '| ref | path |', level: 'core', summary: 'direct refs write', rationale: 'x' }, /Unknown section/,
    'refs are not a writable section anymore (INDEX is server-managed)');
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2.replace('(v5)', '(v6)'), level: 'core', summary: 'P1 touched', rationale: 'stale probe' });
  r = await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'stale probe confirmed' });
  ok(r.staleRefs && r.staleRefs.some(s => s.path === docRel), 'confirm returns staleRefs for the carrying doc');

  // 13. ripple by id / page / term
  r = await jcall('keel_ripple', { targets: ['P1'] });
  ok(r.affectedCore.includes('P1') && r.affectedPages.includes('root') && r.staleRefs.some(s => s.ref === 'REF1'), 'ripple by id: affected id+page, stale ref');
  r = await jcall('keel_ripple', { targets: ['orders'] });
  ok(r.affectedPages.includes('orders') && r.affectedCore.includes('R10'), 'ripple by page expands to the page ids');
  r = await jcall('keel_ripple', { targets: ['order'] });
  ok(r.detail[0] && r.detail[0].refs.includes('P1') && r.detail[0].pages.includes('orders'), 'ripple by glossary term resolves citations');

  // 14. page covers
  r = await jcall('keel_page_covers', { page: 'orders', covers: ['src/orders/**', 'api/orders/**'] });
  ok(r.needsConsent === true, 'covers update staged (routing is load-bearing)');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'ok' });
  ok(/api\/orders\/\*\*/.test(fs.readFileSync(path.join(tmp, '.keel', 'INDEX.md'), 'utf8')), 'INDEX covers updated');

  // 15. reopen: declare orders, stage a proposal, reopen it
  r = await jcall('keel_config', { authoritative: true, page: 'orders' });
  ok(r.activated && r.activated.page === 'orders', 'declare orders page');
  r = await jcall('keel_write_section', { page: 'orders', section: 'intent', content: OINTENT + '\n- Requirement R12: exports', level: 'core', summary: 'R12', rationale: 'x' });
  ok(r.needsConsent === true, 'orders writes staged once authoritative');
  const stagedId = r.proposalId;
  r = await jcall('keel_config', { phase: 'draft', page: 'orders' });
  ok(r.reset && r.reset.epoch === 2, 'reopen bumps the epoch');
  ok(fs.existsSync(path.join(tmp, r.reset.snapshot.replace(/\\/g, '/'))) || fs.existsSync(r.reset.snapshot), 'pre-reopen snapshot archived');
  ok(r.reset.droppedProposals.includes(stagedId), 'pending proposals on the page dropped at reopen');
  ok(r.reset.termsToReaffirm.includes('order'), 'reverse ripple flags terms citing the page (page-name citation)');
  ok(/orders=draft/.test(String(await jcall('keel_digest', {}))), 'digest reflects the reopened phase');
  r = await jcall('keel_write_section', { page: 'orders', section: 'intent', content: OINTENT + '\n- Requirement R12: exports', level: 'core', summary: 'R12 again', rationale: 'x' });
  ok(r.written === true, 'reopened page writes free again');
  r = await jcall('keel_config', { authoritative: true, page: 'orders' });
  ok(r.activated && r.activated.epoch === 2, 're-declaration keeps the new epoch (one-way per epoch)');

  // 16. page remove: blocked by carrying refs, then archived
  const doc3Rel = 'docs/order-spec.md';
  fs.writeFileSync(path.join(tmp, doc3Rel), 'order spec\n');
  r = await jcall('keel_ref_add', { path: doc3Rel, carries: ['R10'] });
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it' });
  await expectError('keel_page_remove', { page: 'orders' }, /still backs protected references/, 'page_remove refused while a ref carries the page ids');
  r = await jcall('keel_ref_remove', { ref: 'REF3' });
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'retire it' });
  r = await jcall('keel_page_remove', { page: 'orders' });
  ok(r.needsConsent === true, 'page_remove staged after the blocker is gone');
  ok(r.termsStillCiting.includes('order'), 'page_remove reports terms whose citations go dangling');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'remove it' });
  ok(!fs.existsSync(path.join(tmp, '.keel', 'pages', 'orders.md')), 'page file removed');
  ok(!/\| orders \|/.test(fs.readFileSync(path.join(tmp, '.keel', 'INDEX.md'), 'utf8')), 'INDEX row removed');
  ok(fs.readdirSync(path.join(tmp, '.keel', 'archive')).some(f => f.startsWith('page-orders')), 'page snapshot archived (never deleted)');
  await expectError('keel_config', { authoritative: true, page: 'orders' }, /Unknown page/, 'declaring a removed page errors');

  // 17. orphan cleanup across pages (verified by direct reads)
  const termsFile = path.join(tmp, '.keel', 'pages', 'terms.md');
  fs.writeFileSync(termsFile, fs.readFileSync(termsFile, 'utf8') + '\n## Orphan junk block\nstale copy\n');
  r = await jcall('keel_clean', {});
  ok(r.removed === 1 && /terms: Orphan junk/.test(r.titles.join(',')), 'keel_clean removes orphan blocks on any page');
  ok(fs.readFileSync(termsFile, 'utf8').includes('| order |'), 'glossary rows intact after clean');

  // 18. compaction: lifetime survives
  const lifeBefore = (await jcall('keel_status', {})).coreAmendmentsLifetime;
  r = await jcall('keel_compact', { entries: [{ position: 'root · 01 Concept', summary: 'P1 wording evolved; essentials unchanged' }] });
  ok(fs.existsSync(path.join(tmp, '.keel', 'archive', path.basename(r.archived))), 'raw log archived verbatim');
  r = await jcall('keel_status', {});
  ok(r.coreAmendmentsLifetime === lifeBefore && r.coreAmendments < r.coreAmendmentsLifetime, 'compaction resets epoch but never the lifetime counter');

  // 19. final digest: map, not the territory
  r = String(await jcall('keel_digest', {}));
  ok(r.includes('[Keel] Authoritative notebook: .keel/DATUM.md (root page) + INDEX.md (routing) + pages/'), 'digest pointer describes the routed notebook');
  ok(/pages: root=authoritative · terms=draft/.test(r), 'digest per-page phase line');
  ok(r.includes('| root | DATUM.md |') && r.includes('| terms | pages/terms.md |'), 'digest carries the INDEX verbatim');
  ok(r.includes('zero matches') && r.includes('evidence, not the source'), 'digest habit: zero-match + memory-is-evidence');

  // 20. hooks: strict JSON, payload cwd
  const hookDir = path.join(__dirname, '..', 'hooks');
  const parseHookOut = (s) => { const t = (s.stdout || '').toString().trim(); return t ? JSON.parse(t) : null; };
  let hs = spawnSync(process.execPath, [path.join(hookDir, 'session-start.js')], {
    cwd: tmp, encoding: 'utf8', input: JSON.stringify({ source: 'startup', cwd: tmp }),
  });
  let hj = parseHookOut(hs);
  ok(hs.status === 0 && hj && hj.hookSpecificOutput.hookEventName === 'SessionStart'
    && String(hj.hookSpecificOutput.additionalContext).includes('INDEX.md (routing)'), 'session-start emits the routed digest as strict JSON');
  const noDatum = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-nodatum-'));
  hs = spawnSync(process.execPath, [path.join(hookDir, 'session-start.js')], { cwd: noDatum, encoding: 'utf8' });
  ok(hs.status === 0 && (hs.stdout || '').toString().trim() === '', 'session-start silent without .keel');
  let hp = spawnSync(process.execPath, [path.join(hookDir, 'post-confirm.js')], {
    cwd: noDatum, encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'mcp__keel__keel_confirm', tool_response: { ok: true }, cwd: tmp }),
  });
  const pj = parseHookOut(hp);
  ok(hp.status === 0 && pj && pj.hookSpecificOutput.hookEventName === 'PostToolUse'
    && typeof pj.hookSpecificOutput.additionalContext === 'string', 'post-confirm resolves the project from payload cwd');
  hp = spawnSync(process.execPath, [path.join(hookDir, 'post-confirm.js')], {
    cwd: tmp, encoding: 'utf8', input: JSON.stringify({ tool_response: { isError: true } }),
  });
  ok(hp.status === 0 && (hp.stdout || '').toString().trim() === '', 'post-confirm silent on failed tool call');

  // 21. notebook mode (factory direct): switches stay off
  const { makeKeel } = require(path.join(__dirname, '..', 'mcp', 'server.js'));
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-nb-'));
  const k2 = makeKeel(tmp2);
  k2.init('nb', true);
  k2.propose({ section: 'intent', content: INTENT, level: 'core', summary: 'nb intent', rationale: 'x' });
  const ract = k2.config({ authoritative: true });
  ok(ract.activated && ract.activated.consentMode === false && ract.activated.stewardMode === false, 'notebook init: declaration keeps both switches OFF');
  const rc = k2.propose({ section: 'concept', content: CONCEPT, level: 'core', summary: 'nb concept', rationale: 'x' });
  ok(rc.written === true && rc.bypassedConsent === true, 'notebook mode: writes stay ai-managed after activation');

  console.log(failed === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failed})`);
  child.kill();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
