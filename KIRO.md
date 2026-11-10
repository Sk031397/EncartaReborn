# Built with Kiro — Encarta Reborn

Kiroween 2026 · **Resurrection** track · *Bring your favorite dead technology
back to life.*

This document is the submission's "how it was built with Kiro" record. It maps
each part of the product to the Kiro feature that drove it, so the judging
criterion **Technological Implementation** is easy to trace.

## The idea in one line
Encarta Reborn resurrects the **CD-ROM encyclopedia** (Encarta, 1993–2009) — the
last great model of calm, self-directed, serendipitous learning — and rebuilds it
for 2026 as the deliberate opposite of the doomscrolling attention economy. You
wander a world map, read fully-sourced articles about real places, follow
curiosity "trails", and keep a private expedition log. No feed. No algorithm. No
account. Works offline, like a disc.

## Why it fits the Resurrection track
The CD-ROM encyclopedia is genuinely dead, and what replaced it (the
engagement-optimized feed) is the thing now harming how people form opinions
about the world. Reviving it is not nostalgia for nostalgia's sake — it is
reviving a *better interaction model* and pointing it at a real, current problem.

## A thoughtful AI-development strategy with Kiro
The guiding decision was to make the product's values **structurally enforced by
the toolchain**, not just promised in prose. Kiro's features were used as layers
of that enforcement:

### 1. Spec (requirements → design → tasks)
The entire build was driven by a single spec at
`.kiro/specs/encarta-reborn/`:
- `requirements.md` — 8 requirements in EARS form, each tied to a judging
  criterion and to the anti-feed manifesto.
- `design.md` — architecture, data models, the SourceGate pattern, the
  engagement-free trail function, offline/PWA strategy, and a Kiro-feature map.
- `tasks.md` — 12 incremental, test-backed tasks; every one was executed and
  checked off.

### 2. Steering (always-on project principles)
Three always-included steering files kept every generation on-brand:
- `product.md` — the product and the **anti-feed manifesto** (7 non-negotiable
  laws: no infinite scroll, no algorithmic recommendations, no engagement
  metrics, no tracking/accounts, every claim sourced, offline-first, calm by
  default).
- `tech.md` — stack, offline-first rule, the data contract, WCAG AA floor.
- `structure.md` — directory layout and six working laws.

### 3. Custom agent (`source-curator`)
A purpose-built agent at `.kiro/agents/source-curator.md` curated all place
content. It is constrained to **approved open datasets only** (Wikipedia/Wikidata,
OpenStreetMap/Natural Earth, NASA/public-domain, UNESCO, PD/CC media) and refuses
to emit any datum it cannot cite. It produced the 10-place snapshot, each summary,
fact, and image carrying a `Source { name, url, license }`. It later grew the
disc to 100 places in ten parallel runs, each writing its own batch file under the
shared rules in `scripts/data/CURATION_RULES.md`.

### 4. Agent hooks (automation that enforces the values)
Three hooks at `.kiro/hooks/`:
- **Source Citation Guard** (`source-citation-block.json`) — blocks any write
  that would leave a summary, fact, or image unsourced (see section 6). This
  literally enforces the "no unsourced opinions" value in the tooling.
- **Accessibility + Lint on Save** (`a11y-lint-on-save.json`) — runs ESLint +
  `jsx-a11y` on code saves.
- **Run Tests After Spec Task** (`test-after-task.json`) — runs the test suite
  after each completed spec task.

### 5. A custom MCP server (`encarta-sources`)
`scripts/mcp/server.ts` is a dependency-free MCP server (stdio, JSON-RPC) that
gives agents four tools: `wikipedia_summary`, `commons_license`, `commons_search`,
and `validate_places`. It exists because of a real failure: when ten
`source-curator` runs worked in parallel, their anonymous fetches hit Wikimedia's
HTTP 429 rate limit, and they correctly left images out instead of guessing. The
server identifies itself, backs off on 429, and checks every image's real license
before it is cited. Config: `scripts/mcp/mcp.example.json` (copy it to
`.kiro/settings/mcp.json`).

### 6. A blocking guard, not just an audit
The first Source Citation Guard was a prompt that reviewed files *after* they
were saved. It is now a `PreToolUse` command hook (`source-citation-block.json`
running `scripts/guard.mjs`): any write that would leave a summary, fact, or
image without a name, https url, and license **exits 2 and is refused**, with
the reason shown to the agent. It has its own tests.

### Experimentation worth narrating
The "anti-feed" laws were made into **code invariants**, not review checklists:
- `SourceGate` in the Article view refuses to render any element whose record
  lacks a valid source.
- `buildTrails(place, graph)` has **no parameter** for engagement/personalization —
  there is nowhere to inject a "keep them hooked" signal, so manifesto law 2 is
  impossible to violate by construction.
- A data-integrity test fails the build if any renderable record is unsourced.

## Task → Kiro-feature map
| Task | What shipped | Kiro feature(s) that drove it |
|---|---|---|
| 1 | Vite + React + TS scaffold, lint/test gates | Spec, Steering (tech) |
| 2 | Data schema + source validators | Spec, Steering (product law 5) |
| 3 | Seed snapshot + loader + integrity test | **source-curator agent**, Citation Guard hook |
| 4 | Retro UI design system (tokens, primitives, disc, sound) | Spec, Steering (tech a11y) |
| 5 | App shell, router, "insert disc" boot, PWA | Spec (offline-first) |
| 6 | Explore map + neutral spin | Spec, Steering (product laws 1–2) |
| 7 | Article view + SourceGate + citations | Spec, Steering (product laws 3–5) |
| 8 | Graph-derived curiosity trails | Spec, Steering (product law 2) |
| 9 | On-device expedition log | Spec, Steering (product law 4) |
| 10 | Build-time data pipeline, snapshot expanded to 38 places | **source-curator agent**, Citation Guard hook |
| 11 | Accessibility + calm pass | Steering (tech a11y), a11y-lint hook |
| 12 | End-to-end offline verification + these notes | Spec |
| 13 | Interactive 3D globe (three.js, lazy-loaded, accessible, 2D fallback) | Spec (new requirements 2.6-2.8), Steering (new 3D rules in tech.md) |
| 14 | 100 places, every one with a bundled, license-checked image; search and filters | **10 parallel source-curator runs**, media pipeline, blocking guard |
| 15 | `data:verify`: every cited URL and image license checked over the network | MCP server helpers, spec |
| 16 | Proof page: sources, outside requests, and cookies measured live | Steering (manifesto), spec |

## Verification snapshot
- 95 tests passing across 17 files (unit, component, data-integrity, a11y,
  globe math and coastline geometry).
- The 3D globe was also checked in a real Chrome (software WebGL): it renders,
  picking opens the right article, controls work, switching views frees the GPU
  context, and there are no console errors.
- **38 real places**, every summary/fact/media sourced to an approved open
  dataset; the data-integrity test proves it and fails the build otherwise.
- ESLint (with `jsx-a11y`) clean at `--max-warnings=0`.
- Production build green; installable PWA with disc-motif icons; the service
  worker precaches the shell, icons, and the data snapshot for true offline use.

## Run it
```
npm install
npm run dev        # explore locally
npm run test:run   # all tests
npm run build      # production PWA (offline-capable)
npm run data:build # re-run the sourcing pipeline over the snapshot
```
