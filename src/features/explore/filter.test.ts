import { describe, expect, it } from 'vitest';
import type { Place } from '../../data/schema';
import { getRenderablePlaces } from '../../data/snapshotLoader';
import { NO_FILTER, filterPlaces, isFiltering } from './filter';

const src = { name: 'Wikipedia — X', url: 'https://en.wikipedia.org/wiki/X', license: 'CC-BY-SA' as const };
const place = (id: string, name: string, type: Place['type'], categories: string[]): Place => ({
  id,
  name,
  type,
  coordinates: { lat: 0, lon: 0 },
  summary: { text: 't', sources: [src] },
  facts: [],
  media: [],
  trails: [],
  categories,
});

const sample = [
  place('ha-long-bay', 'Hạ Long Bay', 'natural', ['asia', 'coastal', 'karst']),
  place('paris', 'Paris', 'city', ['europe', 'capital']),
  place('mount-fuji', 'Mount Fuji', 'natural', ['asia', 'volcano']),
];

describe('filterPlaces', () => {
  it('returns everything when nothing is set', () => {
    expect(filterPlaces(sample, NO_FILTER)).toHaveLength(3);
    expect(isFiltering(NO_FILTER)).toBe(false);
  });

  it('matches names ignoring case and accents', () => {
    const ids = filterPlaces(sample, { ...NO_FILTER, query: 'ha long' }).map((p) => p.id);
    expect(ids).toEqual(['ha-long-bay']);
  });

  it('also matches theme tags such as volcano', () => {
    const ids = filterPlaces(sample, { ...NO_FILTER, query: 'volcano' }).map((p) => p.id);
    expect(ids).toEqual(['mount-fuji']);
  });

  it('filters by region and by type, and combines them', () => {
    expect(filterPlaces(sample, { ...NO_FILTER, region: 'asia' })).toHaveLength(2);
    expect(filterPlaces(sample, { ...NO_FILTER, type: 'city' })).toHaveLength(1);
    expect(
      filterPlaces(sample, { query: '', type: 'natural', region: 'europe' }),
    ).toHaveLength(0);
    expect(isFiltering({ ...NO_FILTER, region: 'asia' })).toBe(true);
  });

  it('works on the real snapshot', () => {
    const all = getRenderablePlaces();
    expect(filterPlaces(all, { ...NO_FILTER, region: 'africa' }).length).toBeGreaterThan(5);
    expect(filterPlaces(all, { ...NO_FILTER, query: 'japan' }).some((p) => p.id === 'japan')).toBe(true);
  });
});
