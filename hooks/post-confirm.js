/*
 * Keel PostToolUse hook (matched on keel_confirm): after every applied core
 * amendment, print the refreshed digest so the session context tracks the
 * design without requiring a new session. The digest is a verbatim slice of
 * DATUM (never an AI paraphrase), produced by the same makeKeel() used by the
 * MCP server. Failed tool calls change nothing and are skipped.
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
    const failed = msg && msg.tool_response && (msg.tool_response.isError || msg.tool_response.error);
    if (failed) return;
    const keel = makeKeel(process.cwd());
    if (keel.exists()) {
      const text = keel.digestText();
      if (text) console.log(text);
    }
  } catch (_) {
    // A failed digest must never block the session; keel_digest can re-fetch it.
  }
}
