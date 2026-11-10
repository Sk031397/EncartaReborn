# Encarta Reborn

**The encyclopedia that doesn't scroll back.**

A calm, offline-first, algorithm-free encyclopedia for exploring real places on
Earth. It resurrects the dead CD-ROM encyclopedia (Encarta, 1993–2009) and
reimagines it for 2026 as the deliberate opposite of the doomscrolling attention
economy. Wander a world map, read fully-sourced articles, follow curiosity trails,
and keep a private expedition log — no feed, no algorithm, no account, no network
required.

Built for **Kiroween 2026**, Resurrection track. See [KIRO.md](./KIRO.md) for how
it was built with Kiro.

## The anti-feed manifesto
1. No infinite scroll.
2. No algorithmic recommendations — trails come from a knowledge graph, not
   engagement.
3. No engagement metrics (no likes, views, trending, comments).
4. No tracking, no accounts — personal data stays on-device.
5. Every factual claim is sourced from an approved open dataset, with a visible
   citation.
6. Offline-first, in the spirit of a CD-ROM.
7. Calm by default — gentle motion, sound off by default, no urgency.

## The loop
Boot ("insert disc") → Explore (3D globe or flat map, plus spin) → Article (sourced, cited) →
Trails (3–5 curiosity links) → Expedition log (your private history).

## Data sources
All content is curated (by the `source-curator` Kiro agent) from public/open
datasets: Wikipedia (text, CC BY-SA), UNESCO World Heritage, Wikimedia Commons
photos (CC0, public domain, CC BY, CC BY-SA, including NASA imagery), and Natural
Earth coastlines (public domain). Every summary, fact, and image carries its source
and license, and `npm run data:verify` checks them over the network. Images are
bundled in `public/media/` so the app works offline; their authors and licenses
stay in each image's citation. The data is licensed separately from the code.

## Tech
React + TypeScript + Vite, hand-crafted retro CSS design system, Zod-validated
data snapshot, an interactive three.js globe (lazy-loaded, with a flat-map
fallback) drawn from bundled Natural Earth coastlines, installable PWA with a service worker precaching the bundled
snapshot for true offline use. WCAG 2.1 AA as the accessibility floor.

## Develop
```bash
npm install
npm run dev          # local dev server
npm run test:run     # run all tests once
npm run lint         # ESLint + jsx-a11y, zero-warning gate
npm run build        # production PWA build
npm run data:build   # re-run the sourcing pipeline over the snapshot
```

## Project layout
```
.kiro/               # spec, steering, hooks, and the source-curator agent
public/data/         # the bundled, licensed place snapshot
scripts/             # build-time open-data pipeline (fetch + assemble + validate)
src/
  app/               # shell, router, boot screen, PWA registration
  features/          # explore, article, trails, log
  data/              # schema, validators, snapshot loader
  ui/                # retro design system (tokens, primitives, sound)
  lib/               # graph (trails), on-device storage
```
# EncartaReborn
# EncartaReborn
# EncartaReborn
