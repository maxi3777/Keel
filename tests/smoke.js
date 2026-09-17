#!/usr/bin/env node
/* Keel smoke test v1.1: spawns the real MCP server and drives a full lifecycle.
 * Covers: initialize → init (3 files) → core staging/confirm → glossary core
 * escalation → concept → ledger (peripheral) → G1 (mechanical + semantic) →
 * phase hard gate → Contract Index write (core) → TECHNICAL write (peripheral
 * auto-escalated via contracts join) → G2 (join integrity) → handoff bundle →
 * ripple (T→C→P join) → protected refs (add / verify / tamper / remove) →
 * exemption → compaction → health/status → digest doc pointer. */
'use strict';
const { spawn } = require('child_process');
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
function call(name, args) { return rpc('tools/call', { name, arguments: args || {} }); }
async function jcall(name, args) {
  const r = await call(name, args);
  if (r.result && r.result.isError) throw new Error(`${name}: ${r.result.content[0].text}`);
  try { return JSON.parse(r.result.content[0].text); }
  catch (_) { return r.result.content[0].text; }
}
let failed = 0;
function ok(cond, msg) {
  if (cond) console.log('  ok -', msg);
  else { failed++; console.error('  FAIL -', msg); }
}

const INTENT = `- Goal (one sentence): Send selected text to an AI, with follow-ups able to refer back to earlier selections
- Success criteria: any earlier selection can be referenced in a follow-up
- Out of scope: no multimodal input
- Requirement R1: select-and-ask
- Requirement R2: follow-ups can refer back to earlier selections`;

const CONCEPT = `### Design principles P* (current priority order, 3–5 items)

- P1: user actions mutate context; they never fire requests directly
- P2: the conversation is the single authoritative source of context (including event expiry rules)
- P3: the concept model uses everyday words; class names are forbidden

### Concept model (entities / flows / boundaries / invariants; no class names)

user action → context event → conversation state → request
invariant: everything in a conversation that influences answers enters via context events

### Parking lot (technical details surfaced during concept phase, deferred to the technical phase)

- (empty)`;

const LEDGER = `### L1 Concept sign-off [decision]
- Tier: core
- Decision: P1–P3 signed off in the current priority order
- Alternatives and why rejected: building the prompt directly and sending it — context is lost on follow-up
- Cost: none
- Evidence: skeleton test probes/0001, high rebuild coverage`;

const INDEX = `| ID | Contract (one line) | implements | detail |
|---|---|---|---|
| C1 | modules own their context events and nothing else | P1 | T1 |
| C2 | every cross-module call passes through conversation state | P2 | T2 |
| C3 | context events expire per the lifecycle rule | P2 | T3 |`;

const TECH = `# Technical Design (derived)

` + ['T1 Module boundaries & responsibilities|C1', 'T2 Interface contracts|C2', 'T3 Data model|C3',
  'T4 State machines|C2', 'T5 Error & edge policy|C2', 'T6 Stack choices & versions|C1',
  'T7 Acceptance criteria|C2', 'T8 Non-functional constraints|C2', 'T9 Risks & open items|C1']
  .map(s => { const [h, c] = s.split('|'); return `### ${h}\n- contracts: ${c}\n(content pending review)`; }).join('\n\n');

