# Devpost submission: Encarta Reborn

Copy each section into the matching Devpost field. Items in `[BRACKETS]` are
yours to fill in. The checklist at the bottom is for you and is not for pasting.

---

## Basics

**Project name:** Encarta Reborn

**Tagline (short):** The encyclopedia that doesn't scroll back.

**Category:** Resurrection

**Elevator pitch (about 200 characters):**
A calm, offline, algorithm-free encyclopedia of real places. It revives the dead
CD-ROM encyclopedia as the opposite of doomscrolling: no feed, no tracking, every
fact sourced.

**Links**
- Code (public repo, OSI license): `[GITHUB URL]`
- Demo video (under 3 minutes): `[VIDEO URL]`
- Try it: `[LIVE DEMO URL]`

---

## Inspiration

There was a time when learning about a place meant opening a book, or an
encyclopedia on a disc, and following your own curiosity. Nothing chose for you.
Today most of what we learn about the world arrives through an algorithm tuned for
engagement. It rewards outrage, never ends, and hands us opinions already formed.

The technology that did this well is dead. Microsoft Encarta (1993 to 2009) was the
last great example of bounded, browsable, serendipitous learning. You opened it with
no goal, followed a link, and came out knowing something you never searched for. It
died because the internet won, and what replaced it was the attention economy.

Encarta Reborn brings that model back for 2026 and points it at a problem we have
now: people no longer form opinions about the world on their own terms.

## What it does

Encarta Reborn is an offline-first encyclopedia of **100 real places** across all
seven regions, from Antarctica to Timbuktu: cities, landmarks, natural wonders,
and UNESCO sites, each with a license-checked photo that ships with the app. You
can search them by name or theme, or filter by region and kind of place.

A **Proof** page checks the product's promises live in your browser: how many
sources back the facts, how many other websites the page has contacted (zero), and
how many cookies it has set (zero).

- **Boot:** an "insert disc" screen starts the app, in the spirit of a CD-ROM.
- **Explore:** turn an interactive **3D globe** (or a flat map), pick a place, or
  spin to a random one. Every place is also in a plain list.
- **Read:** each article has a neutral summary, key facts, and a public-domain or
  Creative Commons image. **Every claim carries a visible citation** with the source
  and license. If a claim can't be sourced, it isn't shown.
- **Follow trails:** 3 to 5 curiosity links to related places. They come from a
  knowledge graph (shared category, place type, geography), never from engagement.
- **Keep an expedition log:** the places you visited and your own notes, stored only
  on your device.

What it deliberately does not have: infinite scroll, recommendations tuned to keep
you hooked, likes, view counts, trending, comments, accounts, or tracking. Sound is
off by default and nothing moves on its own.

## How we built it

React, TypeScript, and Vite, with a hand-crafted retro design system (no UI
framework). It is an installable PWA whose service worker precaches the app shell,
the data, and the 3D globe code so it can run offline.

- **Data:** a bundled, Zod-validated snapshot. Sources are Wikipedia, UNESCO World
  Heritage, Wikimedia Commons (including NASA public-domain imagery), and Natural
  Earth. Every summary, fact, and image has a `{ name, url, license }` source.
- **3D globe:** three.js, **lazy-loaded** so the first screen stays light. The Earth
  texture is painted at runtime from bundled Natural Earth coastlines through
  d3-geo, so there are no image downloads, no tile servers, and no network.
- **Accessibility:** WCAG AA contrast is checked by a test, there is full keyboard
  navigation and a skip link, and `prefers-reduced-motion` is respected. The globe
  has real button controls and a full place list beside it, and it falls back to a
  flat map when WebGL isn't available.
- **Quality gates:** 136 tests across 25 files, ESLint with `jsx-a11y` at zero
  warnings, a type-checked production build, and **axe-core with 0 violations** on
  every view at phone, tablet, and desktop widths.
- **Data verification:** `npm run data:verify` checks all 236 cited sources over
  the network and every image's real license on Commons (0 failures).

