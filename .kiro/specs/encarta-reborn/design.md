# Design — Encarta Reborn

## Overview

Encarta Reborn is a single-page, offline-first PWA built with React + TypeScript +
Vite. It resurrects the CD-ROM encyclopedia as a calm, algorithm-free place
explorer. The entire experience runs from a bundled, licensed data snapshot so it
works with no network. There is no backend; all personal data stays on-device.

This design maps directly to the eight requirements and is bound by the three
steering files (`product.md`, `tech.md`, `structure.md`). The anti-feed manifesto
is treated as an architectural constraint, not a preference.

### Design goals (tied to judging criteria)
- **Impact:** a genuinely usable, accessible tool that teaches real, sourced facts.
- **Innovation:** reviving a dead tech category as a pointed "anti-feed" stance,
  combining several open datasets into one offline artifact.
- **Design:** one coherent retro-reimagined identity across the whole loop.
- **Tech/Kiro:** spec-driven, steering-constrained, hook-guarded, agent-curated.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (PWA)                          │
│                                                                │
│  ┌───────────┐   App Shell (src/app)   ┌───────────────────┐   │
│  │ Boot /    │ ─────────────────────▶  │  Router / Views    │   │
│  │ Insert    │                         │  explore/article/  │   │
│  │ Disc      │                         │  trails/log        │   │
│  └───────────┘                         └─────────┬─────────┘   │
│                                                   │             │
│         ┌─────────────────────────────┬──────────┘             │
│         ▼                             ▼                         │
│  ┌──────────────┐           ┌───────────────────┐              │
│  │ Snapshot      │          │ Local Store        │              │
│  │ Loader +      │          │ (expedition log,   │              │
│  │ Validator     │          │  notes, settings)  │              │
│  │ (src/data)    │          │  localStorage/IDB  │              │
│  └──────┬───────┘           └───────────────────┘              │
│         │ reads at runtime                                      │
│         ▼                                                       │
│  ┌──────────────────────────┐                                  │
│  │ public/data/snapshot.json │  ← bundled, licensed, offline    │
│  └──────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────┘
          ▲ build time only (never on critical runtime path)
          │
┌─────────┴───────────────────────────────────────────────┐
│ scripts/ data pipeline                                    │
│  fetch (Wikipedia/Wikidata, OSM/Natural Earth, NASA,      │
│  UNESCO, PD/CC media) → paraphrase+attribute → validate   │
│  → write public/data/snapshot.json                        │
│  (operated via the source-curator custom agent)           │
└───────────────────────────────────────────────────────────┘
```

Key rule: third-party dataset access happens **only at build time** in `scripts/`.
At runtime the app reads the static snapshot, satisfying the offline-first law.

## Components and Interfaces

### App shell (`src/app`)
- `App` — mounts providers, service worker registration, and the router.
- `BootScreen` — the "insert disc" intro; masks snapshot load; respects reduced
  motion; transitions to Explore. (Req 1.3, 7.3)
- Router with four routes: `/` (Explore), `/place/:id` (Article), `/log`
  (Expedition Log), plus a settings panel (sound opt-in). (Req 2, 3, 5, 7.2)

### Explore feature (`src/features/explore`)
- `ExploreView` — map/globe with selectable places from the snapshot. (Req 2.1)
- `SpinButton` — neutral random place selection, not a recommendation. (Req 2.4)
- No infinite scroll, no "for you" stream. (Req 2.3)
- `Globe3D` — a three.js globe, **lazy-loaded** so it stays out of the boot
  screen. Coastlines come from bundled Natural Earth data drawn through d3-geo
  (correct antimeridian clipping) onto a canvas texture, so there is no image
  file and no network. Rendering is on demand (no permanent animation loop) and
  it never moves by itself. Camera moves are instant under reduced motion.
  (Req 2.6, 2.8)
- Accessibility for the 3D view: real `<button>` controls (turn, zoom), the full
  place list beside it (hovering or focusing a name turns the globe to face
  it), and a 3D globe / flat map toggle. (Req 2.8)
- Fallback: when WebGL is missing or the context is lost, Explore shows the flat
  map, which uses the same coastlines. (Req 2.7)
- Pure helpers (`globeMath`, `geo`, `webgl`, `viewPref`) have no three.js import
  and are unit-tested in jsdom; the scene itself is verified in a real browser.

### Article feature (`src/features/article`)
- `ArticleView` — neutral summary, key facts, lead image. (Req 3.1)
- `Citation` — renders source name + license, links to URL. (Req 3.2)
- `SourceGate` — a render guard: any element whose record lacks a valid Source is
  not rendered. (Req 3.3) This is the runtime embodiment of manifesto law 5.
- No likes/metrics/comments. (Req 3.4) Images carry alt text. (Req 3.5)

### Trails feature (`src/features/trails`)
- `TrailRail` — shows 3–5 graph-derived related places. (Req 4.1)
- `buildTrails(place, graph)` in `src/lib/graph.ts` — pure function deriving links
  from shared category/geography/topic. No engagement inputs exist in its
  signature, which makes manifesto law 2 structurally enforceable. (Req 4.2, 4.4)

### Log feature (`src/features/log`)
- `ExpeditionLog` — bounded list of visited places + notes. (Req 5.3)
- `useExpeditionLog()` — records visits, persists notes, supports clear. Stored via
  the local store only. (Req 5.1, 5.2, 5.4, 5.5)

### Data layer (`src/data`)
- `schema.ts` — canonical TypeScript types + a runtime validator (zod).
- `snapshotLoader.ts` — loads and validates `public/data/snapshot.json`.
- `validators.ts` — `hasValidSource(x)` and `isRenderable(record)` used by the
  SourceGate and by the data-integrity test. (Req 3.3, 6.5)

### UI system (`src/ui`)
- Design tokens (retro palette, type scale, spacing), primitives (Panel, Button,
  Rail, Disc loader), and an optional sound module (off by default). One coherent
  identity across the loop. (Req 7.4, 7.2)

### Build pipeline (`scripts/`)
- `lib/net.ts` + `lib/sources.ts` — polite, rate-limited access to Wikipedia and
  Wikimedia Commons, recording name/url/license (shared with the MCP server).
- `enrichMedia.ts` — finds license-clean images and bundles them in `public/media/`.
- `verifyData.ts` — checks every cited URL and image license over the network.
- `buildSnapshot.ts` — paraphrases/attributes, drops unsourced data, validates
  against `schema.ts`, writes `public/data/snapshot.json`. (Req 6)
- Operated through the `source-curator` agent so curation stays license-clean.

## Data Models

```ts
// src/data/schema.ts (canonical)
type License =
  | 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'public-domain' | 'ODbL' | 'other';

