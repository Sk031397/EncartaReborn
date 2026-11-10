/**
 * Tests for the build-time snapshot assembler (Req 6).
 *
 * These assert the sourcing + integrity guarantees in code, mirroring the
 * anti-feed manifesto law "every factual claim must be sourced":
 *  - assembleSnapshot drops a place whose summary has no valid source;
 *  - sanitizePlaces strips unsourced facts and media;
 *  - sanitizePlaces drops trail links that self-reference or point to an
 *    unknown place;
 *  - assembleSnapshot on the real bundled snapshot returns the same place
 *    count (every shipped record is already valid).
 */
import { describe, it, expect } from 'vitest';
import { sanitizePlaces, assembleSnapshot } from './buildSnapshot';
import rawSnapshot from '../public/data/snapshot.json';
import { SnapshotSchema, type Place, type Source } from '../src/data/schema';

const validSource: Source = {
  name: 'Wikipedia — Example',
  url: 'https://en.wikipedia.org/wiki/Example',
  license: 'CC-BY-SA',
};

/** A fully valid, minimal place used as a base for the fixtures below. */
function basePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'alpha',
    name: 'Alpha',
    type: 'landmark',
    coordinates: { lat: 0, lon: 0 },
    summary: { text: 'A sourced summary.', sources: [validSource] },
    facts: [],
    media: [],
    trails: [],
    categories: ['landmark'],
    ...overrides,
  };
}

describe('assembleSnapshot', () => {
  it('drops a place whose summary has no source', () => {
    const sourced = basePlace({ id: 'sourced' });
    const unsourced = basePlace({
      id: 'unsourced',
      // An empty sources array means the summary is not citable.
      summary: { text: 'No citation here.', sources: [] as Source[] },
    });

    const snapshot = assembleSnapshot([sourced, unsourced], '9.9.9');
    const ids = snapshot.places.map((p) => p.id);

    expect(ids).toContain('sourced');
    expect(ids).not.toContain('unsourced');
    expect(snapshot.places).toHaveLength(1);
  });

  it('on the real snapshot places returns the same count (all already valid)', () => {
    const parsed = SnapshotSchema.parse(rawSnapshot);
    const snapshot = assembleSnapshot(parsed.places, parsed.version);
    expect(snapshot.places).toHaveLength(parsed.places.length);
  });
});

describe('sanitizePlaces', () => {
  it('removes unsourced facts and media but keeps sourced ones', () => {
    const place = basePlace({
      facts: [
        { label: 'Sourced', value: 'Kept.', sources: [validSource] },
        // Unsourced fact: must be filtered out.
        { label: 'Unsourced', value: 'Dropped.', sources: [] as Source[] },
      ],
      media: [
        {
          kind: 'image',
          url: 'https://example.org/sourced.jpg',
          alt: 'A sourced image.',
          attribution: 'Someone, CC-BY',
          sources: [validSource],
        },
        {
          // Unsourced media: must be filtered out.
          kind: 'image',
          url: 'https://example.org/unsourced.jpg',
          alt: 'An unsourced image.',
          attribution: 'Unknown',
          sources: [] as Source[],
        },
      ],
    });

    const result = sanitizePlaces([place]);
    const sanitized = result[0];

    expect(sanitized).toBeDefined();
    expect(sanitized?.facts).toHaveLength(1);
    expect(sanitized?.facts[0]?.label).toBe('Sourced');
    expect(sanitized?.media).toHaveLength(1);
    expect(sanitized?.media[0]?.url).toBe('https://example.org/sourced.jpg');
  });

  it('removes trail links that self-reference or point to an unknown place', () => {
    const alpha = basePlace({
      id: 'alpha',
      trails: [
        { toId: 'beta', reason: 'category' }, // resolves -> kept
        { toId: 'alpha', reason: 'geography' }, // self-link -> dropped
        { toId: 'ghost', reason: 'topic' }, // unknown id -> dropped
      ],
    });
    const beta = basePlace({ id: 'beta', name: 'Beta' });

    const result = sanitizePlaces([alpha, beta]);
    const sanitizedAlpha = result.find((p) => p.id === 'alpha');

    expect(sanitizedAlpha).toBeDefined();
    expect(sanitizedAlpha?.trails).toHaveLength(1);
    expect(sanitizedAlpha?.trails[0]?.toId).toBe('beta');
  });
});
