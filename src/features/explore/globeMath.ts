/**
 * Pure math for the 3D globe. No three.js import on purpose: these functions are
 * trivially unit-testable in jsdom (which has no WebGL) and keep the heavy
 * three.js chunk out of anything that only needs coordinates.
 *
 * Coordinate convention matches three.js SphereGeometry with an equirectangular
 * texture whose left edge is longitude -180: longitude 0 faces +X, the north pole
 * is +Y, and longitude +90 faces -Z.
 */
export type Vec3 = { x: number; y: number; z: number };

const DEG = Math.PI / 180;

/** How long the globe takes to turn to a chosen place (ms). */
export const FLIGHT_MS = 900;

/** Convert latitude/longitude (degrees) to a point on a sphere of `radius`. */
export function latLonToVec3(lat: number, lon: number, radius = 1): Vec3 {
  const latR = lat * DEG;
  const lonR = lon * DEG;
  return {
    x: radius * Math.cos(latR) * Math.cos(lonR),
    y: radius * Math.sin(latR),
    z: -radius * Math.cos(latR) * Math.sin(lonR),
  };
}

export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Spherical interpolation between two unit directions, t in [0, 1]. */
function slerpUnit(a: Vec3, b: Vec3, t: number): Vec3 {
  const d = Math.min(1, Math.max(-1, dot(a, b)));
  const omega = Math.acos(d);
  const sin = Math.sin(omega);
  if (sin < 1e-6) {
    // Same direction: nothing to interpolate.
    return { ...b };
  }
  const wa = Math.sin((1 - t) * omega) / sin;
  const wb = Math.sin(t * omega) / sin;
  return normalize({
    x: a.x * wa + b.x * wb,
    y: a.y * wa + b.y * wb,
    z: a.z * wa + b.z * wb,
  });
}

/**
 * Smoothly rotate from direction `from` to direction `to` along the great
 * circle. Handles the exactly-opposite case (where the great circle is
 * ambiguous) by routing through a perpendicular direction.
 */
export function slerpDirection(from: Vec3, to: Vec3, t: number): Vec3 {
  const a = normalize(from);
  const b = normalize(to);
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped === 0) return a;
  if (clamped === 1) return b;

  const d = dot(a, b);
  if (d < -0.999999) {
    // Opposite: pick any axis perpendicular to `a` and go via it.
    let perp = cross(a, { x: 0, y: 1, z: 0 });
    if (length(perp) < 1e-6) perp = cross(a, { x: 1, y: 0, z: 0 });
    perp = normalize(perp);
    return clamped < 0.5
      ? slerpUnit(a, perp, clamped * 2)
      : slerpUnit(perp, b, (clamped - 0.5) * 2);
  }
  return slerpUnit(a, b, clamped);
}

/** Ease in/out (quadratic) for gentle camera moves. */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}
