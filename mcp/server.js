#!/usr/bin/env node
/*
 * Keel MCP server v1.0.0 — zero-dependency, stdio JSON-RPC (MCP).
 * Engineering axiom: semantics belong to the AI; determinism belongs to this file.
 * Mechanical duties (never delegated to the model): file/folder creation,
 * DATUM writes with schema validation, append-only amendment log, digest
 * generation as verbatim section slicing (never AI paraphrase), traceability
 * closure over implements/load-bearing links, gate checklist verification,
 * consent tiering with staging for core changes, compaction with archival,
 * health and oscillation reference statistics.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';

const SECTIONS = [
  { id: '00', key: 'intent',     title: '00 Intent' },
  { id: 'G',  key: 'glossary',   title: 'G Glossary' },
  { id: '01', key: 'concept',    title: '01 Concept' },
  { id: '02', key: 'ledger',     title: '02 Trade-off Ledger' },
  { id: '03', key: 'technical',  title: '03 Technical Design' },
  { id: '04', key: 'amendments', title: '04 Amendment Log' },
];
const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map(s => [s.key, s]));
const CORE_REF = /^(P\d|01|00)/; // a traceability reference matching this touches core
const COMPACT_MIN = 5;           // refuse compaction when the log is shorter than this
const G2_KEYS = ['Module boundaries', 'Interface contracts', 'Data model', 'State machines',
  'Error', 'Stack', 'Acceptance', 'Non-functional', 'Risks'];

function makeKeel(root) {
  const dir = path.join(root, '.keel');
  const datumPath = path.join(dir, 'DATUM.md');
  const statePath = path.join(dir, 'state.json');

  const exists = () => fs.existsSync(datumPath);
  function requireInit() { if (!exists()) throw new Error('No .keel/DATUM.md in the current directory. Run keel_init first.'); }
  function readState() {
    try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (_) { return { phase: 'concept', proposals: {}, seq: { proposal: 0, amendment: 0 }, gates: {} }; }
  }
  function writeState(s) { fs.writeFileSync(statePath, JSON.stringify(s, null, 2)); }

  function init(project, force) {
    if (exists() && !force) throw new Error('.keel already exists; pass force=true to rebuild (this discards the current DATUM).');
    fs.mkdirSync(path.join(dir, 'probes'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'archive'), { recursive: true });
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'templates', 'DATUM.md'), 'utf8');
    fs.writeFileSync(datumPath, tpl.split(/\r?\n/).map(l => l.replace('<project>', project || 'Unnamed project')).join('\n'));
    writeState({ phase: 'concept', proposals: {}, seq: { proposal: 0, amendment: 0 }, gates: {} });
    return { created: dir, phase: 'concept', next: 'Extract numbered requirements R*, confirm them with the user one by one, then write section 00 at core level.' };
  }

  // ---------- DATUM parse / serialize ----------
  function parseDatum() {
    const lines = fs.readFileSync(datumPath, 'utf8').split(/\r?\n/);
    const blocks = []; let cur = null;
    for (const ln of lines) {
      const m = ln.match(/^## (.+)$/);
      if (m) { cur = { title: m[1].trim(), lines: [] }; blocks.push(cur); }
      else if (cur) cur.lines.push(ln);
      else blocks.push({ title: null, lines: [ln] });
    }
    return blocks;
  }
  function sectionMeta(title) {
    if (!title) return null;
    const id = title.split(/\s+/)[0];
    return SECTIONS.find(s => s.id === id) || null;
  }
  function serialize(blocks) {
    return blocks.map(b => (b.title ? `## ${b.title}\n` : '') + b.lines.join('\n')).join('\n') + '\n';
  }
  function getSection(key) {
    const b = parseDatum().find(x => { const m = sectionMeta(x.title); return m && m.key === key; });
    return b ? b.lines.join('\n') : null;
  }
  function setSection(key, content) {
    const blocks = parseDatum();
    const body = String(content).replace(/\s+$/, '') + '\n';
    const idx = blocks.findIndex(x => { const m = sectionMeta(x.title); return m && m.key === key; });
    if (idx < 0) blocks.push({ title: SECTION_BY_KEY[key].title, lines: body.split(/\r?\n/) });
    else blocks[idx].lines = body.split(/\r?\n/);
    fs.writeFileSync(datumPath, serialize(blocks));
  }

  // ---------- Amendment log (append-only, server-owned) ----------
  function appendAmendment(e) {
    const st = readState();
    st.seq.amendment += 1;
    const n = st.seq.amendment; writeState(st);
    const row = `| ${n} | ${new Date().toISOString()} | ${e.level} | ${e.position} | ${e.summary} | ${e.overturns || ''} | ${e.consent} |`;
    const lines = (getSection('amendments') || '').split(/\r?\n/);
    let last = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('|')) last = i;
    if (last < 0) {
      lines.push('', '| # | Time | Tier | Location | Summary | Supersedes | Consent |', '|---|---|---|---|---|---|---|', row);
    } else lines.splice(last + 1, 0, row);
    setSection('amendments', lines.join('\n'));
    return n;
  }
  function parseAmendments() {
    return (getSection('amendments') || '').split(/\r?\n/)
      .filter(l => l.startsWith('|') && !/^\|\s*[-: ]+(\|\s*[-: ]+)*\|/.test(l) && !/^\|\s*#/.test(l))
      .map(l => {
        const c = l.split('|').slice(1, -1).map(s => s.trim());
        return { n: c[0], time: c[1], level: c[2], position: c[3], summary: c[4], overturn: c[5], consent: c[6] };
      });
  }

  // ---------- Traceability closure (mechanical ripple computation) ----------
  function parseTechItems() {
    return (getSection('technical') || '').split(/^###\s+/m).slice(1).map(p => {
      const ls = p.split(/\r?\n/);
      const head = ls[0].trim();
      const m = p.match(/implements:\s*([^\n]+)/i);
      const impl = m ? m[1].split(/[,，;；]\s*/).map(s => s.trim()).filter(Boolean) : [];
      return { head, impl, body: p };
    });
  }
  function parseGlossaryRows() {
    return (getSection('glossary') || '').split(/\r?\n/)
      .filter(l => l.startsWith('|') && !/^\|\s*[-: ]+(\|\s*[-: ]+)*\|/.test(l) && !/^\|\s*Term/.test(l))
      .map(l => {
        const c = l.split('|').slice(1, -1).map(s => s.trim());
        return { term: c[0] || '', def: c[1] || '', load: c[2] || '', aliases: c[3] || '', status: c[4] || 'active' };
      })
      .filter(r => r.term && r.status !== 'archived');
  }
  function scanRefs(section, content) {
    // Mechanically extract core-touching traceability references from the content about to be written.
    const refs = new Set();
    if (section === 'technical') {
      for (const m of content.matchAll(/implements:\s*([^\n]+)/gi)) {
        for (const r of m[1].split(/[,，;；]\s*/)) if (CORE_REF.test(r.trim())) refs.add(r.trim());
      }
    } else if (section === 'glossary') {
      for (const l of content.split(/\r?\n/)) {
        if (!l.startsWith('|')) continue;
        const c = l.split('|').slice(1, -1).map(s => s.trim());
        if (c.length >= 3 && c[0] && !/Term/.test(c[0])) {
          for (const r of c[2].split(/[,，;；]/)) if (CORE_REF.test(r.trim())) refs.add(r.trim());
        }
      }
    }
    return [...refs];
  }
  function ripple(targets) {
    const affected = new Set(); const detail = [];
    const items = parseTechItems();
    const terms = parseGlossaryRows();
    for (const t of targets || []) {
      const hit = { target: t, refs: [] };
      for (const it of items) if (it.head.includes(t)) hit.refs.push(...it.impl.filter(r => CORE_REF.test(r)));
      for (const g of terms) if (g.term === t) hit.refs.push(...g.load.split(/[,，;；]/).map(s => s.trim()).filter(r => CORE_REF.test(r)));
      hit.refs = [...new Set(hit.refs)];
      hit.refs.forEach(r => affected.add(r));
      detail.push(hit);
    }
    return { targets, affectedCore: [...affected], note: 'When the closure hits a core reference, the corresponding change must go through the core consent flow.', detail };
  }

  // ---------- Writes and consent tiering ----------
  function applyWrite(prop, consent) {
    setSection(prop.section, prop.content);
    prop.amendmentNo = appendAmendment({
      level: prop.effLevel, position: prop.position,
      summary: prop.summary, overturns: prop.overturns, consent,
    });
  }
  function propose(args) {
    requireInit();
    const { section, content, level, summary, rationale = '', overturns = '', position = '' } = args;
    const meta = SECTION_BY_KEY[section];
    if (!meta) throw new Error(`Unknown section: ${section} (valid: ${SECTIONS.map(s => s.key).join(', ')})`);
    if (section === 'amendments') throw new Error('The amendment log is server-owned; direct writes are forbidden.');
    if (typeof content !== 'string' || !content.trim()) throw new Error('content must be a non-empty string.');
    if (!summary || typeof summary !== 'string' || summary.length > 120) throw new Error('summary is required and must be ≤120 characters.');
    if (level !== 'core' && level !== 'peripheral') throw new Error('level must be "core" or "peripheral".');

    let effLevel = level;
    const closure = scanRefs(section, content);
    if (level === 'peripheral' && closure.length) effLevel = 'core-escalated';

    if (level === 'core' && (!rationale || rationale.length < 8)) {
      throw new Error('Core-level changes require a rationale (≥8 characters): why it changes and what it affects.');
    }

    const prop = {
      id: null, section, content, level, effLevel, summary, rationale, overturns,
      position: position || meta.title, closure, createdAt: new Date().toISOString(),
    };
    if (effLevel === 'peripheral') {
      applyWrite(prop, 'batch-notified');
      return {
        written: true, level: 'peripheral', amendment: prop.amendmentNo,
        note: 'Peripheral tier: mechanically logged. Batch-notify the user at session end / a gate / keel_status.',
      };
    }
    const st = readState();
    st.seq.proposal += 1;
    prop.id = 'PR' + st.seq.proposal;
    st.proposals[prop.id] = prop; writeState(st);
    return {
      written: false, proposalId: prop.id, needsConsent: true, level: effLevel,
      closure, rationale,
      instruction: 'Core-level change: show the user the rationale and the ripple (closure), obtain explicit consent, then call keel_confirm with consent_evidence = the user\'s consenting words.',
    };
  }
  function confirm(args) {
    requireInit();
    const { proposal_id, consent_evidence } = args;
    const st = readState();
    const prop = st.proposals[proposal_id];
    if (!prop) throw new Error(`Proposal not found or already handled: ${proposal_id} (keel_status lists pending proposals).`);
    const ev = (consent_evidence || '').trim();
    if (ev.length < 2) throw new Error('consent_evidence is required: the user\'s consenting words from the conversation (audit trail).');
    applyWrite(prop, `yes ("${ev.slice(0, 40)}")`);
    delete st.proposals[proposal_id]; writeState(st);
    return { written: true, proposal_id, amendment: prop.amendmentNo, level: prop.effLevel };
  }
  function reject(args) {
    const st = readState();
    if (!st.proposals[args.proposal_id]) throw new Error(`Proposal not found: ${args.proposal_id}`);
    delete st.proposals[args.proposal_id]; writeState(st);
    return { rejected: args.proposal_id };
  }

  // ---------- Glossary ----------
  function glossaryRegister(args) {
    requireInit();
    const { term, definition, load_bearing = [], aliases = [] } = args;
    if (!term || !definition) throw new Error('term and definition are required.');
    const row = `| ${term} | ${definition} | ${load_bearing.join('; ')} | ${aliases.join(', ')} | active |`;
    const body = getSection('glossary') || '';
    const lines = body.split(/\r?\n/);
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('|') && lines[i].split('|').slice(1, -1).map(s => s.trim())[0] === term) {
        lines[i] = row; replaced = true; break;
      }
    }
    if (!replaced) {
      let last = -1;
      for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('|')) last = i;
      lines.splice(last + 1, 0, row);
    }
    const level = load_bearing.some(r => CORE_REF.test(String(r).trim())) ? 'core' : 'peripheral';
    return propose({
      section: 'glossary', content: lines.join('\n'), level,
      summary: `Term "${term}" ${replaced ? 'updated' : 'registered'}`,
      rationale: `Load-bearing at: ${load_bearing.join('; ') || '(none declared — treated as peripheral)'}`,
      position: 'G Glossary',
    });
  }

  // ---------- Gates (mechanical checklist; semantic checks belong to the AI) ----------
  function filled(line) { return line && !line.includes('(TBD)'); }
  function gate(g) {
    requireInit();
    const checks = [];
    if (g === 'g1') {
      const intent = getSection('intent') || '';
      checks.push({ item: '00 Goal filled', pass: intent.split(/\r?\n/).some(l => /^-\s*Goal \(one sentence\):/.test(l) && filled(l)) });
      checks.push({ item: '00 Out-of-scope filled', pass: intent.split(/\r?\n/).some(l => /^-\s*Out of scope:/.test(l) && filled(l)) });
      const reqs = intent.split(/\r?\n/).filter(l => /^- Requirement R\d+:/.test(l) && filled(l));
      checks.push({ item: '00 ≥1 confirmed requirement', pass: reqs.length >= 1 });
      const ps = (getSection('concept') || '').split(/\r?\n/).filter(l => /^- P\d+\s*[:：]/.test(l) && filled(l));
      checks.push({ item: '01 design principles 3–5', pass: ps.length >= 3 && ps.length <= 5 });
      checks.push({ item: '02 ≥1 ledger entry (incl. sign-off)', pass: /### L\d+/.test(getSection('ledger') || '') });
      checks.push({ item: 'G ≥1 active glossary term', pass: parseGlossaryRows().length >= 1 });
      checks.push({ item: 'Skeleton test (semantic item — AI runs it, then records)', pass: false });
    } else if (g === 'g2') {
      const items = parseTechItems();
      for (const k of G2_KEYS) {
        const it = items.find(i => i.head.includes(k));
        checks.push({ item: `03 ${k} (filled, with implements)`, pass: !!it && !it.body.includes('(TBD)') && it.impl.length > 0 });
      }
      checks.push({ item: 'User reviewed 03 summary and decision points (semantic item — AI records)', pass: false });
    } else throw new Error('gate supports only g1 | g2.');

    const pass = checks.every(c => c.pass);
    const st = readState();
    st.gates[g] = { pass, at: new Date().toISOString(), checks };
    writeState(st);
    return { gate: g, pass, checks, note: 'Semantic items (skeleton test / user review) must be recorded via keel_gate_record before the gate passes as a whole.' };
  }
  function gateRecord(args) {
    requireInit();
    const { gate: g, item, pass, evidence } = args;
    if (!evidence || evidence.length < 4) throw new Error('Semantic records must include evidence (e.g., skeleton-test coverage, probe file path).');
    const st = readState();
    if (!st.gates[g]) throw new Error(`gate ${g} has not been run yet; call keel_gate first.`);
    const c = st.gates[g].checks.find(c => c.item.startsWith(item));
    if (!c) throw new Error(`Check item not found: ${item}`);
    c.pass = !!pass;
    st.gates[g].pass = st.gates[g].checks.every(c => c.pass);
    writeState(st);
    return { gate: g, pass: st.gates[g].pass };
  }
  function setPhase(to) {
    requireInit();
    const st = readState();
    if (to === 'tech' && !(st.gates.g1 && st.gates.g1.pass)) throw new Error('G1 not passed (hard gate): finish sign-off, keel_gate g1, and the semantic records first.');
    if (to === 'handoff' && !(st.gates.g2 && st.gates.g2.pass)) throw new Error('G2 not passed (hard gate): run keel_gate g2 and the semantic records first.');
    const from = st.phase;
    st.phase = to; writeState(st);
    let snapshot = null;
    if (to === 'handoff') {
      const h = path.join(dir, 'handoff.md');
      fs.copyFileSync(datumPath, h);
      snapshot = h;
    }
    return { from, to, snapshot };
  }

  // ---------- Compaction / exemption / health ----------
  function compact(args) {
    requireInit();
    const entries = args.entries || [];
    if (!entries.length || entries.some(e => !e.position || !e.summary)) {
      throw new Error('entries is required: [{position, summary}] — AI-merged summaries of superseded entries.');
    }
    const rows = parseAmendments();
    if (rows.length < COMPACT_MIN) throw new Error(`Amendment log has only ${rows.length} entries (threshold ${COMPACT_MIN}); no compaction needed.`);
    const arch = path.join(dir, 'archive', `amendments-${rows.length}.md`);
    fs.writeFileSync(arch, '# Archived verbatim snapshot (mechanical copy, never deleted)\n\n' + (getSection('amendments') || ''), { flag: 'w' });
    const st = readState();
    let n = st.seq.amendment;
    const newLines = ['', '| # | Time | Tier | Location | Summary | Supersedes | Consent |', '|---|---|---|---|---|---|---|'];
    for (const e of entries) {
      n += 1;
      newLines.push(`| ${n} | ${new Date().toISOString()} | compaction-summary | ${e.position} | ${e.summary.slice(0, 120)} | | batch-notified |`);
    }
    n += 1;
    newLines.push(`| ${n} | ${new Date().toISOString()} | compaction | 04 Amendment Log | Raw log (${rows.length} entries) archived to ${path.basename(arch)} | | batch-notified |`);
    st.seq.amendment = n; writeState(st);
    setSection('amendments', ['<!-- Append-only, maintained by the server. Latest compaction: see archive/. -->'].concat(newLines).join('\n'));
    return { archived: arch, summaryEntries: entries.length };
  }
  function exempt(args) {
    requireInit();
    const { summary, reason } = args;
    if (!summary || !reason || reason.length < 4) throw new Error('Explicit exemptions require both summary and reason (≥4 characters).');
    const n = appendAmendment({ level: 'exemption', position: '(exemption)', summary: `${summary} — reason: ${reason}`, consent: 'exempted' });
    return { amendment: n, note: 'Exemption recorded: this change conflicts with DATUM but was explicitly waved through by the user.' };
  }
  function health() {
    requireInit();
    const rows = parseAmendments();
    const core = rows.filter(r => /core/.test(r.level));
    const groups = {};
    for (const r of rows) (groups[r.position] = groups[r.position] || []).push(r);
    const oscillating = [];
    for (const [pos, rs] of Object.entries(groups)) {
      const w = rs.filter(r => r.overturn && r.overturn.trim());
      if (w.length >= 2) oscillating.push({ position: pos, reversals: w.length });
    }
    const st = readState();
    return {
      phase: st.phase,
      coreAmendments: core.length, totalAmendments: rows.length,
      oscillation: { note: 'Reference metric only — never a threshold, never gates anything.', groups: oscillating },
      yellowFlag: core.length > 6 ? 'Many core amendments: the concept may never have converged; consider re-running the skeleton test.' : null,
      pendingProposals: Object.values(st.proposals).map(p => ({ id: p.id, summary: p.summary, level: p.effLevel })),
    };
  }
  function digestText() {
    requireInit();
    const L = [`[Keel] phase=${readState().phase}  (mechanical excerpt of DATUM — verbatim, not AI-paraphrased)`];
    for (const ln of (getSection('intent') || '').split(/\r?\n/)) {
      if (/^-\s*(Goal \(one sentence\)|Out of scope|Success criteria):/.test(ln) && filled(ln)) L.push(ln.trim());
      if (/^- Requirement R\d+:/.test(ln) && filled(ln)) L.push(ln.trim());
    }
    for (const ln of (getSection('concept') || '').split(/\r?\n/)) if (/^- P\d+/.test(ln) && filled(ln)) L.push(ln.trim());
    for (const g of parseGlossaryRows().slice(0, 6)) L.push(`Term ${g.term} = ${g.def} (load-bearing: ${g.load})`);
    const rows = parseAmendments();
    if (rows.length) {
      L.push('Recent amendments:');
      for (const r of rows.slice(-3)) L.push(`  #${r.n} [${r.level}] ${r.position} — ${r.summary}`);
    }
    L.push('[Keel/STEWARD] Before editing anything, ask: does this change touch P*, contracts, ownership, or module boundaries? If yes, follow the keel_* amendment protocol — silent divergence is forbidden.');
    return L.join('\n');
  }
  function status() {
    requireInit();
    const st = readState();
    const items = parseTechItems();
    return {
      phase: st.phase,
      gates: Object.fromEntries(Object.entries(st.gates).map(([g, v]) => [g, v.pass])),
      counts: {
        requirements: (getSection('intent') || '').split(/\r?\n/).filter(l => /^- Requirement R\d+:/.test(l) && filled(l)).length,
        principles: (getSection('concept') || '').split(/\r?\n/).filter(l => /^- P\d+\s*[:：]/.test(l) && filled(l)).length,
        terms: parseGlossaryRows().length,
        techFilled: items.filter(i => !i.body.includes('(TBD)') && i.impl.length > 0).length,
        amendments: parseAmendments().length,
      },
      ...health(),
    };
  }

  return {
    exists, init, propose, confirm, reject, ripple, glossaryRegister,
    gate, gateRecord, setPhase, compact, exempt, health, digestText, status,
    getSection,
  };
}

// ---------- MCP tool table ----------
const TOOLS = [
  { name: 'keel_init', description: 'Create .keel/ in the current project (DATUM from template, probes/, archive/, state.json). Refuses to overwrite unless force=true.',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, force: { type: 'boolean' } }, required: ['project'] } },
  { name: 'keel_digest', description: 'Mechanical excerpt of DATUM (verbatim slicing, not AI paraphrase): goal/out-of-scope/requirements/P*/top glossary terms/recent amendments/STEWARD reminder.', inputSchema: { type: 'object', properties: {} } },
  { name: 'keel_status', description: 'Phase, gate states, counts, pending proposals, health summary (incl. the oscillation reference metric).', inputSchema: { type: 'object', properties: {} } },
  { name: 'keel_read', description: 'Read one DATUM section verbatim (intent/glossary/concept/ledger/technical/amendments).', inputSchema: { type: 'object', properties: { section: { type: 'string', enum: ['intent', 'glossary', 'concept', 'ledger', 'technical', 'amendments'] } }, required: ['section'] } },
  { name: 'keel_ripple', description: 'Traceability closure: given 03 item names or glossary terms, mechanically compute the core references (P*/01/00) they touch.', inputSchema: { type: 'object', properties: { targets: { type: 'array', items: { type: 'string' } } }, required: ['targets'] } },
  { name: 'keel_write_section', description: 'Write a DATUM section. Core tier is staged pending consent; peripheral tier applies immediately and is logged; peripheral writes whose traceability closure touches core are auto-escalated to core-escalated staging.',
    inputSchema: { type: 'object', properties: {
      section: { type: 'string', enum: ['intent', 'glossary', 'concept', 'ledger', 'technical'] },
      content: { type: 'string' }, level: { type: 'string', enum: ['core', 'peripheral'] },
      summary: { type: 'string', description: '≤120 characters' }, rationale: { type: 'string' },
      overturns: { type: 'string', description: 'Ledger entries this supersedes, e.g. L3 (feeds the oscillation reference metric)' }, position: { type: 'string' },
    }, required: ['section', 'content', 'level', 'summary'] } },
  { name: 'keel_confirm', description: 'Apply a staged core-tier proposal after the user explicitly consented in the conversation. consent_evidence = the user\'s consenting words (audit trail).',
    inputSchema: { type: 'object', properties: { proposal_id: { type: 'string' }, consent_evidence: { type: 'string' } }, required: ['proposal_id', 'consent_evidence'] } },
  { name: 'keel_reject', description: 'Discard a staged proposal.', inputSchema: { type: 'object', properties: { proposal_id: { type: 'string' } }, required: ['proposal_id'] } },
  { name: 'keel_gate', description: 'Mechanical checklist: g1 (intent/principles/ledger/glossary) or g2 (all nine 03 items filled with implements). Semantic items default to false and are recorded via keel_gate_record.',
    inputSchema: { type: 'object', properties: { gate: { type: 'string', enum: ['g1', 'g2'] } }, required: ['gate'] } },
  { name: 'keel_gate_record', description: 'Record a semantic check result (skeleton test, user review) with evidence. The gate passes as a whole only after every item passes.',
    inputSchema: { type: 'object', properties: { gate: { type: 'string', enum: ['g1', 'g2'] }, item: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['gate', 'item', 'pass', 'evidence'] } },
  { name: 'keel_phase', description: 'Advance the phase: concept→tech requires G1 passed; tech→handoff requires G2 passed and mechanically snapshots handoff.md. Hard gates.',
    inputSchema: { type: 'object', properties: { to: { type: 'string', enum: ['concept', 'tech', 'handoff'] } }, required: ['to'] } },
  { name: 'keel_glossary_register', description: 'Register/update a term. The AI fills the semantic fields, the server persists the row; terms load-bearing at P*/01/00 automatically go through the core consent flow.',
    inputSchema: { type: 'object', properties: { term: { type: 'string' }, definition: { type: 'string' }, load_bearing: { type: 'array', items: { type: 'string' } }, aliases: { type: 'array', items: { type: 'string' } } }, required: ['term', 'definition'] } },
  { name: 'keel_compact', description: 'Compact the amendment log: the AI provides merged summary entries, the server archives the raw log verbatim (never deleted). Refuses below 5 entries.',
    inputSchema: { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', properties: { position: { type: 'string' }, summary: { type: 'string' } }, required: ['position', 'summary'] } } }, required: ['entries'] } },
  { name: 'keel_exempt', description: 'Explicit waiver: a change conflicts with DATUM but the user waves it through; recorded for audit.', inputSchema: { type: 'object', properties: { summary: { type: 'string' }, reason: { type: 'string' } }, required: ['summary', 'reason'] } },
  { name: 'keel_health', description: 'Health summary: core-amendment counts, oscillation reference metric (never a threshold), pending proposals.', inputSchema: { type: 'object', properties: {} } },
];

function startStdio() {
  const keel = makeKeel(process.cwd());
  const IMPL = {
    keel_init: a => keel.init(a.project, a.force),
    keel_digest: () => keel.digestText(),
    keel_status: () => keel.status(),
    keel_read: a => keel.getSection(a.section) || '(empty)',
    keel_ripple: a => keel.ripple(a.targets),
    keel_write_section: a => keel.propose(a),
    keel_confirm: a => keel.confirm(a),
    keel_reject: a => keel.reject(a),
    keel_gate: a => keel.gate(a.gate),
    keel_gate_record: a => keel.gateRecord(a),
    keel_phase: a => keel.setPhase(a.to),
    keel_glossary_register: a => keel.glossaryRegister(a),
    keel_compact: a => keel.compact(a),
    keel_exempt: a => keel.exempt(a),
    keel_health: () => keel.health(),
  };
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) handle(line);
    }
  });
  process.stdin.on('end', () => process.exit(0));
  function send(o) { process.stdout.write(JSON.stringify(o) + '\n'); }
  function handle(line) {
    let msg;
    try { msg = JSON.parse(line); } catch (_) { return; }
    if (msg.id === undefined || msg.id === null) return; // notification
    try {
      let result;
      if (msg.method === 'initialize') {
        result = { protocolVersion: (msg.params && msg.params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'keel', version: VERSION } };
      } else if (msg.method === 'tools/list') result = { tools: TOOLS };
      else if (msg.method === 'tools/call') {
        const { name, arguments: args = {} } = msg.params || {};
        if (!IMPL[name]) throw new Error(`Unknown tool: ${name}`);
        try {
          const r = IMPL[name](args);
          result = { content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r, null, 2) }] };
        } catch (e) {
          result = { isError: true, content: [{ type: 'text', text: 'ERROR: ' + String(e && e.message || e) }] };
        }
      } else if (msg.method === 'ping') result = {};
      else throw new Error(`Unknown method: ${msg.method}`);
      send({ jsonrpc: '2.0', id: msg.id, result });
    } catch (e) {
      send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e && e.message || e) } });
    }
  }
}

if (require.main === module) startStdio();
module.exports = { makeKeel, SECTIONS, VERSION };
