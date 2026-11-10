import { describe, it, expect } from 'vitest';
import { project, pickRandomIndex } from './projection';

describe('project', () => {
  it('maps (0,0) to the center of the map', () => {
    const { x, y } = project({ lat: 0, lon: 0 }, 720, 360);
    expect(x).toBe(360);
    expect(y).toBe(180);
  });

  it('maps the north-west corner to the top-left', () => {
    const { x, y } = project({ lat: 90, lon: -180 }, 720, 360);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it('maps the south-east corner to the bottom-right', () => {
    const { x, y } = project({ lat: -90, lon: 180 }, 720, 360);
    expect(x).toBe(720);
    expect(y).toBe(360);
  });
});

describe('pickRandomIndex', () => {
  it('returns a valid in-range index', () => {
    const i = pickRandomIndex(5, () => 0.5);
    expect(i).toBe(2);
  });

  it('never returns the length itself at the upper bound', () => {
    const i = pickRandomIndex(5, () => 0.999999);
    expect(i).toBe(4);
  });

  it('returns -1 for an empty set', () => {
    expect(pickRandomIndex(0)).toBe(-1);
  });
});
