#!/usr/bin/env node
/*
 * Keel MCP server v2.3.0 — zero-dependency, stdio JSON-RPC (MCP).
 *
 * Doctrine: Keel is the AI's authoritative NOTEBOOK — a routed set of pages
 * (a root DATUM, a global terminology page, module pages) recording
 * requirements, decisions, invariants and concept models, kept from silently
 * degrading. It does not direct any workflow: the AI thinks freely and, after
 * planning, matches the plan against the injected digest (root pins + the
 * INDEX routing table) and reads only what matched.
 *
 * Layout:
 *   .keel/DATUM.md        root page (00 Intent · 01 Concept incl. global P*)
 *   .keel/INDEX.md        server-maintained routing table: pages (name/path/
 *                         covers/lastAmend) + protected references
 *   .keel/pages/terms.md  global glossary (G)
 *   .keel/pages/<m>.md    module pages (00/01, same altitude, module-scoped)
 *   .keel/AMENDMENTS.md   one global append-only log (Location carries pages)
 *   .keel/state.json      per-page phase/epoch + project switches + proposals
 *
 * Phases are per-page: effective gating for a write =
 *   (target page authoritative OR the change's closure cites an authoritative
 *    surface) AND the project consent switch. Steward is informational.
 * Declaring a page authoritative is the agent's semantic act
 * (keel_config {authoritative:true, page}); reopening is the user-directed
 * inverse (keel_config {phase:'draft', page}) — snapshot to archive, pending
 * proposals on the page dropped, reverse ripple reported.
 *
 * Numeric gates are deliberately absent from the write path: the only
 * mechanical requirements are presence checks (a summary, a rationale for
 * core, consent evidence, an exemption reason), the line formats the parser
 * depends on, global id uniqueness (R-n/P-n/D-n across all pages), and a
 * well-formedness check on mermaid blocks (fence/bracket/quote balance —
 * syntax only, never semantics). Quality is governed by the skill's
 * lifespan-clarity rule, not by counters. Reads are never gated: the notebook
 * files are plain markdown; keel_digest is the map, not the gate.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '2.3.0';

const SECTIONS = [
  { id: '00', key: 'intent',   title: '00 Intent' },
  { id: 'G',  key: 'glossary', title: 'G Glossary' },
  { id: '01', key: 'concept',  title: '01 Concept' },
];
const ID_REF = /^(P|R|D)\d+$/;       // globally unique claim ids across all pages
const PAGE_NAME = /^[a-z][a-z0-9-]{0,31}$/;
const SEP_ROW = /^\|\s*[-: ]+(\|\s*[-: ]+)*\|/; // markdown table separator row

function lastTableRowIndex(lines) {
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('|')) last = i;
  return last;
}

// Well-formedness check for mermaid blocks in page content: fence closure,
// bracket and double-quote balance per block. Syntax only — it never judges
// what the diagram means, and it is deliberately conservative (lines starting
// with %% are mermaid comments and are skipped).
function lintMermaid(text) {
  const problems = [];
  const lines = String(text).split(/\r?\n/);
  let inBlock = false, blockNo = 0, startLine = 0;
  let paren = 0, brack = 0, brace = 0, quotes = 0;
  const flush = () => {
    const unbalanced = [];
    if (paren) unbalanced.push('()');
    if (brack) unbalanced.push('[]');
    if (brace) unbalanced.push('{}');
    if (quotes % 2) unbalanced.push('"');
    if (unbalanced.length) problems.push(`mermaid block ${blockNo} (opening fence at line ${startLine + 1}): unbalanced ${unbalanced.join(' ')}.`);
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const fence = ln.trim().match(/^```([A-Za-z]*)\s*$/);
    if (!inBlock && fence && fence[1] === 'mermaid') {
      inBlock = true; blockNo += 1; startLine = i;
      paren = brack = brace = quotes = 0;
      continue;
    }
    if (inBlock && fence && fence[1] === '') { flush(); inBlock = false; continue; }
    if (inBlock && !ln.trim().startsWith('%%')) {
      for (const ch of ln) {
        if (ch === '"') quotes += 1;
        else if (ch === '(') paren += 1;
        else if (ch === ')') paren -= 1;
        else if (ch === '[') brack += 1;
        else if (ch === ']') brack -= 1;
        else if (ch === '{') brace += 1;
        else if (ch === '}') brace -= 1;
      }
    }
  }
  if (inBlock) problems.push(`mermaid block ${blockNo} (opening fence at line ${startLine + 1}): the closing \`\`\` fence is missing.`);
  return problems;
}

function makeKeel(root) {
  const dir = path.join(root, '.keel');
  const datumPath = path.join(dir, 'DATUM.md');
  const indexPath = path.join(dir, 'INDEX.md');
  const amendmentsPath = path.join(dir, 'AMENDMENTS.md');
  const statePath = path.join(dir, 'state.json');
  const pagesDir = path.join(dir, 'pages');
  const archiveDir = path.join(dir, 'archive');

  const exists = () => fs.existsSync(datumPath);
  function requireInit() { if (!exists()) throw new Error('No .keel/DATUM.md in the current directory. Run keel_init first.'); }
  function pagePath(name) {
    if (name === 'root') return datumPath;
    if (name === 'terms') return path.join(pagesDir, 'terms.md');
    return path.join(pagesDir, `${name}.md`);
  }

  // ---------- state ----------
  function readState() {
    let s = {};
    try { s = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) { /* fresh or corrupt: conservative defaults */ }
    s = Object.assign({ pages: { root: { phase: 'draft', epoch: 1 }, terms: { phase: 'draft', epoch: 1 } },
      consentMode: true, stewardMode: true, proposals: {}, seq: { proposal: 0, amendment: 0 }, coreCount: 0 }, s);
    s.pages = s.pages || {};
    if (!s.pages.root) s.pages.root = { phase: 'draft', epoch: 1 };
    if (!s.pages.terms) s.pages.terms = { phase: 'draft', epoch: 1 };
    return s;
  }
  function writeState(s) { fs.writeFileSync(statePath, JSON.stringify(s, null, 2)); }

  // ---------- page files (guarded core) parse / serialize ----------
  function parsePage(file) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
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
  function getSection(page, key) {
    const b = parsePage(pagePath(page)).find(x => { const m = sectionMeta(x.title); return m && m.key === key; });
    return b ? b.lines.join('\n') : null;
  }
  function setSection(page, key, content) {
    const file = pagePath(page);
    const blocks = parsePage(file);
    const body = String(content).replace(/\s+$/, '') + '\n';
    const idx = blocks.findIndex(x => { const m = sectionMeta(x.title); return m && m.key === key; });
    if (idx < 0) blocks.push({ title: SECTIONS.find(s => s.key === key).title, lines: body.split(/\r?\n/) });
    else blocks[idx].lines = body.split(/\r?\n/);
    fs.writeFileSync(file, serialize(blocks));
  }

  // ---------- claim ids (globally unique across pages) ----------
  function idsInContent(content, onlyKey) {
    const out = new Set();
    const c = String(content);
    if (!onlyKey || onlyKey === 'intent') for (const m of c.matchAll(/^-\s+Requirement (R\d+):/gm)) out.add(m[1]);
    if (!onlyKey || onlyKey === 'concept') {
      for (const m of c.matchAll(/^-\s+(P\d+)\s*[:：]/gm)) out.add(m[1]);
      for (const m of c.matchAll(/^-\s+Decision (D\d+):/gm)) out.add(m[1]);
    }
    return out;
  }
  function pageNames(st) { return Object.keys(st.pages); }
  function idsOfPage(page) {
    try {
      const blocks = parsePage(pagePath(page));
      const out = new Set();
      for (const b of blocks) {
        const m = sectionMeta(b.title);
        if (m) idsInContent(b.lines.join('\n'), m.key).forEach(id => out.add(id));
      }
      return out;
    } catch (_) { return new Set(); }
  }
  function findIdHome(id, st) {
    for (const p of pageNames(st)) if (idsOfPage(p).has(id)) return p;
    return null;
  }
  // A citation is resolvable when it names a claim id or a page.
  function surfacePhaseOf(token, st) {
    const t = String(token).trim();
    if (ID_REF.test(t)) { const home = findIdHome(t, st); return home ? st.pages[home].phase : null; }
    if (st.pages[t]) return st.pages[t].phase;
    return null;
  }

  // ---------- INDEX.md (server-maintained routing table) ----------
  const PAGES_HEAD = ['| page | path | covers | lastAmend |', '|---|---|---|---|'];
  const REFS_HEAD = ['| ref | path | carries | sha256 | admitted | status |', '|---|---|---|---|---|---|'];
  function splitIndex() {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const at = raw.indexOf('## Protected References');
    return at < 0 ? { pages: raw, refs: '' } : { pages: raw.slice(0, at), refs: raw.slice(at) };
  }
  function indexPagesTable() {
    const { pages } = splitIndex();
    const rows = pages.split(/\r?\n/).filter(l => l.startsWith('|') && !SEP_ROW.test(l) && !/^\|\s*page\b/.test(l));
    return rows.map(l => l.split('|').slice(1, -1).map(s => s.trim()));
  }
  function indexRefsTable() {
    const { refs } = splitIndex();
    return refs.split(/\r?\n/).filter(l => l.startsWith('|') && !SEP_ROW.test(l) && !/^\|\s*ref\b/.test(l))
      .map(l => l.split('|').slice(1, -1).map(s => s.trim()));
  }
  function renderIndex(pagesRows, refsRows) {
    return '# Keel Index\n\n' +
      '<!-- Maintained by the Keel MCP server. Manual edits are forbidden.\n' +
      '     Routing: match your plan against `covers`; read only matched pages.\n' +
      '     A provably unrelated plan reads nothing — say "zero matches" and proceed.\n' +
      '     covers anchors are stable vocabulary: repo paths/globs, glossary terms,\n' +
      '     R-n/P-n/D-n claim ids. -->\n\n' +
      PAGES_HEAD.join('\n') + '\n' + pagesRows.map(r => `| ${r.join(' | ')} |`).join('\n') + '\n\n' +
      '## Protected References\n\n' +
      '<!-- Derived documents admitted into the anti-degradation scope. Protection is\n' +
      '     tamper-evidence, not write-gating: whole-file SHA-256 recorded at admission\n' +
      '     and re-checked on verify; edits stay free, mismatches are detected and\n' +
      '     reported. carries = the claim ids (or pages) this document renders; it may\n' +
      '     be empty when the document is protected for its own sake. Adding or\n' +
      '     removing a reference follows the core tier while consent is active. -->\n\n' +
      REFS_HEAD.join('\n') + '\n' + refsRows.map(r => `| ${r.join(' | ')} |`).join('\n') + '\n';
  }
  function writeIndexTables(pagesRows, refsRows) { fs.writeFileSync(indexPath, renderIndex(pagesRows, refsRows)); }
  function setIndexPages(rows) { writeIndexTables(rows, indexRefsTable()); }
  function setIndexRefs(rows) { writeIndexTables(indexPagesTable(), rows); }
  function bumpIndexLastAmend(page, n) {
    const rows = indexPagesTable().map(r => (r[0] === page ? [r[0], r[1], r[2], `#${n}`] : r));
    setIndexPages(rows);
  }

  // ---------- amendment log (append-only, server-owned) ----------
  function appendAmendment(e) {
    const st = readState();
    st.seq.amendment += 1;
    if (/core/.test(e.level)) st.coreCount = (st.coreCount || 0) + 1; // lifetime count, survives compaction
    const n = st.seq.amendment; writeState(st);
    const row = `| ${n} | ${new Date().toISOString()} | ${e.level} | ${e.position} | ${e.summary} | ${e.overturns || ''} | ${e.consent} |`;
    const lines = fs.readFileSync(amendmentsPath, 'utf8').split(/\r?\n/);
    const last = lastTableRowIndex(lines);
    if (last < 0) lines.push('', '| # | Time | Tier | Location | Summary | Supersedes | Consent |', '|---|---|---|---|---|---|---|', row);
    else lines.splice(last + 1, 0, row);
    fs.writeFileSync(amendmentsPath, lines.join('\n'));
    return n;
  }
  function parseAmendments() {
    return fs.readFileSync(amendmentsPath, 'utf8').split(/\r?\n/)
      .filter(l => l.startsWith('|') && !SEP_ROW.test(l) && !/^\|\s*#/.test(l))
      .map(l => {
        const c = l.split('|').slice(1, -1).map(s => s.trim());
        return { n: c[0], time: c[1], level: c[2], position: c[3], summary: c[4], overturn: c[5], consent: c[6] };
      });
  }

  // ---------- structured table rows ----------
  function tableRows(sectionBody, firstColName) {
    const head = new RegExp(`^\\|\\s*${firstColName}\\b`); // \b: "Terminology" is data, not the "Term" header
    return (sectionBody || '').split(/\r?\n/)
      .filter(l => l.startsWith('|') && !SEP_ROW.test(l) && !head.test(l))
      .map(l => l.split('|').slice(1, -1).map(s => s.trim()));
  }
  function parseGlossaryRows() {
    return tableRows(getSection('terms', 'glossary'), 'Term')
      .map(c => ({ term: c[0] || '', def: c[1] || '', load: c[2] || '', aliases: c[3] || '', status: c[4] || 'active' }))
      .filter(r => r.term && r.status !== 'archived');
  }
  function parseRefs() {
    return indexRefsTable()
      .map(c => ({ ref: c[0] || '', path: c[1] || '', carries: (c[2] || '').split(/[,，;；]\s*/).map(s => s.trim()).filter(Boolean), sha: c[3] || '', admitted: c[4] || '', status: c[5] || 'active' }))
      .filter(r => r.ref && r.status === 'active');
  }
  function staleRefsOf(coreRefs, rows) {
    return (rows || parseRefs()).filter(p => p.carries.some(c => coreRefs.includes(c)))
      .map(p => ({ ref: p.ref, path: p.path, carries: p.carries.filter(c => coreRefs.includes(c)) }));
  }

  // ---------- readiness of individual lines (display filter, never a gate) ----------
  function filled(line) { return line && !line.includes('(TBD)'); }

  // ---------- init ----------
  function init(project, notebook) {
    if (exists()) throw new Error('.keel already exists; to rebuild from scratch, delete the directory first (this discards the current notebook).');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.mkdirSync(pagesDir, { recursive: true });
    const tplDir = path.join(__dirname, '..', 'templates');
    const subst = t => t.split(/\r?\n/).map(l => l.replace('<project>', project || 'Unnamed project')).join('\n');
    fs.writeFileSync(datumPath, subst(fs.readFileSync(path.join(tplDir, 'DATUM.md'), 'utf8')));
    fs.writeFileSync(indexPath, fs.readFileSync(path.join(tplDir, 'INDEX.md'), 'utf8'));
    fs.writeFileSync(path.join(pagesDir, 'terms.md'), subst(fs.readFileSync(path.join(tplDir, 'TERMS.md'), 'utf8')));
    fs.writeFileSync(amendmentsPath, fs.readFileSync(path.join(tplDir, 'AMENDMENTS.md'), 'utf8'));
    writeState({ pages: { root: { phase: 'draft', epoch: 1 }, terms: { phase: 'draft', epoch: 1 } },
      consentMode: !notebook, stewardMode: !notebook, proposals: {}, seq: { proposal: 0, amendment: 0 }, coreCount: 0 });
    return {
      created: dir, files: ['DATUM.md', 'INDEX.md', 'pages/terms.md', 'AMENDMENTS.md'],
      mode: notebook ? 'notebook (consent and steward stay off)' : 'guarded (switches default on at activation)',
      next: 'Record the essentials in the user\'s own words on the root page: goal, out-of-scope and requirements R* in 00; principles, decisions D*, the concept model (Entity/Flow/Invariant lines) and open questions in 01; load-bearing terms on the terms page. Add module pages (keel_page_add) when the project grows — single-module is just an INDEX with no module rows yet. Nothing is gated while a page is draft. Declare pages authoritative per page via keel_config {authoritative:true, page}.',
    };
  }

  // ---------- writes and consent tiering ----------
  function applyProp(prop, consent) {
    const st = readState();
    for (const e of prop.entries) {
      if (e.kind === 'section') setSection(e.page, e.section, e.content);
      else if (e.kind === 'index-pages') setIndexPages(e.rows);
      else if (e.kind === 'index-refs') setIndexRefs(e.rows);
      else if (e.kind === 'page-add') {
        fs.writeFileSync(pagePath(e.name), substPage(e.name));
        st.pages[e.name] = { phase: 'draft', epoch: 1 };
        setIndexPages(e.rows);
      } else if (e.kind === 'page-remove') {
        fs.renameSync(pagePath(e.name), path.join(archiveDir, `page-${e.name}-epoch${e.epoch}-${Date.now()}.md`));
        delete st.pages[e.name];
        for (const id of Object.keys(st.proposals)) if (st.proposals[id].page === e.name) delete st.proposals[id];
        setIndexPages(e.rows);
      }
    }
    writeState(st);
    const n = appendAmendment({ level: prop.effLevel, position: prop.position, summary: prop.summary, overturns: prop.overturns, consent });
    const touchedPages = [...new Set(prop.entries.filter(e => e.kind === 'section').map(e => e.page))];
    for (const p of touchedPages) bumpIndexLastAmend(p, n);
    return n;
  }
  function substPage(name) {
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'templates', 'PAGE.md'), 'utf8');
    return tpl.split(/\r?\n/).map(l => l.replace('<page>', name)).join('\n');
  }

  function propose(args, opts) {
    requireInit();
    const st0 = readState();
    const { sections, section, content, page = 'root', level, summary, rationale = '', overturns = '', position = '' } = args;
    const list = Array.isArray(sections) && sections.length
      ? sections
      : (section !== undefined || content !== undefined ? [{ section, content }] : []);
    if (!list.length && !(opts && opts.ops && opts.ops.length)) throw new Error('Provide section+content, a non-empty sections:[…], or a structural op.');
    const seen = new Set();
    const entries = [];
    const checkPages = new Set();

    for (const e of list) {
      const meta = SECTIONS.find(s => s.key === e.section);
      if (!meta) throw new Error(`Unknown section: ${e.section} (valid: ${SECTIONS.map(s => s.key).join(', ')})`);
      if (e.section === 'amendments') throw new Error('The amendment log is server-owned; direct writes are forbidden.');
      const targetPage = e.section === 'glossary' ? 'terms' : page;
      if (!st0.pages[targetPage]) throw new Error(`Unknown page: ${targetPage} (known: ${pageNames(st0).join(', ')})`);
      if (e.section === 'glossary' && page !== 'terms' && page !== 'root')
        throw new Error('The glossary lives on the terms page only.');
      const key = targetPage + '/' + e.section;
      if (seen.has(key)) throw new Error(`Duplicate section in batch: ${targetPage} ${e.section}`);
      seen.add(key);
      if (typeof e.content !== 'string' || !e.content.trim()) throw new Error(`content for "${e.section}" must be a non-empty string.`);
      if (/^##\s/m.test(e.content)) {
        throw new Error(`Section content for "${e.section}" must not contain "## " headings — "##" is reserved for section boundaries and would split the section during parsing. Use "###" or lower inside sections.`);
      }
      for (const p of lintMermaid(e.content)) {
        throw new Error(`${p} Fix the block or remove the mermaid fence. (Well-formedness only — what the diagram says stays yours.)`);
      }
      // Global id uniqueness: ids defined in this content may not exist on
      // other pages, nor twice within the batch, nor elsewhere on the target.
      const dup = (id, where) => new Error(`Claim id ${id} is already defined on ${where}. Ids are globally unique across all pages — reuse or renumber.`);
      const ids = [...idsInContent(e.content)];
      const withinContent = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (withinContent.length) throw dup(withinContent[0], 'this very content (defined twice)');
      for (const id of ids) {
        for (const other of pageNames(st0)) {
          if (other === targetPage) continue;
          if (idsOfPage(other).has(id)) throw dup(id, `page ${other}`);
        }
        // Same page, other sections (the section being replaced is allowed to keep its ids).
        const blocks = parsePage(pagePath(targetPage));
        for (const b of blocks) {
          const m = sectionMeta(b.title);
          if (m && m.key !== e.section && idsInContent(b.lines.join('\n'), m.key).has(id)) throw dup(id, `page ${targetPage} (${m.title})`);
        }
      }
      entries.push({ kind: 'section', page: targetPage, section: e.section, content: e.content, title: meta.title, baseContent: getSection(targetPage, e.section) });
      checkPages.add(targetPage);
    }
    for (const op of (opts && opts.ops) || []) {
      if (op.kind === 'index-refs' || op.kind === 'index-pages') {
        entries.push({ ...op, baseTable: op.kind === 'index-refs' ? indexRefsTable() : indexPagesTable() });
      } else if (op.kind === 'page-add') {
        if (!PAGE_NAME.test(op.name)) throw new Error(`Page name must match ${PAGE_NAME} (kebab-case): ${op.name}`);
        if (st0.pages[op.name] || fs.existsSync(pagePath(op.name))) throw new Error(`Page already exists: ${op.name}`);
        if (String(op.covers).includes('|')) throw new Error('covers must not contain "|" — it breaks the table row.');
        op.rows = [...indexPagesTable(), [op.name, `pages/${op.name}.md`, op.covers, '—']];
        entries.push({ ...op, baseTable: indexPagesTable() });
      } else if (op.kind === 'page-remove') {
        if (!st0.pages[op.name] || op.name === 'root' || op.name === 'terms') throw new Error(`Page not removable: ${op.name} (root and terms are structural; removable: module pages only)`);
        const ids = [...idsOfPage(op.name)];
        const blocking = parseRefs().filter(p => p.carries.some(c => ids.includes(c)));
        if (blocking.length) throw new Error(`Page ${op.name} still backs protected references (${blocking.map(b => b.ref).join(', ')} via ${ids.join(', ') || '(no ids)'}). Re-point or remove those references first.`);
        op.rows = indexPagesTable().filter(r => r[0] !== op.name);
        entries.push({ ...op, baseTable: indexPagesTable(), epoch: st0.pages[op.name].epoch });
      } else throw new Error(`Unknown structural op: ${op.kind}`);
    }
    if (!entries.length) throw new Error('Nothing to write.');
    if (!summary || typeof summary !== 'string' || !summary.trim()) throw new Error('summary is required: a one-line description of the change.');
    if (level !== 'core' && level !== 'peripheral') throw new Error('level must be "core" or "peripheral".');

    // Closure: the claim ids / pages this change touches beyond itself.
    const closure = new Set();
    if (opts && Array.isArray(opts.closure)) for (const r of opts.closure) if (r) closure.add(String(r).trim());
    else for (const e of entries) if (e.kind === 'section') scanClosure(e.section, e.content).forEach(r => closure.add(r));

    let effLevel = level;
    const structural = entries.some(e => e.kind !== 'section');
    const anyAuth = pageNames(st0).some(p => st0.pages[p].phase === 'authoritative');
    const targetAuth = [...checkPages].some(p => st0.pages[p].phase === 'authoritative');
    const closureAuth = [...closure].some(c => surfacePhaseOf(c, st0) === 'authoritative');
    if (level === 'peripheral' && closureAuth) effLevel = 'core-escalated';
    if (level === 'core' && !(rationale && rationale.trim())) {
      throw new Error('Core-level changes require a rationale: why it changes and what it affects.');
    }

    // Ids this change (re)defines mechanically.
    const touched = new Set(closure);
    for (const e of entries) if (e.kind === 'section') idsInContent(e.content).forEach(id => touched.add(id));

    const prop = {
      id: null, entries, level, effLevel, summary, rationale, overturns,
      page: [...checkPages][0] || null,
      position: position || entries.map(e => labelOf(e)).join(' + ').slice(0, 80),
      closure: [...closure], createdAt: new Date().toISOString(),
      touchedCore: [...touched],
    };

    const st = readState();
    // Gating: sections gate on (target page authoritative OR closure cites an
    // authoritative surface); structural ops (pages/refs tables, page add or
    // remove) move the protection boundary and gate while any page is
    // authoritative. Draft-everything projects stay friction-free by design.
    const consentActive = st.consentMode && (structural ? anyAuth : (targetAuth || closureAuth));
    if (effLevel === 'peripheral' || !consentActive) {
      applyProp(prop, effLevel === 'peripheral' ? 'batch-notified' : 'ai-managed');
      const allDraft = pageNames(st).every(p => st.pages[p].phase === 'draft');
      return {
        written: true, level: effLevel, amendment: prop.amendmentNo, sectionsApplied: entries.length,
        note: effLevel === 'peripheral'
          ? 'Peripheral tier: mechanically logged (one row for the whole batch). Batch-notify the user at session end or via keel_status.'
          : (allDraft
            ? 'All touched pages are draft — nothing is gated: applied immediately and logged (ai-managed).'
            : 'Consent is off or no touched surface is authoritative — applied immediately and logged (ai-managed).'),
        bypassedConsent: effLevel !== 'peripheral',
      };
    }
    st.seq.proposal += 1;
    prop.id = 'PR' + st.seq.proposal;
    st.proposals[prop.id] = prop; writeState(st);
    return {
      written: false, proposalId: prop.id, needsConsent: true, level: effLevel,
      closure: prop.closure, rationale, pages: [...new Set(entries.map(e => e.page).filter(Boolean))],
      instruction: 'Core-level change on an authoritative surface: show the user the rationale and the ripple (closure; stale refs if any), obtain explicit consent, then call keel_confirm with consent_evidence = the user\'s consenting words. One consent covers the whole batch.',
    };
  }
  function labelOf(e) {
    if (e.kind === 'section') return `${e.page} · ${e.title}`;
    if (e.kind === 'index-pages') return 'INDEX.md pages table';
    if (e.kind === 'index-refs') return 'INDEX.md refs table';
    if (e.kind === 'page-add') return `pages/${e.name}.md (created)`;
    if (e.kind === 'page-remove') return `pages/${e.name}.md (removed)`;
    return e.kind;
  }
  // Cited core refs inside whole-table sections (glossary load-bearing column).
  function scanClosure(section, content) {
    const refs = new Set();
    if (section === 'glossary') {
      for (const c of tableRows(String(content), 'Term')) {
        if (c.length >= 3 && c[0]) for (const r of c[2].split(/[,，;；]/)) if (r.trim()) refs.add(r.trim());
      }
    }
    return [...refs];
  }

  function confirm(args) {
    requireInit();
    const { proposal_id, consent_evidence } = args;
    let st = readState();
    const prop = st.proposals[proposal_id];
    if (!prop) throw new Error(`Proposal not found or already handled: ${proposal_id} (keel_status lists pending proposals).`);
    const ev = (consent_evidence || '').trim();
    if (!ev) throw new Error('consent_evidence is required: the user\'s consenting words from the conversation (audit trail).');
    for (const e of prop.entries) {
      const now = e.kind === 'section' ? getSection(e.page, e.section) : renderRows(e.kind === 'index-refs' ? indexRefsTable() : indexPagesTable());
      const was = e.kind === 'section' ? e.baseContent : renderRows(e.baseTable);
      if (now !== was) {
        throw new Error(`The target of this proposal changed after staging (${labelOf(e)}). Call keel_reject on ${proposal_id} and re-propose against the current content — otherwise the earlier change would be silently clobbered.`);
      }
    }
    // Snapshot the ref table BEFORE applying: a proposal that itself adds a
    // reference must not report that new reference as stale.
    const preRefs = parseRefs().map(p => ({ ...p }));
    const n = applyProp(prop, `yes ("${ev.slice(0, 40)}")`);
    // Re-read state AFTER applyProp: it updates seq counters inside.
    st = readState();
    delete st.proposals[proposal_id]; writeState(st);
    const result = { written: true, proposal_id, amendment: n, level: prop.effLevel };
    const stale = staleRefsOf((prop.touchedCore && prop.touchedCore.length ? prop.touchedCore : prop.closure).filter(r => ID_REF.test(r)), preRefs);
    if (stale.length) result.staleRefs = stale;
    return result;
  }
  function renderRows(rows) { return (rows || []).map(r => `| ${r.join(' | ')} |`).join('\n'); }
  function reject(args) {
    requireInit();
    const st = readState();
    if (!st.proposals[args.proposal_id]) throw new Error(`Proposal not found: ${args.proposal_id}`);
    delete st.proposals[args.proposal_id]; writeState(st);
    return { rejected: args.proposal_id };
  }

  // ---------- glossary ----------
  function glossaryRegister(args) {
    requireInit();
    const st = readState();
    const { term, definition, load_bearing = [], aliases = [] } = args;
    if (!term || !definition) throw new Error('term and definition are required.');
    if (String(term).includes('|') || String(definition).includes('|')) throw new Error('term and definition must not contain "|" — it breaks the table row.');
    const row = `| ${term} | ${definition} | ${load_bearing.join('; ')} | ${aliases.join(', ')} | active |`;
    const body = getSection('terms', 'glossary') || '';
    const lines = body.split(/\r?\n/);
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('|') && lines[i].split('|').slice(1, -1).map(s => s.trim())[0] === term) {
        lines[i] = row; replaced = true; break;
      }
    }
    if (!replaced) lines.splice(lastTableRowIndex(lines) + 1, 0, row);
    const citations = load_bearing.map(r => String(r).trim()).filter(r => ID_REF.test(r) || st.pages[r]);
    const level = citations.some(c => surfacePhaseOf(c, st) === 'authoritative') ? 'core' : 'peripheral';
    return propose({
      section: 'glossary', content: lines.join('\n'), level, page: 'terms',
      summary: `Term "${term}" ${replaced ? 'updated' : 'registered'}`,
      rationale: `Load-bearing at: ${load_bearing.join('; ') || '(none declared — treated as peripheral)'}`,
      position: 'terms · G Glossary',
    }, { closure: citations });
  }

  // ---------- protected references ----------
  function sha256Of(p) {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  }
  function refAdd(args) {
    requireInit();
    const { path: rel, carries = [], label = '' } = args;
    if (!rel || !Array.isArray(carries)) throw new Error('path is required (relative to the project root); carries is optional — the claim ids or pages this document renders, if any.');
    if (String(rel).includes('|') || carries.some(c => String(c).includes('|'))) throw new Error('path and carries must not contain "|" — it breaks the table row.');
    const abs = path.resolve(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`File not found (relative to project root): ${rel}`);
    const sha = sha256Of(abs);
    const rows = indexRefsTable();
    const id = label || `REF${rows.length + 1}`;
    if (parseRefs().some(p => p.ref === id)) throw new Error(`Reference id already in use: ${id}`);
    const st = readState();
    const citations = carries.map(c => String(c).trim()).filter(c => ID_REF.test(c) || st.pages[c]);
    return propose({
      level: 'core',
      summary: `Protected reference ${id} → ${rel}`,
      rationale: `Extends the protection boundary${carries.length ? `; carries: ${carries.join('; ')}` : ' (tamper-evidence only; carries nothing core)'}`,
      position: 'INDEX.md refs table',
    }, {
      ops: [{ kind: 'index-refs', rows: [...rows, [id, rel.replace(/\\/g, '/'), carries.join('; '), sha, new Date().toISOString(), 'active']] }],
      closure: citations.filter(c => surfacePhaseOf(c, st) === 'authoritative'),
    });
  }
  function refRemove(args) {
    requireInit();
    const { ref } = args;
    const rows = indexRefsTable();
    const hit = rows.find(c => c[0] === ref);
    if (!hit) throw new Error(`Protected reference not found: ${ref}`);
    const kept = rows.filter(c => c[0] !== ref);
    const st = readState();
    const citations = (hit[2] || '').split(/[,，;；]\s*/).filter(c => ID_REF.test(c) || st.pages[c]);
    return propose({
      level: 'core',
      summary: `Protected reference ${ref} removed`, rationale: `Protection boundary shrinks; path was ${hit[1]}`,
      position: 'INDEX.md refs table',
    }, { ops: [{ kind: 'index-refs', rows: kept }], closure: citations.filter(c => surfacePhaseOf(c, st) === 'authoritative') });
  }
  function refsVerify() {
    requireInit();
    const out = [];
    for (const p of parseRefs()) {
      const abs = path.resolve(root, p.path);
      if (!fs.existsSync(abs)) out.push({ ref: p.ref, path: p.path, ok: false, reason: 'file missing' });
      else {
        const sha = sha256Of(abs);
        const ok = sha === p.sha;
        out.push({ ref: p.ref, path: p.path, ok, reason: ok ? null : 'content diverged from admitted hash' });
      }
    }
    return { refs: out, mismatches: out.filter(o => !o.ok).length, note: 'Tamper-evidence only: mismatches are reported, never blocked. Regenerate or re-admit after intentional changes.' };
  }

  // ---------- pages (module pages lifecycle) ----------
  function pageAdd(args) {
    requireInit();
    const covers = (Array.isArray(args.covers) ? args.covers : [args.covers]).filter(Boolean).join('; ');
    if (!covers.trim()) throw new Error('covers is required: what this page governs, in stable anchors (repo paths/globs, glossary terms, claim ids).');
    return propose({
      level: 'core', summary: `Module page "${args.name}" added`,
      rationale: `Extends the guarded surfaces; covers: ${covers}`,
      position: `pages/${args.name}.md + INDEX`,
    }, { ops: [{ kind: 'page-add', name: args.name, covers }] });
  }
  function pageRemove(args) {
    requireInit();
    const name = args.page || args.name;
    const ids = [...idsOfPage(name)];
    const anchors = new Set([...ids, name]); // citations may be claim ids or the page name
    const termsCiting = parseGlossaryRows().filter(g => (g.load || '').split(/[,，;；]\s*/).some(c => anchors.has(c.trim()))).map(g => g.term);
    const r = propose({
      level: 'core', summary: `Module page "${name}" removed`,
      rationale: `Shrinks the guarded surfaces; page snapshot archived; ids leaving with it: ${ids.join(', ') || '(none)'}`,
      position: `pages/${name}.md + INDEX`,
    }, { ops: [{ kind: 'page-remove', name }], closure: [] });
    r.termsStillCiting = termsCiting; // relay: these terms' load-bearing refs just went dangling
    return r;
  }
  function pageCovers(args) {
    requireInit();
    const name = args.page;
    const st = readState();
    if (!st.pages[name]) throw new Error(`Unknown page: ${name}`);
    const covers = (Array.isArray(args.covers) ? args.covers : [args.covers]).filter(Boolean).join('; ');
    if (!covers.trim()) throw new Error('covers is required: what this page governs, in stable anchors (repo paths/globs, glossary terms, claim ids).');
    if (covers.includes('|')) throw new Error('covers must not contain "|" — it breaks the table row.');
    const rows = indexPagesTable().map(r => (r[0] === name ? [r[0], r[1], covers, r[3]] : r));
    return propose({
      level: 'core', summary: `Page "${name}" covers updated`,
      rationale: `Routing metadata changes what sessions read; covers: ${covers}`,
      position: 'INDEX.md pages table',
    }, { ops: [{ kind: 'index-pages', rows }], closure: [] });
  }

  // ---------- maintenance ----------
  function cleanOrphans() {
    requireInit();
    const st = readState();
    let removedTotal = 0; const titles = [];
    for (const p of pageNames(st)) {
      const file = pagePath(p);
      if (!fs.existsSync(file)) continue;
      const blocks = parsePage(file);
      const orphans = blocks.filter(b => b.title !== null && !sectionMeta(b.title));
      if (!orphans.length) continue;
      fs.writeFileSync(file, serialize(blocks.filter(b => b.title === null || sectionMeta(b.title))));
      removedTotal += orphans.length; titles.push(...orphans.map(o => `${p}: ${o.title}`));
    }
    if (!removedTotal) return { removed: 0, note: 'No orphan ## blocks found.' };
    const n = appendAmendment({
      level: 'maintenance', position: 'notebook pages',
      summary: `Removed ${removedTotal} orphan ## block(s): ${titles.slice(0, 5).join('; ')}`,
      consent: 'batch-notified',
    });
    return { removed: removedTotal, titles, amendment: n, note: 'Removed blocks are gone from the notebook — archive their content elsewhere first if it matters.' };
  }

  // ---------- compaction / exemption / health / config ----------
  function compact(args) {
    requireInit();
    const entries = args.entries || [];
    if (!entries.length || entries.some(e => !e.position || !e.summary)) {
      throw new Error('entries is required: [{position, summary}] — AI-merged summaries of superseded entries.');
    }
    const rows = parseAmendments();
    if (rows.length < 5) throw new Error(`Amendment log has only ${rows.length} entries (threshold 5); no compaction needed.`);
    const arch = path.join(archiveDir, `amendments-${rows.length}.md`);
    fs.writeFileSync(arch, '# Archived verbatim snapshot (mechanical copy, never deleted)\n\n' + fs.readFileSync(amendmentsPath, 'utf8'), { flag: 'w' });
    const st = readState();
    let n = st.seq.amendment;
    const newLines = [
      '# Amendment Log (append-only)',
      '',
      '<!-- Maintained by the Keel MCP server. Manual edits are forbidden. Latest compaction: see archive/. -->',
      '',
      '| # | Time | Tier | Location | Summary | Supersedes | Consent |',
      '|---|---|---|---|---|---|---|',
    ];
    for (const e of entries) {
      n += 1;
      newLines.push(`| ${n} | ${new Date().toISOString()} | compaction-summary | ${e.position} | ${e.summary.slice(0, 120)} | | batch-notified |`);
    }
    n += 1;
    newLines.push(`| ${n} | ${new Date().toISOString()} | compaction | AMENDMENTS.md | Raw log (${rows.length} entries) archived to ${path.basename(arch)} | | batch-notified |`);
    st.seq.amendment = n; writeState(st);
    fs.writeFileSync(amendmentsPath, newLines.join('\n') + '\n');
    return { archived: arch, summaryEntries: entries.length };
  }
  function exempt(args) {
    requireInit();
    const { summary, reason } = args;
    if (!summary || !(reason && String(reason).trim())) throw new Error('Explicit exemptions require both a summary and a reason.');
    const n = appendAmendment({ level: 'exemption', position: '(exemption)', summary: `${summary} — reason: ${reason}`, consent: 'exempted' });
    return { amendment: n, note: 'Exemption recorded: this change conflicts with the notebook but was explicitly approved by the user despite the conflict.' };
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
    const epochCore = core.length;
    const lifetimeCore = st.coreCount || 0;
    return {
      pages: pageMap(st),
      coreAmendments: epochCore, coreAmendmentsLifetime: lifetimeCore, totalAmendments: rows.length,
      yellowFlagBasis: 'core amendments since the last compaction (lifetime count is reported separately and never resets)',
      yellowFlag: epochCore > 6 ? `Many core amendments since the last compaction (${epochCore}; lifetime ${lifetimeCore}): the concept may never have converged; consider re-examining the principles.` : null,
      oscillation: { note: 'Reference metric only — never a threshold, never gates anything.', groups: oscillating },
      pendingProposals: Object.values(st.proposals).map(p => ({ id: p.id, summary: p.summary, level: p.effLevel })),
    };
  }
  function pageMap(st) {
    return pageNames(st).map(p => ({ name: p, phase: st.pages[p].phase, epoch: st.pages[p].epoch || 1 }));
  }

  function config(args) {
    requireInit();
    const st = readState();
    if (typeof args.consent === 'boolean') st.consentMode = args.consent;
    if (typeof args.steward === 'boolean') st.stewardMode = args.steward;
    let activated = null; let reset = null;
    const page = args.page || 'root';
    if (!st.pages[page]) throw new Error(`Unknown page: ${page} (known: ${pageNames(st).join(', ')})`);
    if (args.authoritative === true && st.pages[page].phase === 'draft') {
      st.pages[page].phase = 'authoritative'; // one-way per epoch; never a side-effect of a write
      activated = {
        page, phase: 'authoritative', epoch: st.pages[page].epoch,
        consentMode: st.consentMode, stewardMode: st.stewardMode,
        note: `Page "${page}" declared authoritative — announce to the user: the consent mechanism and the structured post-plan check (STEWARD) now apply to this page ${st.consentMode || st.stewardMode ? 'per the switches' : '(both switched off — notebook mode)'}. Phases are per-page; declare or reopen pages individually via keel_config.`,
      };
    }
    if (args.phase === 'draft' && st.pages[page].phase === 'authoritative') {
      // Reopen: snapshot the page, drop its pending proposals, flip the phase,
      // and report the reverse ripple (everything that cites this page's ids).
      const epoch = st.pages[page].epoch || 1;
      const snap = path.join(archiveDir, `page-${page}-epoch${epoch}-${Date.now()}.md`);
      fs.copyFileSync(pagePath(page), snap);
      const ids = [...idsOfPage(page)];
      const anchors = new Set([...ids, page]); // citations may be claim ids or the page name
      const dropped = Object.values(st.proposals).filter(p => p.entries.some(e => e.page === page)).map(p => p.id);
      for (const id of dropped) delete st.proposals[id];
      st.pages[page].phase = 'draft';
      st.pages[page].epoch = epoch + 1;
      writeState(st);
      const n = appendAmendment({ level: 'reset', position: `${page} page`, summary: `Page "${page}" reopened for rework (epoch ${epoch}→${epoch + 1}) — user-directed`, consent: 'ai-managed' });
      bumpIndexLastAmend(page, n);
      const termsToReaffirm = parseGlossaryRows().filter(g => (g.load || '').split(/[,，;；]\s*/).some(c => anchors.has(c.trim()))).map(g => g.term);
      const refsToReaffirm = parseRefs().filter(p => p.carries.some(c => anchors.has(c))).map(p => ({ ref: p.ref, path: p.path, carries: p.carries.filter(c => anchors.has(c)) }));
      reset = {
        page, epoch: epoch + 1, snapshot: snap, droppedProposals: dropped, amendment: n,
        idsLeavingAuthority: ids, termsToReaffirm, refsToReaffirm,
        note: 'Page content is untouched — it stays as the best available draft. The ids it defines are no longer consent-guarded; glossary terms and protected refs citing them need re-affirming after the page is re-declared. The snapshot preserves the pre-reopen text verbatim.',
      };
      const out0 = { pages: pageMap(st), consentMode: st.consentMode, stewardMode: st.stewardMode, effective: effectiveSwitches(st), reset };
      return out0;
    }
    writeState(st);
    const r = {
      pages: pageMap(st), consentMode: st.consentMode, stewardMode: st.stewardMode,
      effective: effectiveSwitches(st),
      note: 'Phases are per-page; switches are project-level. Declaring a page authoritative is one-way per epoch (reopen via {phase:"draft", page} — user-directed, snapshotted). No re-validation is required to flip switches — the user decides.',
    };
    if (activated) r.activated = activated;
    return r;
  }
  function effectiveSwitches(st) {
    const anyAuth = pageNames(st).some(p => st.pages[p].phase === 'authoritative');
    return { consent: anyAuth && st.consentMode, steward: anyAuth && st.stewardMode };
  }

  // ---------- digest / status ----------
  function digestText() {
    requireInit();
    const st = readState();
    const anyAuth = pageNames(st).some(p => st.pages[p].phase === 'authoritative');
    const mode = `pages: ${pageNames(st).map(p => `${p}=${st.pages[p].phase}`).join(' · ')} · consent=${st.consentMode ? 'on' : 'off'} · steward=${st.stewardMode ? 'on' : 'off'}`
      + (anyAuth ? '' : '  (no page declared authoritative yet — consent and steward inactive; declare via keel_config {authoritative:true, page})');
    const L = [
      '[Keel] Authoritative notebook: .keel/DATUM.md (root page) + INDEX.md (routing) + pages/ (module pages, terms). All files are plain markdown — read what you need directly; write only via keel_* tools (MCP server "keel"). Below: mechanical excerpt (verbatim).',
      `[Keel] ${mode}`,
      '[Keel] root pins:',
    ];
    for (const ln of (getSection('root', 'intent') || '').split(/\r?\n/)) {
      if (/^-\s*(Goal \(one sentence\)|Out of scope|Success criteria):/.test(ln) && filled(ln)) L.push(ln.trim());
      if (/^- Requirement R\d+:/.test(ln) && filled(ln)) L.push(ln.trim());
    }
    for (const ln of (getSection('root', 'concept') || '').split(/\r?\n/)) {
      if (/^- P\d+/.test(ln) && filled(ln)) L.push(ln.trim());
      if (/^- (Invariant|Decision D\d+):/.test(ln) && filled(ln)) L.push(ln.trim());
    }
    L.push('[Keel] index (verbatim):');
    for (const r of indexPagesTable()) L.push(`| ${r.join(' | ')} |`);
    const refs = parseRefs();
    if (refs.length) {
      L.push('Protected references:');
      for (const p of refs) L.push(`  ${p.ref} → ${p.path} (carries: ${p.carries.join(', ') || '—'})`);
    }
    const rows = parseAmendments();
    if (rows.length) {
      L.push('Recent amendments:');
      for (const r of rows.slice(-3)) L.push(`  #${r.n} [${r.level}] ${r.position} — ${r.summary}`);
    }
    L.push('[Keel] Habit: after you finish a plan and before implementing, match the plan against the root pins above and the index covers; read only the matched pages — a provably unrelated plan reads nothing (say "zero matches" and proceed). Memory of a page is evidence, not the source: if a page\'s lastAmend moved after you last read it, re-read it. Conflicts → propose an amendment (or record an exemption with the user) — silent divergence is forbidden.');
    return L.join('\n');
  }
  function status() {
    requireInit();
    const st = readState();
    const counts = {};
    for (const p of pageNames(st)) {
      const c = { requirements: 0, principles: 0, decisions: 0 };
      for (const ln of (getSection(p, 'intent') || '').split(/\r?\n/)) if (/^- Requirement R\d+:/.test(ln) && filled(ln)) c.requirements += 1;
      const concept = getSection(p, 'concept') || '';
      for (const ln of concept.split(/\r?\n/)) {
        if (/^- P\d+\s*[:：]/.test(ln) && filled(ln)) c.principles += 1;
        if (/^- Decision D\d+:/.test(ln) && filled(ln)) c.decisions += 1;
      }
      counts[p] = c;
    }
    return {
      pages: pageMap(st),
      modes: { consent: st.consentMode, steward: st.stewardMode },
      effective: effectiveSwitches(st),
      counts: { perPage: counts, terms: parseGlossaryRows().length, protectedRefs: parseRefs().length, amendments: parseAmendments().length },
      ...health(),
    };
  }

  // ---------- traceability ripple ----------
  function ripple(targets) {
    requireInit();
    const st = readState();
    const affectedIds = new Set(); const affectedPages = new Set(); const detail = [];
    const addPage = (p) => { affectedPages.add(p); idsOfPage(p).forEach(id => affectedIds.add(id)); };
    for (const t of targets || []) {
      const tok = String(t).trim();
      const hit = { target: tok, refs: [], pages: [] };
      if (ID_REF.test(tok)) {
        const home = findIdHome(tok, st);
        if (home) { hit.refs.push(tok); hit.pages.push(home); affectedIds.add(tok); affectedPages.add(home); }
      } else if (st.pages[tok]) {
        hit.pages.push(tok); addPage(tok);
      } else {
        const g = parseGlossaryRows().find(x => x.term === tok);
        if (g) {
          for (const r of (g.load || '').split(/[,，;；]/)) {
            const c = r.trim();
            if (!c) continue;
            if (ID_REF.test(c)) {
              const home = findIdHome(c, st);
              if (home) { hit.refs.push(c); hit.pages.push(home); affectedIds.add(c); affectedPages.add(home); }
            } else if (st.pages[c]) { hit.pages.push(c); addPage(c); }
          }
        }
      }
      hit.refs = [...new Set(hit.refs)]; hit.pages = [...new Set(hit.pages)];
      detail.push(hit);
    }
    const stale = parseRefs().filter(p => p.carries.some(c => affectedIds.has(c)))
      .map(p => ({ ref: p.ref, path: p.path, carries: p.carries.filter(c => affectedIds.has(c)) }));
    return {
      targets, affectedCore: [...affectedIds], affectedPages: [...affectedPages], staleRefs: stale,
      note: 'Changes touching authoritative surfaces go through the consent flow when active; listed staleRefs are protected documents now suspected outdated.',
      detail,
    };
  }

  return {
    exists, init, propose, confirm, reject, ripple, glossaryRegister,
    refAdd, refRemove, refsVerify, pageAdd, pageRemove, pageCovers,
    cleanOrphans, compact, exempt, health, config, digestText, status,
    getSection, findIdHome,
  };
}

