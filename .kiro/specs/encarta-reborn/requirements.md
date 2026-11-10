# Requirements — Encarta Reborn

## Introduction

Encarta Reborn is a calm, offline-first, algorithm-free digital encyclopedia for
exploring real places on Earth. It is a Kiroween 2026 **Resurrection track** entry:
it resurrects the dead CD-ROM encyclopedia (Encarta, 1993–2009) — the last great
model of bounded, browsable, serendipitous learning — and reimagines it for 2026
as the deliberate opposite of the doomscrolling attention economy.

The product lets a person wander a map of the world, read neutral, fully-sourced
articles about places, follow curiosity-driven "trails" to related places, and
keep a personal "expedition log" of where they have been — all without a feed,
without recommendations tuned for engagement, without accounts or tracking, and
without an internet connection.

Every requirement below is written to defend the anti-feed manifesto in
`.kiro/steering/product.md`. Where a convenience feature would violate a manifesto
law, the manifesto wins.

## Glossary
- **Place** — a real geographic entity (country, city, landmark, natural feature,
  heritage site) that has a sourced article.
- **Source** — a citation `{ name, url, license }` to an approved open dataset.
- **Trail** — a curiosity link from one place to another, derived from the
  knowledge graph (shared category, geography, or topic), never from engagement.
- **Snapshot** — the bundled, licensed, static dataset shipped with the app so it
  works offline.
- **Expedition log** — the on-device record of places the user visited and notes.

---

## Requirement 1 — Offline, no-account entry (Resurrection of the CD-ROM)

**User story:** As a curious person with no internet and no account, I want to open
the encyclopedia and start exploring immediately, so that learning never depends on
connectivity or sign-up.

### Acceptance Criteria
1. WHEN the app is opened with no network connection THEN the system SHALL load and
   be fully usable from the bundled snapshot.
2. WHEN the app is opened for the first time THEN the system SHALL NOT require an
   account, login, or any personal information.
3. WHEN the app loads THEN the system SHALL present a nostalgic "insert disc" boot
   screen that masks snapshot loading and transitions into the Explore view.
4. WHEN the app is installed as a PWA THEN the system SHALL continue to function
   offline on subsequent launches.
5. WHERE any user data exists (expedition log, notes) THE system SHALL store it only
   on-device and SHALL NOT transmit it to any server.

## Requirement 2 — Explore by wandering (bounded, non-feed discovery)

**User story:** As an explorer, I want to browse a map/globe and pick places by
curiosity, so that I discover the world on my own terms instead of being fed content.

### Acceptance Criteria
1. WHEN the Explore view is shown THEN the system SHALL present a map or globe with
   selectable places drawn from the snapshot.
2. WHEN the user selects a place THEN the system SHALL open that place's Article view.
3. WHEN the user browses THEN the system SHALL NOT present an infinite scroll, an
   autoplaying feed, or a "for you" stream.
4. WHEN the user requests a random place ("spin") THEN the system SHALL select a
   place using a neutral random choice, NOT an engagement-optimized recommendation.
5. WHERE motion is used THE system SHALL respect `prefers-reduced-motion`.
6. WHERE the browser supports WebGL THE system SHALL present the places on an
   interactive 3D globe the reader can turn and zoom, and the globe SHALL NOT
   move or animate unless the reader acts (calm by default).
7. WHEN WebGL is unavailable, or the reader chooses the flat map, THEN the system
   SHALL present the same places on a flat map with the same keyboard access.
8. WHERE the 3D globe is shown THE system SHALL also provide button controls and
   the full list of places, so it is operable without a pointer, and SHALL draw
   it from bundled data only, with no network request.

## Requirement 3 — Sourced article view (no unsourced opinions)

**User story:** As a learner, I want every fact about a place to be neutral and
cite its source, so that I form my own opinion from evidence, not from a narrative.

### Acceptance Criteria
1. WHEN an Article view is shown THEN the system SHALL display a neutral summary,
   key facts, and at least one public-domain/CC image where available.
2. WHEN any fact, summary, or media item is displayed THEN the system SHALL display a
   visible citation with source name and license, linking to the source URL.
3. IF a record's summary, a fact, or a media item lacks at least one valid Source
   THEN the system SHALL NOT render that element.
4. WHEN the Article view is shown THEN the system SHALL NOT display engagement metrics,
   likes, view counts, trending indicators, or a comments section.
