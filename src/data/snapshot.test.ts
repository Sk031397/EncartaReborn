/**
 * Data-integrity test for the real bundled snapshot (Req 6.5).
 *
 * This is the runtime embodiment of manifesto law 5 ("every factual claim must
 * be sourced"). It loads the actual public/data/snapshot.json and asserts:
 *  - it validates against SnapshotSchema;
 *  - every place is renderable (its summary carries a valid source);
 *  - every fact and every rendered media item carries a valid source;
 *  - every trail link toId resolves to an existing place in the snapshot.
 * It fails the build if any renderable record lacks a valid source.
 */
import { describe, it, expect } from 'vitest';
import rawSnapshot from '../../public/data/snapshot.json';
import { SnapshotSchema } from './schema';
import {
  hasValidSource,
  isRenderable,
  renderableFacts,
  renderableMedia,
} from './validators';

describe('bundled snapshot data integrity', () => {
  it('validates against SnapshotSchema', () => {
    const result = SnapshotSchema.safeParse(rawSnapshot);
    if (!result.success) {
      throw new Error(
        `snapshot.json failed SnapshotSchema:\n${JSON.stringify(
          result.error.issues,
          null,
          2,
        )}`,
      );
    }
    expect(result.success).toBe(true);
  });

  // Parse once for the remaining assertions; schema validity is covered above.
  const snapshot = SnapshotSchema.parse(rawSnapshot);

  it('ships a non-empty set of places', () => {
    expect(snapshot.places.length).toBeGreaterThan(0);
  });

  it('every place is renderable (summary has a valid source)', () => {
    for (const place of snapshot.places) {
      expect(
        isRenderable(place),
        `place "${place.id}" has an unsourced summary`,
      ).toBe(true);
    }
  });

  it('every fact carries a valid source', () => {
    for (const place of snapshot.places) {
      for (const fact of place.facts) {
        expect(
          hasValidSource(fact),
          `fact "${fact.label}" on place "${place.id}" lacks a valid source`,
        ).toBe(true);
      }
      // No fact is silently dropped: all facts are renderable.
      expect(renderableFacts(place)).toHaveLength(place.facts.length);
    }
  });

  it('every media item carries a valid source', () => {
    for (const place of snapshot.places) {
      for (const media of place.media) {
        expect(
          hasValidSource(media),
          `media "${media.url}" on place "${place.id}" lacks a valid source`,
        ).toBe(true);
      }
      // No media is silently dropped: all media are renderable.
      expect(renderableMedia(place)).toHaveLength(place.media.length);
    }
  });

  it('every source uses an allowed license and a resolvable https url', () => {
    const allowed = new Set([
      'CC0',
      'CC-BY',
      'CC-BY-SA',
      'public-domain',
      'ODbL',
      'other',
    ]);
    const sourcedItems = snapshot.places.flatMap((place) => [
      place.summary,
      ...place.facts,
      ...place.media,
    ]);
    for (const item of sourcedItems) {
      for (const source of item.sources) {
        expect(allowed.has(source.license)).toBe(true);
        expect(source.url.startsWith('https://')).toBe(true);
        expect(source.name.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every trail link toId resolves to an existing place', () => {
    const ids = new Set(snapshot.places.map((place) => place.id));
    for (const place of snapshot.places) {
      for (const trail of place.trails) {
        expect(
          ids.has(trail.toId),
          `trail from "${place.id}" points to unknown place "${trail.toId}"`,
        ).toBe(true);
        // A place should not trail to itself.
        expect(trail.toId).not.toBe(place.id);
      }
    }
  });
});
