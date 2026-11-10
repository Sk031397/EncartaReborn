import { describe, it, expect } from 'vitest';
import type { Place } from '../data/schema';
import { buildTrails, TRAIL_BOUNDS } from './graph';

const src = { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/X', license: 'CC-BY-SA' as const };

function place(overrides: Partial<Place> & { id: string }): Place {
  return {
    name: overrides.id,
    type: 'city',
    coordinates: { lat: 0, lon: 0 },
    summary: { text: 'x', sources: [src] },
    facts: [],
    media: [],
    trails: [],
    categories: [],
    ...overrides,
  };
}

describe('buildTrails', () => {
  const all: Place[] = [
    place({ id: 'a', categories: ['europe', 'city'], coordinates: { lat: 48, lon: 2 } }),
    place({ id: 'b', categories: ['europe'], coordinates: { lat: 49, lon: 3 } }),
    place({ id: 'c', categories: ['asia'], coordinates: { lat: 35, lon: 139 } }),
    place({ id: 'd', categories: ['europe', 'city'], coordinates: { lat: 50, lon: 4 } }),
    place({ id: 'e', categories: ['europe'], coordinates: { lat: 47, lon: 1 } }),
    place({ id: 'f', categories: ['asia'], coordinates: { lat: 34, lon: 138 } }),
  ];

  it('returns between MIN and MAX trail links', () => {
    const from = all[0]!;
    const trails = buildTrails(from, all);
    expect(trails.length).toBeGreaterThanOrEqual(TRAIL_BOUNDS.MIN_TRAILS);
    expect(trails.length).toBeLessThanOrEqual(TRAIL_BOUNDS.MAX_TRAILS);
  });

  it('never links a place to itself', () => {
    const from = all[0]!;
    const trails = buildTrails(from, all);
    expect(trails.some((t) => t.toId === from.id)).toBe(false);
  });

  it('derives links only from graph reasons (category/geography/topic)', () => {
    const from = all[0]!;
    const trails = buildTrails(from, all);
    for (const t of trails) {
      expect(['category', 'geography', 'topic']).toContain(t.reason);
    }
  });

  it('prefers places that share categories', () => {
    const from = all[0]!; // europe + city
    const trails = buildTrails(from, all);
    // 'd' shares both europe + city, so it should be among the links.
    expect(trails.some((t) => t.toId === 'd')).toBe(true);
  });

  it('honors authored trail links first when present', () => {
    const from = place({
      id: 'z',
      categories: ['nowhere'],
      coordinates: { lat: -80, lon: 170 },
      trails: [{ toId: 'c', reason: 'topic' }],
    });
    const trails = buildTrails(from, [from, ...all]);
    expect(trails[0]?.toId).toBe('c');
  });

  it('does not pad with irrelevant links when nothing qualifies', () => {
    const lonely = place({
      id: 'lonely',
      type: 'landmark',
      categories: ['unique-x'],
      coordinates: { lat: -89, lon: 179 },
    });
    const isolated = place({
      id: 'isolated',
      type: 'natural',
      categories: ['unique-y'],
      coordinates: { lat: 0, lon: 0 },
    });
    const trails = buildTrails(lonely, [lonely, isolated]);
    // No shared category, different type, far away → no qualifying link.
    expect(trails.length).toBe(0);
  });
});