5. WHEN images are displayed THEN the system SHALL provide descriptive alt text.

## Requirement 4 — Curiosity trails (graph-derived, not algorithmic)

**User story:** As a wanderer, I want a few meaningful links to related places, so
that I can follow my curiosity without being funneled by an engagement algorithm.

### Acceptance Criteria
1. WHEN an Article view is shown THEN the system SHALL present between 3 and 5 trail
   links to related places.
2. WHEN trail links are generated THEN the system SHALL derive them from the knowledge
   graph (shared category, geography, or topic) and SHALL NOT use engagement signals,
   personalization, or time-on-app optimization.
3. WHEN the user follows a trail link THEN the system SHALL open that place's Article
   view and the journey SHALL continue in a bounded, back-navigable way.
4. WHERE no qualifying related places exist THE system SHALL present fewer links
   rather than padding with irrelevant or engagement-driven suggestions.

## Requirement 5 — Expedition log (your discovery, on-device)

**User story:** As an explorer, I want to keep a private record of the places I
visited and my own notes, so that my journey is mine and not an algorithm's history.

### Acceptance Criteria
1. WHEN the user views a place THEN the system SHALL record that visit in the
   on-device expedition log.
2. WHEN the user writes a note on a place THEN the system SHALL persist that note
   on-device across sessions.
3. WHEN the user opens the Expedition Log THEN the system SHALL list visited places
   and their notes in a bounded, non-feed layout.
4. WHEN the user clears the log THEN the system SHALL remove all on-device entries.
5. WHERE the log is stored THE system SHALL NOT transmit it off-device.

## Requirement 6 — Data pipeline from approved open datasets

**User story:** As the maintainer, I want a build-time pipeline that assembles the
snapshot only from approved open datasets with licenses recorded, so that the app's
content is trustworthy and license-clean.

### Acceptance Criteria
1. WHEN the pipeline runs THEN the system SHALL fetch content only from approved
   sources (Wikipedia/Wikidata, OpenStreetMap/Natural Earth, NASA/public-domain,
   UNESCO, public-domain/CC media).
2. WHEN the pipeline writes a record THEN the system SHALL attach a Source
   (name, url, license) to the summary, each fact, and each media item.
3. IF a candidate datum lacks a citable, license-clean source THEN the pipeline
   SHALL omit that datum from the snapshot.
4. WHEN the pipeline completes THEN the system SHALL produce a static snapshot file
   under `public/data/` that validates against `src/data/schema.ts`.
5. WHEN the snapshot is validated THEN a data-integrity check SHALL fail the build
   if any rendered-eligible record has zero valid sources.

## Requirement 7 — Calm, accessible, coherent experience (Design)

**User story:** As any user, I want a polished, calm, accessible experience, so that
exploring feels restful and is usable by everyone.

### Acceptance Criteria
1. WHEN the UI is rendered THEN the system SHALL meet WCAG 2.1 AA (keyboard
   navigation, visible focus, semantic landmarks, text contrast >= 4.5:1).
2. WHERE sound exists THE system SHALL keep it off by default and opt-in.
3. WHEN any animation plays THEN the system SHALL respect `prefers-reduced-motion`.
4. WHEN the user moves through boot → explore → article → trails → log THEN the
   system SHALL present one coherent retro-reimagined visual identity throughout.
5. WHEN content loads THEN the system SHALL avoid urgency cues, autoplay, and
   attention-grabbing motion.

## Requirement 8 — Kiro-native build story (Technological Implementation)

**User story:** As a hackathon participant, I want the build to visibly use a variety
of Kiro features, so that the project demonstrates a thoughtful AI-development
strategy for judging.

### Acceptance Criteria
1. WHEN the project is built THEN the work SHALL be driven by this spec
   (requirements → design → tasks).
2. WHEN content or code is generated THEN steering files SHALL constrain it to the
   product principles, tech standards, and structure laws.
3. WHEN a data file is saved THEN the Source Citation Guard hook SHALL verify every
   claim is sourced.
4. WHEN place content is added or audited THEN the `source-curator` custom agent
   SHALL be the mechanism that produces license-clean, sourced records.
5. WHEN a spec task completes THEN tests SHALL run (via the post-task hook) and the
   Kiro feature that drove the task SHALL be noted for the submission write-up.
