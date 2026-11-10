import { describe, it, expect } from 'vitest';
import type { Place, Source } from './schema';
import {
  hasValidSource,
  isRenderable,
  isValidSource,
  renderableFacts,
  renderableMedia,
} from './validators';

const goodSource: Source = {
  name: 'Wikipedia',
  url: 'https://en.wikipedia.org/wiki/Example',
  license: 'CC-BY-SA',
};

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'example',
    name: 'Example',
    type: 'city',
    coordinates: { lat: 0, lon: 0 },
    summary: { text: 'A sourced summary.', sources: [goodSource] },
    facts: [],
    media: [],
    trails: [],
    categories: [],
    ...overrides,
  };
}

describe('isValidSource', () => {
  it('accepts a source with name, url, and license', () => {
    expect(isValidSource(goodSource)).toBe(true);
  });

  it('rejects a source missing the url', () => {
    expect(isValidSource({ ...goodSource, url: '  ' })).toBe(false);
  });

  it('rejects a source missing the name', () => {
    expect(isValidSource({ ...goodSource, name: '' })).toBe(false);
  });
});

describe('hasValidSource', () => {
  it('is true when at least one source is valid', () => {
    expect(hasValidSource({ sources: [goodSource] })).toBe(true);
  });

  it('is false when there are no sources', () => {
    expect(hasValidSource({ sources: [] })).toBe(false);
  });
});

describe('isRenderable', () => {
  it('renders a place whose summary is sourced', () => {
    expect(isRenderable(makePlace())).toBe(true);
  });

  it('gates out a place whose summary has no valid source', () => {
    const place = makePlace({ summary: { text: 'Unsourced.', sources: [] } });
    expect(isRenderable(place)).toBe(false);
  });
});

describe('renderableFacts / renderableMedia', () => {
  it('keeps only sourced facts', () => {
    const place = makePlace({
      facts: [
        { label: 'Population', value: '1M', sources: [goodSource] },
        { label: 'Rumor', value: 'Unsourced', sources: [] },
      ],
    });
    const facts = renderableFacts(place);
    expect(facts).toHaveLength(1);
    expect(facts[0]?.label).toBe('Population');
  });

  it('keeps only sourced media', () => {
    const place = makePlace({
      media: [
        {
          kind: 'image',
          url: 'https://example.org/a.jpg',
          alt: 'A sourced image',
          attribution: 'Photographer, CC-BY',
          sources: [goodSource],
        },
        {
          kind: 'image',
          url: 'https://example.org/b.jpg',
          alt: 'An unsourced image',
          attribution: 'Unknown',
          sources: [],
        },
      ],
    });
    expect(renderableMedia(place)).toHaveLength(1);
  });
});
