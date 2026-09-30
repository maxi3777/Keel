/*
 * Keel SessionStart hook: if .keel/DATUM.md exists in the cwd, emit the
 * mechanical digest as additionalContext. The digest is a verbatim slice of
 * DATUM (never an AI paraphrase), produced by the same makeKeel() used by the
 * MCP server, so the hook injection and in-session keel_digest are guaranteed
 * identical.
 *
 * Output contract: strict hook JSON {"hookSpecificOutput":{...}} or nothing.
 * Hosts parse stdout against a strict schema — plain text is discarded and the
 * run marked failed — so the digest must never be printed bare.
 *
 * stdin is drained (with a timer guard for hosts that never close it) so the
 * host's write side never sees a broken pipe.
 */
'use strict';
const path = require('path');
const { makeKeel } = require(path.join(__dirname, '..', 'mcp', 'server.js'));

let input = '';
let done = false;
const timer = setTimeout(run, 1000); // guard: hosts that never close stdin
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => { clearTimeout(timer); run(); });

function run() {
  if (done) return;
  done = true;
  try {
    const msg = input ? JSON.parse(input) : null;
    const cwd = (msg && typeof msg.cwd === 'string' && msg.cwd) || process.cwd();
    const keel = makeKeel(cwd);
    if (keel.exists()) {
      const text = keel.digestText();
      if (text) {
        console.log(JSON.stringify({
          hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
        }));
      }
    }
  } catch (_) {
    // A failed digest must never block the session; keel_digest can re-fetch it.
  }
}
