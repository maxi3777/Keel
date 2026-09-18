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
 */
'use strict';
const path = require('path');
const { makeKeel } = require(path.join(__dirname, '..', 'mcp', 'server.js'));

try {
  const keel = makeKeel(process.cwd());
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
