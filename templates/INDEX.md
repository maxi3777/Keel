# Keel Index

<!-- Maintained by the Keel MCP server. Manual edits are forbidden.
     Routing: match your plan against `covers`; read only matched pages.
     A provably unrelated plan reads nothing — say "zero matches" and proceed.
     covers anchors are stable vocabulary: repo paths/globs, glossary terms,
     R-n/P-n/D-n claim ids. lastAmend is the page's watermark — if it moved
     after you last read the page, re-read it: memory of a page is evidence,
     not the source. -->

| page | path | covers | lastAmend |
|---|---|---|---|
| root | DATUM.md | global: identity, scope, requirements, priorities, cross-module invariants | — |
| terms | pages/terms.md | all: terminology | — |

## Protected References

<!-- Derived documents admitted into the anti-degradation scope. Protection is
     tamper-evidence, not write-gating: whole-file SHA-256 recorded at admission
     and re-checked on verify; edits stay free, mismatches are detected and
     reported. carries = the claim ids (or pages) this document renders; it may
     be empty when the document is protected for its own sake. Adding or
     removing a reference follows the core tier while consent is active. -->

| ref | path | carries | sha256 | admitted | status |
|---|---|---|---|---|---|
