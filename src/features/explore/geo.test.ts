import { describe, it, expect } from 'vitest';
import { geoContains } from 'd3-geo';
import { buildLandSvgPath, getLand } from './geo';

describe('Natural Earth land data', () => {
  it('decodes to GeoJSON', () => {
    const land = getLand() as { type: string };
    expect(['Feature', 'FeatureCollection']).toContain(land.type);
  });

  it('puts known land points on land (checks lon/lat order is right)', () => {
    const land = getLand();
    expect(geoContains(land, [20, 5])).toBe(true); // central Africa
    expect(geoContains(land, [2, 48])).toBe(true); // France
    expect(geoContains(land, [-100, 40])).toBe(true); // central United States
    expect(geoContains(land, [133, -25])).toBe(true); // central Australia
  });

  it('includes islands that straddle the 180th meridian (Fiji)', () => {
    expect(geoContains(getLand(), [178.0, -17.8])).toBe(true);
  });

  it('puts known ocean points in the water', () => {
    const land = getLand();
    expect(geoContains(land, [-150, 0])).toBe(false); // equatorial Pacific
    expect(geoContains(land, [-40, 30])).toBe(false); // mid North Atlantic
    expect(geoContains(land, [70, -45])).toBe(false); // southern Indian Ocean
  });
});

describe('buildLandSvgPath', () => {
  const W = 720;
  const H = 360;
  const path = buildLandSvgPath(W, H);

  it('produces closed sub-paths', () => {
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('keeps every coordinate inside the map box', () => {
    const numbers = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    expect(numbers.length).toBeGreaterThan(100);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(-1);
      expect(n).toBeLessThanOrEqual(Math.max(W, H) + 1);
    }
  });

  it('has no line that wraps across the whole map (the antimeridian artifact)', () => {
    // Drawing raw coordinates joins the two halves of Fiji and Wrangel Island
    // with a line straight across the world at their latitude. A correct path
    // may only span the map along the very top or bottom edge (the poles).
    for (const subpath of path.split('M').filter(Boolean)) {
      const points = [...subpath.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(
        (m) => [Number(m[1]), Number(m[2])] as const,
      );
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1]!;
        const [x1, y1] = points[i]!;
        if (Math.abs(x1 - x0) > W / 2) {
          const onPoleEdge = (y0 < 1 && y1 < 1) || (y0 > H - 1 && y1 > H - 1);
          expect(
            onPoleEdge,
            `segment (${x0},${y0}) to (${x1},${y1}) wraps the map`,
          ).toBe(true);
        }
      }
    }
  });
});
