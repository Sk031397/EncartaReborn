import { describe, expect, it } from 'vitest';
import { validatePlaces } from './validate';

const src = { name: 'Wikipedia — X', url: 'https://en.wikipedia.org/wiki/X', license: 'CC-BY-SA' };
const good = (id: string, trails: string[], categories = ['europe']) => ({
  id,
  name: id,
  type: 'city',
  coordinates: { lat: 1, lon: 1 },
  summary: { text: 'A sourced summary.', sources: [src] },
  facts: [{ label: 'L', value: 'V', sources: [src] }],
  media: [],
  trails: trails.map((toId) => ({ toId, reason: 'geography' })),
  categories,
});

const known = new Set(['paris', 'london', 'rome']);

describe('validatePlaces', () => {
  it('accepts a well-formed, sourced batch', () => {
    const report = validatePlaces([good('a', ['paris', 'london', 'rome'])], known);
    expect(report).toEqual({ ok: true, checked: 1, problems: [] });
  });

  it('rejects an unsourced fact via the schema', () => {
    const bad = good('a', ['paris', 'london', 'rome']);
    bad.facts = [{ label: 'L', value: 'V', sources: [] }];
    const report = validatePlaces([bad], known);
    expect(report.ok).toBe(false);
    expect(report.problems.join(' ')).toMatch(/facts/);
  });

  it('reports unknown trail ids, too few trails, and missing region tags', () => {
    const report = validatePlaces([good('a', ['ghost', 'paris'], ['city'])], known);
    expect(report.ok).toBe(false);
    expect(report.problems).toEqual(
      expect.arrayContaining([
        'a: needs exactly one region tag in categories',
        'a: has 2 trails (needs 3 to 5)',
        'a: trail to unknown id "ghost"',
      ]),
    );
  });

  it('lets trails point at other places in the same batch', () => {
    const report = validatePlaces(
      [good('a', ['b', 'paris', 'rome']), good('b', ['a', 'london', 'rome'])],
      known,
    );
    expect(report.ok).toBe(true);
  });
});
