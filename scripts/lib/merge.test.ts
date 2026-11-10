import { describe, expect, it } from 'vitest';
import type { Media, Place, Source } from '../../src/data/schema';
import { mergeBatches } from './merge';

const source: Source = {
  name: 'Wikipedia — X',
  url: 'https://en.wikipedia.org/wiki/X',
  license: 'CC-BY-SA',
};

function place(id: string, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    type: 'city',
    coordinates: { lat: 0, lon: 0 },
    summary: { text: 'text', sources: [source] },
    facts: [],
    media: [],
    trails: [],
    categories: ['europe'],
    ...overrides,
  };
}

function image(filePage: string): Media {
  return {
    kind: 'image',
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${filePage}`,
    alt: 'alt',
    attribution: 'someone, CC BY-SA 4.0, via Wikimedia Commons',
    sources: [
      {
        name: `Wikimedia Commons — ${filePage}`,
        url: `https://commons.wikimedia.org/wiki/File:${filePage}`,
        license: 'CC-BY-SA',
      },
    ],
  };
}

describe('mergeBatches', () => {
  it('adds new places and keeps existing ones untouched', () => {
    const existing = place('a', { name: 'Corrected name' });
    const { places, report } = mergeBatches(
      [existing],
      [[place('a', { name: 'Stale batch name' }), place('b')]],
      [],
    );
    expect(places.map((p) => p.id)).toEqual(['a', 'b']);
    expect(places[0]?.name).toBe('Corrected name');
    expect(report.added).toEqual(['b']);
    expect(report.skippedExisting).toEqual(['a']);
  });

  it('adds patched media to a place that has none', () => {
    const { places, report } = mergeBatches(
      [place('a')],
      [],
      [{ placeId: 'a', media: [image('A.jpg')] }],
    );
    expect(places[0]?.media).toHaveLength(1);
    expect(report.patched).toEqual(['a']);
  });

  it('does not duplicate media when a patch is applied twice', () => {
    const patch = { placeId: 'a', media: [image('A.jpg')] };
    const first = mergeBatches([place('a')], [], [patch]);
    const second = mergeBatches(first.places, [], [patch]);
    expect(second.places[0]?.media).toHaveLength(1);
    expect(second.report.patched).toEqual([]);
  });

  it('still recognises media whose url was rewritten to a local path', () => {
    const local: Media = { ...image('A.jpg'), url: '/media/a-0.jpg' };
    const { places } = mergeBatches(
      [place('a', { media: [local] })],
      [],
      [{ placeId: 'a', media: [image('A.jpg')] }],
    );
    expect(places[0]?.media).toHaveLength(1);
    expect(places[0]?.media[0]?.url).toBe('/media/a-0.jpg');
  });

  it('reports patches for places that do not exist', () => {
    const { report } = mergeBatches(
      [place('a')],
      [],
      [{ placeId: 'ghost', media: [image('G.jpg')] }],
    );
    expect(report.patchUnknownPlace).toEqual(['ghost']);
  });
});
