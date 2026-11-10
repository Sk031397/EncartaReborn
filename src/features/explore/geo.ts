/**
 * Natural Earth coastlines, shared by the 3D globe texture and the flat-map
 * fallback.
 *
 * Source: Natural Earth 1:110m land (public domain), distributed through the
 * `world-atlas` package as TopoJSON. It is bundled with the app, so drawing the
 * globe needs no image download, no tile server, and no network — it works
 * offline like the rest of the disc (steering: structure.md law 3).
 *
 * The land is spherical geometry, and a few shapes (Fiji, Wrangel Island, and
 * Antarctica) straddle the 180° meridian. Drawing their raw coordinates on a flat
 * canvas joins the two halves with a line straight across the whole map, so all
 * drawing goes through d3-geo, which clips shapes at the antimeridian correctly.
 */
import { geoEquirectangular, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';

let cache: GeoPermissibleObjects | null = null;

/** The land as GeoJSON (decoded once and cached). */
export function getLand(): GeoPermissibleObjects {
  if (cache) return cache;
  const topology = landTopology as unknown as Topology;
  const land = topology.objects['land'];
  if (!land) {
    throw new Error('Natural Earth land data is missing its "land" object.');
  }
  cache = feature(topology, land) as unknown as GeoPermissibleObjects;
  return cache;
}

/**
 * Equirectangular projection filling a `width` x `height` box (height should be
 * width / 2): longitude -180..180 runs left to right, latitude 90..-90 top to
 * bottom. Matches how three.js maps the texture onto the sphere.
 */
function equirectangular(width: number, height: number) {
  return geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2])
    .precision(0.1);
}

export type EarthStyle = {
  ocean: string;
  land: string;
  coast: string;
  grid: string;
};

export const EARTH_STYLE: EarthStyle = {
  ocean: '#0a1730',
  land: '#27446f',
  coast: '#6f93c9',
  grid: 'rgba(127, 227, 210, 0.10)',
};

/** Paint the Earth onto a 2D canvas context covering `width` x `height`. */
export function drawEarth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: EarthStyle = EARTH_STYLE,
): void {
  ctx.fillStyle = style.ocean;
  ctx.fillRect(0, 0, width, height);

  // Graticule every 30 degrees.
  ctx.strokeStyle = style.grid;
  ctx.lineWidth = Math.max(1, width / 1800);
  ctx.beginPath();
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Land, clipped correctly at the antimeridian by d3-geo.
  ctx.fillStyle = style.land;
  ctx.strokeStyle = style.coast;
  ctx.lineWidth = Math.max(1, width / 1400);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  geoPath(equirectangular(width, height), ctx)(getLand());
  ctx.fill();
  ctx.stroke();
}

/** Build an offscreen canvas holding the Earth texture. */
export function buildEarthCanvas(width = 2048): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width / 2;
  const ctx = canvas.getContext('2d');
  if (ctx) drawEarth(ctx, canvas.width, canvas.height);
  return canvas;
}

/**
 * The same coastlines as one SVG path string in a `width` x `height` box. Used
 * by the flat-map fallback so it shows real coastlines too.
 */
export function buildLandSvgPath(width: number, height: number): string {
  return geoPath(equirectangular(width, height)).digits(1)(getLand()) ?? '';
}
