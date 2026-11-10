---
inclusion: always
---

# Encarta Reborn — Technical Standards

## Stack
- **Framework:** React + TypeScript with Vite.
- **Styling:** Plain CSS / CSS modules with a small design-token layer. No heavy UI
  framework — the retro aesthetic is hand-crafted and intentional.
- **State:** Local component state + a small store (Zustand or React context). No
  server state manager is needed because the app is offline-first.
- **Persistence:** The expedition log and notes persist to the browser via
  `localStorage` / `IndexedDB`. Nothing is sent to a server.
- **Offline:** Ship as an installable PWA with a service worker. Bundle a curated
  snapshot of place data so the app fully works with no network.
- **Data:** A build-time pipeline fetches from approved open datasets and writes a
  static, licensed JSON snapshot into the app. At runtime the app reads the
  snapshot — it does not call third-party APIs on the critical path.

## Project conventions
- TypeScript strict mode on. No `any` unless justified with a comment.
- Components are function components with hooks. Keep them small and focused.
- Prefer composition over configuration flags.
- Keep the data schema in one place (`src/data/schema.ts`) and validate the
  snapshot against it.
- All place data records carry a `sources: Source[]` field. A record with no
  source is invalid and must not render.

## Data record contract (summary — full schema lives in src/data/schema.ts)
A `Place` has: id, name, type, coordinates, a sourced `summary`, `facts: Fact[]`,
`media: Media[]` (each with license + attribution), and `trails: TrailLink[]`.
Every `Fact`, `Media`, and the `summary` carry at least one `Source`
(name, url, license).

## Accessibility (hard requirement — see structure.md laws too)
- WCAG 2.1 AA as the floor. Full keyboard navigation, visible focus, semantic
  landmarks, alt text on all imagery (from the data's attribution/description),
  prefers-reduced-motion respected, color contrast >= 4.5:1 for text.
- Sound is opt-in and off by default.

## Testing & quality
- Vitest for unit/logic tests; React Testing Library for components.
- A data-integrity test asserts every rendered-eligible record has >=1 valid source.
- ESLint + Prettier. The accessibility lint rules (eslint-plugin-jsx-a11y) are on.

## Performance
- Target a fast first paint; the boot screen can mask snapshot load.
- Lazy-load heavy media; never autoplay.

## 3D globe (Explore)
- three.js is allowed **only** inside the lazy-loaded `Globe3D` module. It must
  never be imported from the boot path.
- The globe never moves on its own: no auto-rotation, no idle animation. Render
  on demand, and make camera moves instant under `prefers-reduced-motion`.
- A canvas is not accessible by itself. Keep the button controls, the full place
  list, and the flat-map fallback working whenever the globe is shown.
- Draw the Earth from bundled data only (Natural Earth via `world-atlas`, drawn
  with d3-geo so shapes are clipped correctly at the antimeridian). No texture
  downloads, no tile servers, no CDNs.
- Keep pure math and geometry out of the three.js module so it stays testable in
  jsdom. WebGL itself is verified in a real browser.