### How Kiro built it (the part we're proudest of)

Our approach was to make the product's values **impossible to break by accident**,
and to use Kiro's features as layers that enforce them.

**Specs.** The whole build was driven by one spec: 8 requirements in EARS form, a
design document, and 13 tasks, each checked off with tests. The spec stayed alive. When
we decided to add the 3D globe, we first amended the requirements (2.6 to 2.8:
calm by default, flat-map fallback, operable without a pointer, no network), then
the design, then added task 13.

**Steering.** Three always-on steering files (`product.md`, `tech.md`,
`structure.md`) hold the **anti-feed manifesto**: seven non-negotiable laws such as
no infinite scroll, no algorithmic recommendations, every claim sourced, and
offline-first. Every generation was constrained by them. Steering also evolved with
the project: after the globe landed we added a "3D globe" section to `tech.md`
(three.js only in the lazy module, never auto-rotates, always keep the accessible
alternatives, draw only from bundled data).

**A custom agent: `source-curator`.** This agent wrote all 100 places, the last 62
in ten parallel runs that each wrote their own batch file under shared rules. It may use
only approved open datasets, must attach a source and license to every datum, and
must refuse anything it can't cite. It behaved the way we hoped. When candidate
image filenames returned 404, it **omitted the images instead of guessing**. It
also caught and fixed its own mistakes, including a placeholder trail link and a
reference to a place that didn't exist yet. When it had no terminal, it said so
instead of faking test results.

**Agent hooks.** Three hooks run automatically:
- *Source Citation Guard* re-audits every saved data file: each summary, fact, and
  image must have a name, URL, and license.
- *Accessibility + Lint on Save* runs ESLint with `jsx-a11y` when code is saved.
- *Run Tests After Spec Task* runs the suite when a spec task completes.

**Values as code, not promises.** The manifesto is enforced structurally:
- `SourceGate` refuses to render any element whose record has no valid source.
- `buildTrails(place, graph)` has **no parameter** for engagement or
  personalization. There is nowhere to inject a "keep them hooked" signal.
- A data-integrity test **fails the build** if any shown fact or image is unsourced.

**Vibe and spec sessions together.** We used spec sessions for the structured build
and conversational sessions to explore ideas, review, and debug. That includes
checking the globe in a real browser and fixing what we saw.

**A custom MCP server.** When ten curator runs worked in parallel, their anonymous
fetches hit Wikimedia's rate limit (HTTP 429), and they rightly left images out
rather than guess. So we built `encarta-sources`, a dependency-free MCP server with
four tools (`wikipedia_summary`, `commons_license`, `commons_search`,
`validate_places`) that identifies itself, backs off politely, and checks an
image's real license before it can be cited.

**A blocking guard.** The citation guard began as an after-the-fact review. It is
now a `PreToolUse` hook that refuses any write leaving a summary, fact, or image
unsourced, and tells the agent why.

## Challenges we ran into

- **Lines across the world map.** In a real-browser check, solid lines cut across
  the whole map. Fiji and Wrangel Island straddle the 180th meridian, and drawing
  their raw coordinates joined the two halves with a line across the planet. The unit
  tests couldn't catch it because jsdom has no GPU. We switched all drawing to
  d3-geo, which clips at the antimeridian, and added a regression test that fails if
  any path segment wraps the map.
- **A black ring around the globe.** Our atmosphere glow wrote an opaque alpha, which
  paints solid black on a transparent canvas. The fix was a premultiplied color whose
  alpha fades to zero.
- **Licensing honesty.** UNESCO pages aren't Creative Commons, so those citations use
  the license `other` instead of a label that would be wrong.
- **A canvas is invisible to keyboards.** A 3D globe on its own would exclude people.
  We kept button controls, the full place list, and the flat-map fallback.

## Accomplishments that we're proud of

- A real product loop (boot, explore, read, trails, log) that works offline.
- Values enforced by code, tests, and hooks instead of promised in a README.
- Every one of the 100 places is fully sourced and license-checked, and the build
  proves it. The network verifier even caught one of our own mistakes (an image
  marked public domain that Commons lists as CC0).