// ---------- MCP tool table ----------
const TOOLS = [
  { name: 'keel_init', description: 'Create .keel/ in the current project: root page DATUM.md + routing table INDEX.md + pages/terms.md (glossary) + AMENDMENTS.md + state.json. project = display name; notebook:true builds a pure-notebook project (consent and steward stay off). All pages start draft: writes apply immediately.',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, notebook: { type: 'boolean' } }, required: ['project'] } },
  { name: 'keel_digest', description: 'Mechanical excerpt (verbatim, not AI paraphrase): doc pointer, per-page phase line, root pins (goal/scope/requirements, P*, invariants, decisions), the INDEX routing table verbatim, protected refs, recent amendments, and the match-don\'t-bulk-read habit. The notebook files themselves are plain markdown — read them directly; this is the map.',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'keel_status', description: 'Per-page phases and epochs, mode switches (configured + effective), per-page counts, pending proposals, health summary (incl. the oscillation reference metric).',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'keel_ripple', description: 'Traceability closure: given claim ids (R-n/P-n/D-n), page names, or glossary terms, mechanically compute the affected ids and pages and the protected references now suspected stale.',
    inputSchema: { type: 'object', properties: { targets: { type: 'array', items: { type: 'string' } } }, required: ['targets'] } },
  { name: 'keel_write_section', description: 'Write notebook sections (default page "root"; module pages via page). content replaces the ENTIRE section — Read the page first (plain markdown) and merge your change in. Pass section+content or sections:[{section, content}] to batch one logical change — one amendment row (and one consent, when active) covers the whole batch. Gating: staged while the target page is authoritative and consent is ON (or the change\'s closure cites an authoritative surface); draft pages write freely, logged ai-managed. Claim ids (Requirement R-n / P-n / Decision D-n) are globally unique across pages. mermaid blocks are syntax-checked (fence/bracket/quote balance) — well-formedness only.',
    inputSchema: { type: 'object', properties: {
      page: { type: 'string', description: 'root (default) · terms · a module page name' },
      section: { type: 'string', enum: ['intent', 'glossary', 'concept'] },
      content: { type: 'string' },
      sections: { type: 'array', description: 'batch form: [{section, content}, …] for one logical change', items: { type: 'object', properties: { section: { type: 'string' }, content: { type: 'string' } }, required: ['section', 'content'] } },
      level: { type: 'string', enum: ['core', 'peripheral'] },
      summary: { type: 'string', description: 'one-line description of the change' }, rationale: { type: 'string' },
      overturns: { type: 'string', description: 'Entries this supersedes, e.g. a prior principle (feeds the oscillation reference metric)' }, position: { type: 'string', description: 'location label for the amendment row (defaults to page · section titles)' },
    }, required: ['level', 'summary'] } },
  { name: 'keel_confirm', description: 'Apply a staged proposal after the user explicitly consented in the conversation. consent_evidence = the user\'s consenting words (audit trail). Returns staleRefs when protected documents are now suspected outdated.',
    inputSchema: { type: 'object', properties: { proposal_id: { type: 'string' }, consent_evidence: { type: 'string' } }, required: ['proposal_id', 'consent_evidence'] } },
  { name: 'keel_reject', description: 'Discard a staged proposal.',
    inputSchema: { type: 'object', properties: { proposal_id: { type: 'string' } }, required: ['proposal_id'] } },
  { name: 'keel_config', description: 'The switchboard. Phases are per-page, switches are project-level. authoritative:true declares a page authoritative (default page "root"; one-way per epoch; the judgment is the agent\'s — activate when that page\'s essentials are recorded in language that survives the session; announce it to the user). phase:"draft" + page REOPENS an authoritative page (user-directed: snapshot to archive, pending proposals on it dropped, reverse ripple reported). consent/steward flip the project switches (default ON at first activation; notebook projects start OFF).',
    inputSchema: { type: 'object', properties: { consent: { type: 'boolean' }, steward: { type: 'boolean' }, authoritative: { type: 'boolean' }, page: { type: 'string' }, phase: { type: 'string', enum: ['draft'] } } } },
  { name: 'keel_glossary_register', description: 'Register/update a term on the terms page (the glossary is global). load_bearing cites claim ids or page names; a term citing an authoritative surface is core-tier (staged while consent is active).',
    inputSchema: { type: 'object', properties: { term: { type: 'string' }, definition: { type: 'string' }, load_bearing: { type: 'array', items: { type: 'string' } }, aliases: { type: 'array', items: { type: 'string' } } }, required: ['term', 'definition'] } },
  { name: 'keel_ref_add', description: 'Admit a derived document into the anti-degradation scope (protected reference, listed in INDEX). Records whole-file SHA-256 at admission; carries = the claim ids or pages this document renders (optional — empty when the document is protected for its own sake). Moves the protection boundary: core-tier while any page is authoritative and consent is active.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'relative to project root' }, carries: { type: 'array', items: { type: 'string' }, description: 'claim ids (R-n/P-n/D-n) or page names this document renders' }, label: { type: 'string', description: 'custom reference id (default REF<n>)' } }, required: ['path'] } },
  { name: 'keel_ref_remove', description: 'Remove a protected reference (shrinks the protection boundary; core-tier while any page is authoritative and consent is active). The document itself is untouched.',
    inputSchema: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] } },
  { name: 'keel_refs_verify', description: 'Re-hash every active protected reference and report matches/mismatches. Tamper-evidence only — never blocks; regenerate or re-admit after intentional changes.',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'keel_page_add', description: 'Add a module page (pages/<name>.md, same altitude as the root, module-scoped: requirements in 00; concept model, decisions, open questions in 01; weighted principles stay on root). covers = what the page governs, in stable anchors (repo paths/globs, glossary terms, claim ids) — INDEX routes sessions by it. Core-tier while any page is authoritative.',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'kebab-case, e.g. orders' }, covers: { type: 'array', items: { type: 'string' } } }, required: ['name', 'covers'] } },
  { name: 'keel_page_remove', description: 'Remove a module page (root and terms are structural and stay). Snapshots the page into archive/, drops its pending proposals, and reports glossary terms whose load-bearing refs just went dangling. Refuses while protected references still carry this page\'s ids.',
    inputSchema: { type: 'object', properties: { page: { type: 'string' } }, required: ['page'] } },
  { name: 'keel_page_covers', description: 'Update a page\'s covers in INDEX (routing metadata — it decides what future sessions read; core-tier while any page is authoritative).',
    inputSchema: { type: 'object', properties: { page: { type: 'string' }, covers: { type: 'array', items: { type: 'string' } } }, required: ['page', 'covers'] } },
  { name: 'keel_clean', description: 'Maintenance: remove orphan "## " blocks from any notebook page (misplaced headings). Keyed sections and preambles are untouched; logged as a maintenance amendment.',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'keel_compact', description: 'Compact the amendment log: the AI provides merged summary entries, the server archives the raw log verbatim (never deleted). Refuses below 5 entries.',
    inputSchema: { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', properties: { position: { type: 'string' }, summary: { type: 'string' } }, required: ['position', 'summary'] } } }, required: ['entries'] } },
  { name: 'keel_exempt', description: 'Explicit waiver: a change conflicts with the notebook but the user approves it despite the conflict; recorded for audit.',
    inputSchema: { type: 'object', properties: { summary: { type: 'string' }, reason: { type: 'string' } }, required: ['summary', 'reason'] } },
];

function startStdio() {
  const keel = makeKeel(process.cwd());
  const IMPL = {
    keel_init: a => keel.init(a.project, a.notebook),
    keel_digest: () => keel.digestText(),
    keel_status: () => keel.status(),
    keel_ripple: a => keel.ripple(a.targets),
    keel_write_section: a => keel.propose(a),
    keel_confirm: a => keel.confirm(a),
    keel_reject: a => keel.reject(a),
    keel_config: a => keel.config(a),
    keel_glossary_register: a => keel.glossaryRegister(a),
    keel_ref_add: a => keel.refAdd(a),
    keel_ref_remove: a => keel.refRemove(a),
    keel_refs_verify: () => keel.refsVerify(),
    keel_page_add: a => keel.pageAdd(a),
    keel_page_remove: a => keel.pageRemove(a),
    keel_page_covers: a => keel.pageCovers(a),
    keel_clean: () => keel.cleanOrphans(),
    keel_compact: a => keel.compact(a),
    keel_exempt: a => keel.exempt(a),
  };
  // TOOLS and IMPL are maintained separately; a mismatch would silently break a tool at call time.
  for (const t of TOOLS) if (!IMPL[t.name]) throw new Error(`startStdio: IMPL missing for tool ${t.name}`);
  for (const n of Object.keys(IMPL)) if (!TOOLS.some(t => t.name === n)) throw new Error(`startStdio: TOOLS missing entry for ${n}`);

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
      else if (msg.method === 'resources/list') result = { resources: [] };
      else if (msg.method === 'prompts/list') result = { prompts: [] };
      else throw new Error(`Unknown method: ${msg.method}`);
      send({ jsonrpc: '2.0', id: msg.id, result });
    } catch (e) {
      send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e && e.message || e) } });
    }
  }
}

if (require.main === module) startStdio();
module.exports = { makeKeel, SECTIONS, TOOLS, VERSION };
