# Encarta Reborn — Judging Criteria Scorecard

> Internal self-assessment, not a judge's verdict. Scores reflect what is
> verifiable in the repository right now. This is a working note: move it out of
> the public repo (or gitignore it) before submitting.

Kiroween 2026 · **Resurrection** track · rated against the five 2026 criteria.
Last updated after the scale, MCP, proof, and accessibility work.

---

## Summary

| Criterion | Before | Now | What would still lift it |
|---|---|---|---|
| Potential Impact | 9 | **9.5** | a real user's reaction (video or quote) |
| Technological Implementation | 9 | **9.5** | register the MCP server (one copy step, below) |
| Design | 9 | **9.5** | test the globe on a real GPU and a phone |
| Innovation / Idea | 9 | **9.5** | lead the pitch with the Proof page |
| Presentation | 3 | **3** | record the video (you chose to skip this for now) |
| **Average, 4 build categories** | 9.0 | **9.5** | |

A 10 is a judge's call, so none of these claims it. The remaining half points
are things only a person can supply: real users, real devices, and the video.

---

## Potential Impact — 9.5

**Verified**
- **100 real places** across all seven regions; every one has a bundled,
  license-checked image (the scale test fails the build otherwise).
- Search by name or theme, plus region and type filters (tested; a plain lookup,
  nothing ranks places for the reader).
- Works offline: the service worker precaches **116 files including all 100
  images** (about 22 MB, a fraction of a real CD-ROM).
- No account, no tracking, keyboard-navigable, WCAG-AA contrast by test.

**Why not 10:** no evidence from real users yet.

## Technological Implementation — 9.5

**Verified**
- Spec-driven: 13 tasks with tests; requirements amended before the globe was built.
- **Ten parallel `source-curator` runs** grew the disc from 38 to 100 places under a
  shared rules file (`scripts/data/CURATION_RULES.md`).
- **`npm run data:verify`** checks every source over the network: 236 distinct
  sources, all 100 Commons images exist with matching licenses, **0 failures**. It
  caught a real error (an image declared public domain that Commons lists as CC0),
  which was fixed.
- **Blocking PreToolUse hook** (`scripts/guard.mjs`) refuses any write that would
  leave a summary, fact, or image unsourced, with 5 tests of its own.
- **Custom MCP server** (`scripts/mcp/server.ts`, 4 tools, no dependencies), built
  because the curation agents hit Wikimedia rate limits.
- 25 test files / 136+ tests, lint at zero warnings, type-check and build green.

**Why not 10:** the MCP server is not registered yet. A permission rule stops the
agent writing `.kiro/settings/`, so copy `scripts/mcp/mcp.example.json` to
`.kiro/settings/mcp.json` yourself, then reconnect it from the MCP view.

## Design — 9.5

**Verified** in real Chrome at 360, 768, and 1280 px:
- **axe-core: 0 violations** on boot, explore, article, log, and proof (WCAG 2.0/2.1
  A and AA rules plus best practice).
- No horizontal scrolling at any width (a phone overflow was found and fixed).
- No console errors; every article image loads from the bundled files.
- 3D globe with real coastlines, flat-map fallback, compact place grid on phones.
- Every image hand-reviewed for subject: six automatically chosen images were
  wrong (for example a cyclist for "Bora Bora") and were replaced and re-checked;
  unclear or non-English alt text was rewritten.

**Why not 10:** the globe has only run on software WebGL; automated axe checks are
not a full accessibility audit, which needs manual screen-reader testing.

## Innovation / Idea — 9.5

**Verified**
- The **Proof** page checks the manifesto live in the reader's browser instead of
  asserting it: 370 facts and 100 images citing 236 sources, **0 unsourced**,
  **0 other websites contacted**, **0 cookies**, and exactly what is stored on the
  device. A "Check again" button re-measures after wandering.
- The anti-feed values stay code invariants (SourceGate, the engagement-free
  `buildTrails` signature, a build-failing integrity test).

**Why not 10:** the idea is only as strong as the pitch that carries it.

## Presentation — 3 (skipped by choice)

Scored on the demo video, which does not exist yet. The script and storyboard are
ready. Recording it is the single biggest remaining swing.

---

## Known limits (honest list)
- UNESCO's site refuses some automated requests (HTTP 403). The verifier reports
  these as warnings, not passes; across two runs every UNESCO page answered at
  least once.
- The globe is untested on a real GPU and on phones.
- The blocking hook takes effect from the next Kiro session.
- Scores use the five-criteria rubric you supplied; confirm it against the
  official 2026 Devpost rules.