(async () => {
  let r = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  ok(r.result.serverInfo.version === '1.2.0', 'initialize (server version 1.2.0)');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  r = await rpc('tools/list', {});
  ok(r.result.tools.length === 19, `tools/list exposes 19 tools (got ${r.result.tools.length})`);

  // 1. activation: three files
  r = await jcall('keel_init', { project: 'smoke' });
  ok(fs.existsSync(path.join(tmp, '.keel', 'DATUM.md')), 'keel_init creates DATUM.md');
  ok(fs.existsSync(path.join(tmp, '.keel', 'TECHNICAL.md')), 'keel_init creates TECHNICAL.md');
  ok(fs.existsSync(path.join(tmp, '.keel', 'AMENDMENTS.md')), 'keel_init creates AMENDMENTS.md');

  // 2. core staging / consent evidence
  r = await jcall('keel_write_section', { section: 'intent', content: INTENT, level: 'core', summary: 'initial requirements and boundary', rationale: 'requirement baseline confirmed item by item' });
  ok(r.needsConsent === true, 'core write staged (needsConsent)');
  const p1 = r.proposalId;
  r = await jcall('keel_digest', {});
  ok(String(r).startsWith('[Keel] Authoritative design document: .keel/DATUM.md'), 'digest leads with the doc pointer');
  ok(!String(r).includes('select-and-ask'), 'digest before confirm excludes new requirements');
  let err = '';
  try { await jcall('keel_confirm', { proposal_id: p1 }); } catch (e) { err = e.message; }
  ok(/consent_evidence/.test(err), 'confirm without consent_evidence rejected');
  r = await jcall('keel_confirm', { proposal_id: p1, consent_evidence: 'confirmed, go with this' });
  ok(r.written === true, 'confirm with evidence writes');

  // 3. glossary escalation
  r = await jcall('keel_glossary_register', { term: 'context event', definition: 'a unit of conversation context with a lifecycle', load_bearing: ['01 Concept model'], aliases: ['event'] });
  ok(r.needsConsent === true && /core/.test(r.level), 'term load-bearing at 01 escalates to core staging');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'fine' });

  // 4. concept + ledger
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'P1–P3 and concept model v1', rationale: 'derivation converged, user signed off' });
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'signed off' });
  r = await jcall('keel_write_section', { section: 'ledger', content: LEDGER, level: 'peripheral', summary: 'L1 concept sign-off' });
  ok(r.written === true, 'ledger peripheral direct-write');

  // 5. G1
  r = await jcall('keel_gate', { gate: 'g1' });
  ok(r.pass === false, 'G1 fails while the semantic item is unrecorded');
  r = await jcall('keel_gate_record', { gate: 'g1', item: 'Skeleton test', pass: true, evidence: 'probes/0001 high rebuild coverage (subagent rebuild)' });
  ok(r.pass === true, 'G1 passes after the semantic record');
  r = await jcall('keel_phase', { to: 'tech' });
  ok(r.to === 'tech', 'enters technical phase');

  // 6. Contract Index (core) then TECHNICAL (peripheral → join escalation)
  r = await jcall('keel_write_section', { section: 'index', content: INDEX, level: 'core', summary: 'C1–C3 contract index', rationale: 'contracts derived from signed-off principles' });
  ok(r.needsConsent === true, 'index write staged as core');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'index approved' });
  r = await jcall('keel_write_section', { section: 'technical', content: TECH, level: 'peripheral', summary: 'T1–T9 elaboration' });
  ok(r.needsConsent === true && r.level === 'core-escalated', 'TECHNICAL peripheral declaration auto-escalated via contracts join');
  ok((r.closure || []).includes('P1') && (r.closure || []).includes('P2'), `join closure hits core: ${(r.closure || []).join(',')}`);
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'confirmed' });

  // 7. G2 join integrity
  r = await jcall('keel_gate', { gate: 'g2' });
  ok(r.pass === false, 'G2 fails while user-review item is unrecorded');
  ok(r.checks.find(c => c.item.includes('contracts')).pass === true, 'G2 contracts join check passes');
  await jcall('keel_gate_record', { gate: 'g2', item: 'User reviewed', pass: true, evidence: 'user confirmed index + 12 decision points' });
  r = await jcall('keel_phase', { to: 'handoff' });
  const ho = fs.readFileSync(r.snapshot, 'utf8');
  ok(ho.includes('# DATUM') && ho.includes('# Technical Design (derived)'), 'handoff bundles DATUM + TECHNICAL');

  // 8. ripple join: T3 → C3 → P2
  r = await jcall('keel_ripple', { targets: ['T3'] });
  ok(r.affectedCore.includes('P2'), 'ripple: T3 → C3 → P2');

  // 9. protected references: add / verify / tamper / remove
  fs.mkdirSync(path.join(tmp, 'docs'));
  fs.writeFileSync(path.join(tmp, 'docs', 'notes.md'), 'renders P2 for the API team\n');
  r = await jcall('keel_ref_add', { path: 'docs/notes.md', carries: ['P2'] });
  ok(r.needsConsent === true, 'ref add staged as core (protection boundary)');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'protect it' });
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 0 && r.refs[0].ok === true, 'ref verify passes at admitted hash');
  fs.appendFileSync(path.join(tmp, 'docs', 'notes.md'), 'extra line added out of protocol\n');
  r = await jcall('keel_refs_verify', {});
  ok(r.mismatches === 1 && r.refs[0].ok === false, 'tamper detected after out-of-protocol edit');
  r = await jcall('keel_ref_remove', { ref: 'R1' });
  ok(r.needsConsent === true, 'ref remove staged as core');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'unprotect' });
  r = await jcall('keel_status', {});
  ok(r.counts.protectedRefs === 0 && r.counts.contracts === 3, 'status counts refs=0, contracts=3');

  // 10. amendment core change reports stale refs
  fs.writeFileSync(path.join(tmp, 'docs', 'notes2.md'), 'another satellite\n');
  r = await jcall('keel_ref_add', { path: 'docs/notes2.md', carries: ['P2'] });
  const pRef = r.proposalId;
  await jcall('keel_confirm', { proposal_id: pRef, consent_evidence: 'ok' });
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT.replace('including event expiry rules', 'including event expiry rules, revised'), level: 'core', summary: 'P2 refined', rationale: 'expiry rule wording clarified with the user' });
  const pP2 = r.proposalId;
  r = await jcall('keel_confirm', { proposal_id: pP2, consent_evidence: 'agreed' });
  ok(Array.isArray(r.staleRefs) && r.staleRefs.some(s => s.ref === 'R1'), 'core amendment reports stale protected refs');

  // 11. exemption, health, compaction
  r = await jcall('keel_exempt', { summary: 'temporarily bypass contract C3 for an experiment', reason: 'one-off validation, no design impact' });
  ok(!!r.amendment, 'exemption recorded');
  r = await jcall('keel_health', {});
  ok(/reference/i.test(r.oscillation.note), 'oscillation labeled as reference metric');
  r = await jcall('keel_compact', { entries: [{ position: '00 Intent', summary: 'requirement baseline formed once' }, { position: 'TECHNICAL.md', summary: 'T1–T9 drafted in one pass' }] });
  ok(fs.existsSync(r.archived), 'compaction archives the raw AMENDMENTS.md');
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === 3 && r.phase === 'handoff', `after compaction the log holds 3 rows (got ${r.counts.amendments})`);

  // 12. orphan-block cleanup
  const datumFile = path.join(tmp, '.keel', 'DATUM.md');
  const before = fs.readFileSync(datumFile, 'utf8');
  fs.writeFileSync(datumFile, before + '\n## Orphan junk block\nstale copy of an early misplacement\n');
  r = await jcall('keel_clean', {});
  ok(r.removed === 1 && /Orphan junk/.test(r.titles.join(',')), 'keel_clean removes orphan ## blocks');
  r = await jcall('keel_read', { section: 'intent' });
  ok(String(r).includes('select-and-ask'), 'keyed sections intact after clean');
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === 4, `maintenance row appended (got ${r.counts.amendments})`);

  // 13. multi-section batch: one consent, one row
  const gl2 = String(await jcall('keel_read', { section: 'glossary' })) + '\n| batch probe | one consent one row | 01 Concept model | | active |';
  const lg2 = LEDGER + '\n### L2 Batch probe [decision]\n- Tier: peripheral\n- Decision: written via multi-section batch\n';
  const cntBefore = (await jcall('keel_status', {})).counts.amendments;
  r = await jcall('keel_write_section', { sections: [{ section: 'ledger', content: lg2 }, { section: 'glossary', content: gl2 }], level: 'peripheral', summary: 'batch: ledger L2 + glossary probe' });
  ok(r.needsConsent === true && r.level === 'core-escalated' && r.sections.length === 2, 'batch escalates as one unit (core-loaded glossary row)');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'batch approved' });
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === cntBefore + 1, `batch adds exactly one amendment row (got +${r.counts.amendments - cntBefore})`);

  // 14. post-handoff mechanical refresh
  const CONCEPT2 = CONCEPT.replace('the conversation is the single authoritative source of context', 'the conversation is the single authoritative source of context (v2)');
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT2, level: 'core', summary: 'P2 wording v2', rationale: 'verify post-handoff rolling refresh' });
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'refresh probe confirmed' });
  const ho2 = fs.readFileSync(path.join(tmp, '.keel', 'handoff.md'), 'utf8');
  ok(ho2.includes('(v2)') && /Snapshot @ amendment #\d+/.test(ho2), 'handoff rolls forward with amendment-annotated header');
  ok(fs.readdirSync(path.join(tmp, '.keel', 'archive')).some(f => /^handoff-/.test(f)), 'replaced handoff frozen to archive/');

  // 15. dual health metrics
  r = await jcall('keel_health', {});
  ok(r.coreAmendmentsLifetime > 0 && /since the last compaction/.test(r.yellowFlagBasis), 'dual health metrics (lifetime + labeled epoch basis)');

  console.log(failed === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failed})`);
  child.kill();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
