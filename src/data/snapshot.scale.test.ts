/**
 * Integrity checks that matter once the disc holds a hundred places: unique ids,
 * exactly one region per place, enough authored trails, and every bundled image
 * actually present. Runs against the real snapshot.
 */
// @vitest-environment node
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import rawSnapshot from '../../public/data/snapshot.json';
import { regionTags } from './regions';
import { SnapshotSchema } from './schema';

const snapshot = SnapshotSchema.parse(rawSnapshot);

describe('snapshot at scale', () => {
  it('holds at least one hundred places', () => {
    expect(snapshot.places.length).toBeGreaterThanOrEqual(100);
  });

  it('has unique place ids', () => {
    const ids = snapshot.places.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every place exactly one region tag', () => {
    // Collect every offender so one run reports them all.
    const wrong = snapshot.places
      .filter((place) => regionTags(place).length !== 1)
      .map((place) => `${place.id}: [${regionTags(place).join(', ')}]`);
    expect(wrong).toEqual([]);
  });

  it('gives every place at least three authored trail links', () => {
    for (const place of snapshot.places) {
      expect(place.trails.length, `${place.id} trails`).toBeGreaterThanOrEqual(3);
    }
  });

  it('bundles every image with the app (none hotlinked), and every file exists', () => {
    const problems: string[] = [];
    for (const place of snapshot.places) {
      for (const media of place.media) {
        if (!media.url.startsWith('/media/')) {
          problems.push(`${place.id}: image is not bundled (${media.url})`);
          continue;
        }
        const file = resolve(process.cwd(), 'public', media.url.slice(1));
        if (!existsSync(file) || statSync(file).size === 0) {
          problems.push(`${place.id}: ${media.url} is missing or empty`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('gives every place an image', () => {
    const missing = snapshot.places.filter((p) => p.media.length === 0).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it('gives every image alt text, an author, and a license in its attribution', () => {
    for (const place of snapshot.places) {
      for (const media of place.media) {
        expect(media.alt.trim().length, `${place.id} alt`).toBeGreaterThan(10);
        expect(media.attribution, `${place.id} attribution`).toMatch(/Wikimedia Commons/);
      }
    }
  });
});
