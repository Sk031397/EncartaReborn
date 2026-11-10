# Implementation Plan — Encarta Reborn

Each task is incremental, test-backed, and references the requirements it fulfills.
Work top to bottom. The post-task hook runs tests when a task is completed; note the
Kiro feature that drove each task for the submission write-up (Req 8.5).

- [x] 1. Scaffold the project and quality gates
  - Initialize Vite + React + TypeScript (strict) in the workspace root
  - Add ESLint + Prettier + eslint-plugin-jsx-a11y and a `lint` script
  - Add Vitest + React Testing Library and `test`/`test:run` scripts
  - Create the folder structure from structure.md (app, features, data, ui, lib, scripts, tests)
  - Verify: `npm run lint` and `npm run test:run` succeed on an empty suite
  - _Requirements: 7.1, 8.2_

- [x] 2. Define the data schema and validators
  - Implement `src/data/schema.ts` with the types from design.md and a zod runtime schema
  - Implement `src/data/validators.ts`: `hasValidSource`, `isRenderable`, fact/media source filtering
  - Write unit tests for validators (unsourced records are gated out)
  - _Requirements: 3.3, 6.4, 6.5_

- [x] 3. Build a tiny seed snapshot and the snapshot loader
  - Hand-author a small, fully-sourced seed `public/data/snapshot.json` (3–5 places) via the source-curator agent, every claim cited
  - Implement `src/data/snapshotLoader.ts` to load + validate the snapshot
  - Add the data-integrity test: fails if any renderable place lacks a summary source
  - _Requirements: 1.1, 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5, 8.3, 8.4_

- [x] 4. Create the retro UI design system
  - Implement `src/ui` tokens (retro palette with >=4.5:1 contrast), type scale, spacing
  - Build primitives: Panel, Button, Rail, Disc loader; focus-visible styles; skip link
  - Add optional sound module, off by default
  - Unit/snapshot test a primitive; contrast token test
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 5. App shell, routing, and boot screen
  - Implement `src/app/App.tsx` with providers and routes (/, /place/:id, /log)
  - Implement `BootScreen` ("insert disc") that masks snapshot load and respects reduced motion
  - Register the PWA service worker (precache shell + snapshot)
  - Verify offline load path in a test/dev check
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.3, 7.5_

- [x] 6. Explore view (map/globe + spin)
  - Implement `ExploreView` rendering selectable places from the snapshot
  - Implement neutral `SpinButton` (random choice, no recommendation)
  - Ensure keyboard navigation and reduced-motion; no infinite scroll
  - Component test: selecting a place routes to its article; spin picks a valid place
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.3_

- [x] 7. Article view with SourceGate and citations
  - Implement `ArticleView`: summary, facts, lead image, all gated by SourceGate
  - Implement `Citation` (name + license, links to URL); alt text on images
  - Assert no likes/metrics/comments are rendered
  - Component tests: unsourced elements never render; citation always present
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Curiosity trails (graph-derived)
  - Implement `src/lib/graph.ts#buildTrails(place, graph)` — 3–5 links by shared
    category/geography/topic; signature excludes any engagement input
  - Implement `TrailRail`; following a link opens that article, back-navigable
  - Unit tests: 3–5 links, graph-only derivation, graceful fewer-links case
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Expedition log (on-device)
  - Implement `src/lib/storage.ts` (localStorage + IndexedDB for notes), namespaced, no network
  - Implement `useExpeditionLog`: record visits, persist notes, clear; `ExpeditionLog` view
  - Verify visits recorded on article view; notes persist across sessions; clear works
  - Tests: persistence round-trip; nothing transmitted off-device
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Build-time data pipeline (expand the snapshot)
  - Implement `scripts/buildSnapshot.ts` (later joined by `scripts/lib/net.ts` and `scripts/enrichMedia.ts`): fetch only approved
    sources, record name/url/license, paraphrase+attribute, drop unsourced data, validate, write snapshot
  - Run via the source-curator agent to expand to a richer, license-clean set of places
  - Re-run the data-integrity test on the expanded snapshot
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.3, 8.4_

- [x] 11. Accessibility and calm pass
  - Audit landmarks, focus order, skip link, contrast, reduced-motion across the whole loop
  - Confirm sound is opt-in/off by default and no urgency/autoplay cues exist
  - Add focus-order and reduced-motion tests on key views
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. End-to-end loop verification + submission notes
  - Verify boot → explore → article → trails → log works offline, end to end
  - Write `KIRO.md` documenting which Kiro feature drove each task (spec/steering/hooks/agent)
    and the experimentation story, for the presentation
  - Final `npm run lint` and `npm run test:run` green
  - _Requirements: 1.1, 2.2, 3.1, 4.3, 5.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. Interactive 3D globe for Explore
  - Add `three`, `d3-geo`, `topojson-client`, `world-atlas` (pinned); lazy-load `Globe3D`
  - Paint the Earth texture from bundled Natural Earth data via d3-geo (no image files)
  - Orbit/zoom, hover label, click-to-open, turn-to-face on list hover, on-demand rendering
  - Accessible controls as buttons, 3D globe / flat map toggle, full place list kept
  - Flat map fallback (no WebGL or lost context) using the same real coastlines
  - Unit-test the math and geometry (incl. an antimeridian regression); mock WebGL for wiring tests
  - Verify in a real browser: render, picking, controls, cleanup, no console errors
  - _Requirements: 2.6, 2.7, 2.8, 7.1, 7.3_