- We reviewed every automatically chosen photo by eye and replaced six that were
  wrong, including a cyclist for "Bora Bora" (his team sponsor is called Bora).
- A 3D globe that respects the same calm, accessible, offline rules as the rest of
  the app.

## What we learned

The most useful thing Kiro did was not generate code faster. It let us **encode
intent** in specs, steering, hooks, and an agent, so the intent held up as the
project changed. We also learned to check visuals in a real browser instead of
trusting passing tests. Both of the globe's worst bugs got past the unit tests.

## What's next

- More places, with more license-clean images.
- A "trail history" view of your own path through the knowledge graph.
- A pass on real GPUs and phones, and optional offline map packs.
- A contributor guide so the community can add sourced places, with the same
  citation guard enforcing quality.

---

## Built with
`react` · `typescript` · `vite` · `three.js` · `d3-geo` · `topojson` ·
`natural-earth` · `zod` · `vitest` · `testing-library` · `eslint-plugin-jsx-a11y` ·
`workbox` / `vite-plugin-pwa` · `wikipedia` · `unesco-world-heritage` ·
`wikimedia-commons` · `kiro` (specs, steering, hooks, custom agent)

---

## Testing instructions for judges (paste into the testing field)

**Run locally** (Node 20 or newer):
```bash
npm install
npm run dev          # open http://localhost:5173
npm run test:run     # 136 tests
npm run data:verify  # checks every cited source and image license online
npm run lint         # zero warnings
npm run build && npm run preview   # production PWA build
```

**Suggested path (about 2 minutes):**
1. Click **Insert disc**.
2. Drag the **globe** to turn it, hover a marker for its name, or hover a name in the
   list below and watch the globe turn to face it. Use **Flat map** to switch views.
3. Open a place (for example Japan). Check that each fact has a citation link.
4. Use **Follow a trail** to hop to a related place.
5. Open **Expedition log** to see your visits and add a note.
6. Optional: after `npm run build && npm run preview`, load the page once, go offline,
   and reload. It still works.

**Where Kiro was used:** open the `.kiro/` folder: `specs/encarta-reborn/`
(requirements, design, tasks), `steering/` (three files), `hooks/` (three hooks), and
`agents/source-curator.md`. `KIRO.md` maps each task to the Kiro feature behind it.

---

## Pre-submit checklist (for you, not for pasting)

- [ ] **Add an OSI-approved license** (for example MIT or Apache-2.0) as a `LICENSE`
      file at the repo root. There is none yet, and it is a requirement.
- [ ] **Make the repo public** and confirm `.kiro/` is committed. It is not in
      `.gitignore`, but check it shows up on GitHub.
- [ ] **Record the video** (under 3 minutes) from `Video Script & Storyboard`, and do
      the live **Wi-Fi off, reload** test yourself first. The build precaches
      everything, but I have not tested offline mode in a browser.
- [ ] **Deploy a live demo** (any static host works) so judges can try it without
      installing anything.
- [ ] **Decide about `SCORECARD.md`.** It is an internal self-rating. Move it to
      `docs/`, gitignore it, or delete it before the repo goes public.
- [ ] **Credit the data.** The summaries are paraphrased from Wikipedia (CC BY-SA), so
      keep the attribution visible and say in the README that the data in
      `public/data/snapshot.json` is separate from the code license.
- [ ] **Trim the README claim** about sources. It lists the full approved list
      (including Wikidata and OpenStreetMap), but the snapshot actually uses Wikipedia,
      UNESCO, Wikimedia Commons (incl. NASA public domain), and Natural Earth.
- [ ] **Try the globe on a real GPU and a phone.** I verified it in desktop Chrome
      with software WebGL only.
- [ ] **Re-check the deadline and exact rules on the official 2026 Devpost page.** I
      could not read it directly. A search result showed submissions closing
      **December 4, 2:00 PM Pacific**, so confirm that.