interface Source {
  name: string;   // e.g. "Wikipedia", "OpenStreetMap", "NASA"
  url: string;    // resolvable citation URL
  license: License;
}

interface Fact {
  label: string;      // e.g. "Population"
  value: string;      // e.g. "2.1 million (2020)"
  sources: Source[];  // >= 1 required
}

interface Media {
  kind: 'image' | 'audio';
  url: string;
  alt: string;            // descriptive alt text (Req 3.5)
  attribution: string;    // required
  sources: Source[];      // >= 1 required
}

interface TrailLink {
  toId: string;
  reason: 'category' | 'geography' | 'topic'; // graph-derived only
}

interface Place {
  id: string;
  name: string;
  type: 'country' | 'city' | 'landmark' | 'natural' | 'heritage';
  coordinates: { lat: number; lon: number };
  summary: { text: string; sources: Source[] }; // >= 1 source
  facts: Fact[];
  media: Media[];
  trails: TrailLink[];
  categories: string[]; // feeds the graph for trails
}

interface Snapshot {
  version: string;
  generatedAt: string;
  places: Place[];
}
```

`isRenderable(place)` requires `place.summary.sources.length >= 1`; `facts` and
`media` are filtered to those with `sources.length >= 1` before render. This makes
"no unsourced facts" a code invariant, not a review checklist.

## Offline / PWA strategy
- Vite PWA plugin generates a service worker that precaches the app shell and
  `public/data/snapshot.json`. (Req 1.1, 1.4)
- First paint shows the boot screen while the snapshot loads/validates. (Req 1.3)
- No runtime fetch to third-party APIs on the critical path. (Req 6 note)

## Local persistence
- `src/lib/storage.ts` wraps `localStorage` (settings, small log) with an IndexedDB
  path for notes if they grow. Namespaced keys, no network. (Req 5)

## Accessibility strategy (Req 7)
- Semantic landmarks (`header`, `main`, `nav`), focus-visible styles, skip link.
- Keyboard: map places and trail links are real buttons/links in tab order.
- `prefers-reduced-motion` disables the disc spin and globe rotation.
- Contrast tokens chosen for >= 4.5:1; verified in a contrast test.
- `eslint-plugin-jsx-a11y` enforced; the a11y-lint-on-save hook runs on save.

## Error handling
- Snapshot fails validation → show a calm, non-alarming fallback and log to console;
  never crash into a blank screen.
- Missing media/source → element is gated out (SourceGate), not shown broken.
- Storage unavailable (private mode) → log works in-memory for the session with a
  gentle notice; no data leaves the device.

## Testing strategy
- **Unit:** `buildTrails` returns 3–5 graph-derived links and ignores any non-graph
  input; `validators` correctly gate unsourced records.
- **Data-integrity:** every renderable place in the snapshot has >= 1 source on its
  summary; no rendered fact/media lacks a source. Fails the build otherwise.
  (Req 6.5)
- **Component:** ArticleView never renders likes/metrics/comments and always shows a
  citation; images have alt text.
- **A11y:** focus order and reduced-motion behavior on key views.
- Tests run via Vitest; the post-task hook runs them after each completed spec task.

## Kiro feature mapping (for the submission write-up — Req 8)
- **Spec:** this requirements/design/tasks set drives the whole build.
- **Steering:** `product.md` / `tech.md` / `structure.md` constrain every generation.
- **Hooks:** Source Citation Guard (data integrity), Accessibility + Lint on Save,
  Run Tests After Spec Task.
- **Agent:** `source-curator` produces license-clean, sourced place records.
- **Experimentation note:** the "anti-feed" laws are enforced structurally (pure
  trail function, SourceGate, data-integrity test) rather than by convention — a
  deliberate AI-dev strategy worth narrating in the video.
