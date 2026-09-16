#!/usr/bin/env node
/* Keel smoke test: spawns the real MCP server and drives a full lifecycle.
 * Covers: initialize → init → core staging/confirm → glossary (core escalation) →
 * concept write → ledger (peripheral direct-write) → G1 (mechanical + semantic) →
 * phase hard gate → 03 write (peripheral auto-escalation) → G2 → handoff snapshot →
 * ripple → exemption → compaction → health/status. */
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

const TECH = ['T1 Module boundaries & responsibilities|P1', 'T2 Interface contracts|P1, P2', 'T3 Data model|P2', 'T4 State machines|P2',
  'T5 Error & edge policy|P2', 'T6 Stack choices & versions|01 Concept model', 'T7 Acceptance criteria|P2', 'T8 Non-functional constraints|P2', 'T9 Risks & open items|P1']
  .map(s => { const [h, impl] = s.split('|'); return `### ${h}\n- implements: ${impl}\n(content pending review)`; }).join('\n\n');

(async () => {
  let r = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  ok(r.result.serverInfo.name === 'keel' && r.result.serverInfo.version === '1.0.0', 'initialize (server version 1.0.0)');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  r = await rpc('tools/list', {});
  const names = r.result.tools.map(t => t.name);
  ok(names.length === 15, `tools/list exposes 15 tools (got ${names.length})`);

  // 1. activation
  r = await jcall('keel_init', { project: 'smoke' });
  ok(fs.existsSync(path.join(tmp, '.keel', 'DATUM.md')), 'keel_init creates DATUM');

  // 2. core write must be staged
  r = await jcall('keel_write_section', { section: 'intent', content: INTENT, level: 'core', summary: 'initial requirements and boundary', rationale: 'requirement baseline confirmed item by item' });
  ok(r.needsConsent === true, 'core write staged (needsConsent)');
  const p1 = r.proposalId;
  r = await jcall('keel_digest', {});
  ok(!String(r).includes('select-and-ask'), 'digest before confirm excludes new requirements');

  // 3. confirm without evidence must fail
  let err = '';
  try { await jcall('keel_confirm', { proposal_id: p1 }); } catch (e) { err = e.message; }
  ok(/consent_evidence/.test(err), 'confirm without consent_evidence rejected');

  r = await jcall('keel_confirm', { proposal_id: p1, consent_evidence: 'confirmed, go with this' });
  ok(r.written === true, 'confirm with evidence writes');
  r = await jcall('keel_digest', {});
  ok(String(r).includes('select-and-ask'), 'digest after confirm includes new requirements (verbatim slice)');

  // 4. glossary: load-bearing at 01 → core escalation
  r = await jcall('keel_glossary_register', { term: 'context event', definition: 'a unit of conversation context with a lifecycle', load_bearing: ['01 Concept model'], aliases: ['event'] });
  ok(r.needsConsent === true && /core/.test(r.level), 'term load-bearing at 01 escalates to core staging');
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'fine' });

  // 5. concept write (core)
  r = await jcall('keel_write_section', { section: 'concept', content: CONCEPT, level: 'core', summary: 'P1–P3 and concept model v1', rationale: 'derivation converged, user signed off' });
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'signed off' });

  // 6. ledger (peripheral, direct write)
  r = await jcall('keel_write_section', { section: 'ledger', content: LEDGER, level: 'peripheral', summary: 'L1 concept sign-off' });
  ok(r.written === true, 'ledger peripheral direct-write');

  // 7. G1: mechanical pass, semantic missing
  r = await jcall('keel_gate', { gate: 'g1' });
  ok(r.pass === false, 'G1 fails while the semantic item is unrecorded');
  ok(r.checks.filter(c => c.pass).length === r.checks.length - 1, 'G1 mechanical checks all pass');
  r = await jcall('keel_gate_record', { gate: 'g1', item: 'Skeleton test', pass: true, evidence: 'probes/0001 high rebuild coverage (subagent rebuild)' });
  ok(r.pass === true, 'G1 passes after the semantic record');

  // 8. phase hard gate
  r = await jcall('keel_phase', { to: 'tech' });
  ok(r.to === 'tech', 'enters technical phase');

  // 9. 03 write: declared peripheral, closure hit → auto-escalation
  r = await jcall('keel_write_section', { section: 'technical', content: TECH, level: 'peripheral', summary: 'T1–T9 technical design' });
  ok(r.needsConsent === true && r.level === 'core-escalated', 'peripheral declaration auto-escalated (core-escalated)');
  ok(Array.isArray(r.closure) && r.closure.length >= 2, `closure hits core refs: ${(r.closure || []).join(',')}`);
  await jcall('keel_confirm', { proposal_id: r.proposalId, consent_evidence: 'confirmed' });

  // 10. G2 + handoff snapshot
  r = await jcall('keel_gate', { gate: 'g2' });
  ok(r.pass === false, 'G2 fails while user-review item is unrecorded');
  await jcall('keel_gate_record', { gate: 'g2', item: 'User reviewed', pass: true, evidence: 'user confirmed 03 summary and 12 decision points' });
  r = await jcall('keel_phase', { to: 'handoff' });
  ok(fs.existsSync(path.join(tmp, '.keel', 'handoff.md')), 'handoff mechanically snapshotted');

  // 11. ripple
  r = await jcall('keel_ripple', { targets: ['T3'] });
  ok(r.affectedCore.includes('P2'), 'ripple: T3 → P2');

  // 12. exemption
  r = await jcall('keel_exempt', { summary: 'temporarily bypass contract C3 for an experiment', reason: 'one-off validation, no design impact' });
  ok(!!r.amendment, 'exemption recorded');

  // 13. health (oscillation = reference metric)
  r = await jcall('keel_health', {});
  ok(/reference/i.test(r.oscillation.note), 'oscillation labeled as reference metric');

  // 14. compaction (7 rows ≥ threshold 5)
  r = await jcall('keel_compact', { entries: [{ position: '00 Intent', summary: 'requirement baseline formed once' }, { position: '03 Technical Design', summary: 'T1–T9 drafted in one pass' }] });
  ok(fs.existsSync(r.archived), 'compaction archives the raw log');
  r = await jcall('keel_status', {});
  ok(r.counts.amendments === 3 && r.phase === 'handoff', `after compaction the log holds 3 rows (got ${r.counts.amendments})`);

  console.log(failed === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failed})`);
  child.kill();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
