import { describe, it, expect } from 'vitest';
import {
  easeInOut,
  latLonToVec3,
  length,
  normalize,
  slerpDirection,
} from './globeMath';

function expectClose(
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number },
) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.z).toBeCloseTo(expected.z, 6);
}

describe('latLonToVec3', () => {
  it('puts longitude 0 on the equator facing +X', () => {
    expectClose(latLonToVec3(0, 0), { x: 1, y: 0, z: 0 });
  });

  it('puts the north pole on +Y', () => {
    expectClose(latLonToVec3(90, 0), { x: 0, y: 1, z: 0 });
  });

  it('puts longitude +90 facing -Z (matches the texture orientation)', () => {
    expectClose(latLonToVec3(0, 90), { x: 0, y: 0, z: -1 });
  });

  it('puts longitude -180 / +180 on the far side (-X)', () => {
    expectClose(latLonToVec3(0, 180), { x: -1, y: 0, z: 0 });
  });

  it('keeps every point on the sphere of the requested radius', () => {
    for (const [lat, lon] of [
      [36.2, 138.25],
      [-13.16, -72.55],
      [64.9, -18.5],
      [-33.86, 151.2],
    ] as const) {
      expect(length(latLonToVec3(lat, lon, 1.5))).toBeCloseTo(1.5, 9);
    }
  });
});

describe('normalize', () => {
  it('returns a unit vector', () => {
    expect(length(normalize({ x: 3, y: 4, z: 12 }))).toBeCloseTo(1, 9);
  });

  it('does not produce NaN for the zero vector', () => {
    const v = normalize({ x: 0, y: 0, z: 0 });
    expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
  });
});

describe('slerpDirection', () => {
  const a = { x: 1, y: 0, z: 0 };
  const b = { x: 0, y: 1, z: 0 };

  it('returns the start at t=0 and the end at t=1', () => {
    expectClose(slerpDirection(a, b, 0), a);
    expectClose(slerpDirection(a, b, 1), b);
  });

  it('follows the great circle at the midpoint', () => {
    const mid = slerpDirection(a, b, 0.5);
    expectClose(mid, normalize({ x: 1, y: 1, z: 0 }));
    expect(length(mid)).toBeCloseTo(1, 9);
  });

  it('stays on the unit sphere for every step', () => {
    for (let i = 0; i <= 10; i++) {
      expect(length(slerpDirection(a, b, i / 10))).toBeCloseTo(1, 9);
    }
  });

  it('does not blow up when the two directions are identical', () => {
    expectClose(slerpDirection(a, a, 0.5), a);
  });

  it('routes around the globe when the target is exactly opposite', () => {
    const opposite = { x: -1, y: 0, z: 0 };
    for (let i = 0; i <= 10; i++) {
      const v = slerpDirection(a, opposite, i / 10);
      expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
      expect(length(v)).toBeCloseTo(1, 9);
    }
    expectClose(slerpDirection(a, opposite, 1), opposite);
  });
});

describe('easeInOut', () => {
  it('starts at 0, ends at 1, and is 0.5 in the middle', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
  });

  it('clamps out-of-range input', () => {
    expect(easeInOut(-3)).toBe(0);
    expect(easeInOut(7)).toBe(1);
  });
});
