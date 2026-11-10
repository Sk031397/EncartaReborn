/**
 * Generates the PWA icons as PNGs from an SVG of the Encarta Reborn "disc"
 * motif, with no external image dependencies. Uses a tiny hand-rolled PNG
 * encoder (zlib from Node core) so the build needs no extra packages.
 *
 * Output: public/icons/icon-192.png, icon-512.png, maskable-512.png
 * Run: node scripts/makeIcons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');

// --- Minimal PNG encoder (RGBA, no filtering) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Draw the icon procedurally ---
function hex(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
const BG = hex('#0e1626');
const RING = [
  hex('#9fb4d8'),
  hex('#7fe3d2'),
  hex('#ffcf7a'),
  hex('#d79ad0'),
];
const HUB = hex('#17233b');

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function ringColor(angle) {
  const seg = (angle / (Math.PI * 2)) * RING.length;
  const i = Math.floor(seg) % RING.length;
  const j = (i + 1) % RING.length;
  return lerp(RING[i], RING[j], seg - Math.floor(seg));
}

function drawIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  // On maskable icons keep art within the safe zone (~80%).
  const pad = maskable ? size * 0.12 : size * 0.06;
  const rOuter = size / 2 - pad;
  const rInner = rOuter * 0.4;
  const rHub = rOuter * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let col = BG;
      let a = 255;
      if (d <= rOuter && d >= rInner) {
        let ang = Math.atan2(dy, dx);
        if (ang < 0) ang += Math.PI * 2;
        col = ringColor(ang);
      } else if (d < rInner && d > rHub) {
        col = BG; // dark gap
      } else if (d <= rHub) {
        col = HUB; // center hub
      } else {
        // outside disc: transparent on non-maskable, bg on maskable
        a = maskable ? 255 : 0;
        col = BG;
      }
      // soft antialias at the outer edge
      if (!maskable && d > rOuter && d < rOuter + 1.5) {
        a = Math.round(255 * (1 - (d - rOuter) / 1.5));
      }
      const o = (y * size + x) * 4;
      rgba[o] = col[0];
      rgba[o + 1] = col[1];
      rgba[o + 2] = col[2];
      rgba[o + 3] = a;
    }
  }
  return encodePng(size, size, rgba);
}

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'icon-192.png'), drawIcon(192, false));
await writeFile(resolve(outDir, 'icon-512.png'), drawIcon(512, false));
await writeFile(resolve(outDir, 'maskable-512.png'), drawIcon(512, true));
// eslint-disable-next-line no-console
console.log('Wrote PWA icons to public/icons/.');
