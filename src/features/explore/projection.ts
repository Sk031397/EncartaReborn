/**
 * Equirectangular projection helpers to place markers on a simple world map.
 * Pure functions so they are trivially testable.
 */
export type LatLon = { lat: number; lon: number };

/** Project lon/lat into x/y within a [0..width] x [0..height] box. */
export function project(
  { lat, lon }: LatLon,
  width: number,
  height: number,
): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

/** Choose a random index in [0, length). Neutral — no engagement weighting. */
export function pickRandomIndex(length: number, rng: () => number = Math.random): number {
  if (length <= 0) return -1;
  return Math.floor(rng() * length);
}
