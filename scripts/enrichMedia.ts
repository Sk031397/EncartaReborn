/**
 * Media pipeline (build time only).
 *
 * 1. FIND: for places that have no image, look for a license-clean photograph on
 *    Wikimedia Commons (the Wikipedia lead image first, then a Commons search),
 *    checking the license in the Commons API. Nothing is guessed.
 * 2. DOWNLOAD: copy every Commons image into `public/media/` at a reasonable size
 *    and point the snapshot at the local file.
 *
 * Why bundle images: if articles hotlinked Commons, the app would not work
 * offline and every article view would contact another website, which breaks two
 * promises of the product (offline-first, and nothing phones home). The source
 * page, author, and license stay in each record's citation.
 *
 * Usage: `npm run data:media`. Safe to re-run: existing files are kept.
 */
import { existsSync, unlinkSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapshotSchema, type Media, type Place } from '../src/data/schema';
import { assembleSnapshot } from './buildSnapshot';
import { commonsInfoBatch, commonsSearch, politeFetch, sleep, type CommonsInfo } from './lib/net';
import { IMAGE_LICENSES, looksLikeNonPhoto, wikipediaTitle } from './lib/sources';

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(here, '../public/data/snapshot.json');
const MEDIA_DIR = resolve(here, '../public/media');
const REPLACEMENTS_PATH = resolve(here, 'data/media-replacements.json');
const FILEPATH_PREFIX = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const IMAGE_WIDTH = 900;
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function acceptable(info: CommonsInfo | undefined): info is CommonsInfo {
  if (!info || info.missing || !info.license) return false;
  if (!IMAGE_LICENSES.has(info.license)) return false;
  if (!(info.mime in EXT_BY_TYPE)) return false;
  if (info.width < 800) return false;
  const ratio = info.width / Math.max(1, info.height);
  if (ratio < 0.6 || ratio > 3.2) return false;
  return !looksLikeNonPhoto(info.title);
}

function commonsNameFromUpload(src: string): string | null {
  const match = /\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/i.exec(src);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

async function leadImageTitle(place: Place): Promise<string | null> {
  const wiki = place.summary.sources
    .map((s) => wikipediaTitle(s.url))
    .find((t): t is string => t !== null);
  if (!wiki) return null;
  await sleep(300);
  const res = await politeFetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${wiki}`,
    { headers: { accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { originalimage?: { source?: string } };
  const name = data.originalimage?.source
    ? commonsNameFromUpload(data.originalimage.source)
    : null;
  return name ? `File:${name.replace(/_/g, ' ')}` : null;
}

async function findImage(place: Place): Promise<CommonsInfo | null> {
  const lead = await leadImageTitle(place);
  if (lead) {
    await sleep(300);
    const info = (await commonsInfoBatch([lead])).get(lead);
    if (acceptable(info)) return info;
  }
  await sleep(300);
  const results = await commonsSearch(`${place.name} ${place.categories.includes('city') ? 'skyline' : ''}`.trim());
  return results.find(acceptable) ?? null;
}

function toMedia(place: Place, info: CommonsInfo): Media {
  const fileName = info.title.replace(/^File:/, '');
  const slug = encodeURIComponent(fileName.replace(/ /g, '_'));
  const described = info.description.replace(/^English:\s*/i, '').slice(0, 140).trim();
  const alt = described ? `${place.name}: ${described}` : `Photograph of ${place.name}`;
  const author = (info.artist || 'Unknown author').slice(0, 80);
  return {
    kind: 'image',
    url: `${FILEPATH_PREFIX}${slug}`,
    alt,
    attribution: `${author}, ${info.licenseName}, via Wikimedia Commons`,
    sources: [
      {
        name: `Wikimedia Commons — ${fileName}`,
        url: `https://commons.wikimedia.org/wiki/File:${slug}`,
        license: info.license ?? 'other',
      },
    ],
  };
}

function existingFile(placeId: string, index: number): string | null {
  for (const ext of Object.values(EXT_BY_TYPE)) {
    const name = `${placeId}-${index}.${ext}`;
    if (existsSync(resolve(MEDIA_DIR, name))) return name;
  }
  return null;
}

function removeLocal(placeId: string, index: number): void {
  for (const ext of Object.values(EXT_BY_TYPE)) {
    const file = resolve(MEDIA_DIR, `${placeId}-${index}.${ext}`);
    if (existsSync(file)) unlinkSync(file);
  }
}

const filePageUrl = (title: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(
    title.replace(/^File:/, '').replace(/ /g, '_'),
  )}`;

type Replacement = { placeId: string; file?: string; alt?: string };

/**
 * Apply hand-reviewed fixes from scripts/data/media-replacements.json: swap an
 * automatically found image that turned out to be wrong (the license is checked
 * again), and/or replace an unclear alt text. Idempotent.
 */
async function applyReplacements(places: Place[]): Promise<Place[]> {
  if (!existsSync(REPLACEMENTS_PATH)) return places;
  const list = JSON.parse(await readFile(REPLACEMENTS_PATH, 'utf8')) as Replacement[];
  const files = [...new Set(list.map((r) => r.file).filter((f): f is string => !!f))];
  const infos = files.length ? await commonsInfoBatch(files) : new Map<string, CommonsInfo>();
  return places.map((place) => {
    const fix = list.find((r) => r.placeId === place.id);
    if (!fix) return place;
    if (fix.file && place.media[0]?.sources[0]?.url !== filePageUrl(fix.file)) {
      const info = infos.get(fix.file);
      if (!info || info.missing || !info.license || !IMAGE_LICENSES.has(info.license)) {
        // eslint-disable-next-line no-console
        console.warn(`  ! replacement for ${place.id} rejected: ${fix.file} (${info?.licenseName ?? 'not found'})`);
        return place;
      }
      removeLocal(place.id, 0);
      const media = toMedia(place, info);
      // eslint-disable-next-line no-console
      console.log(`  ~ ${place.id}: replaced with ${info.title} (${info.licenseName})`);
      return { ...place, media: [{ ...media, alt: fix.alt ?? media.alt }, ...place.media.slice(1)] };
    }
    const first = place.media[0];
    if (fix.alt && first && first.alt !== fix.alt) {
      return { ...place, media: [{ ...first, alt: fix.alt }, ...place.media.slice(1)] };
    }
    return place;
  });
}

async function download(place: Place, media: Media, index: number): Promise<Media> {
  if (!media.url.startsWith(FILEPATH_PREFIX)) return media;
  const have = existingFile(place.id, index);
  if (have) return { ...media, url: `/media/${have}` };
  await sleep(400);
  const res = await politeFetch(`${media.url}?width=${IMAGE_WIDTH}`);
  const type = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
  const ext = EXT_BY_TYPE[type];
  if (!res.ok || !ext) {
    // eslint-disable-next-line no-console
    console.warn(`  ! could not download ${place.id} (${res.status} ${type}); keeping remote url`);
    return media;
  }
  const file = `${place.id}-${index}.${ext}`;
  await writeFile(resolve(MEDIA_DIR, file), Buffer.from(await res.arrayBuffer()));
  return { ...media, url: `/media/${file}` };
}

async function main(): Promise<void> {
  await mkdir(MEDIA_DIR, { recursive: true });
  const base = SnapshotSchema.parse(JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')));
  let places: Place[] = await applyReplacements(base.places);
  const found: string[] = [];
  const stillMissing: string[] = [];

  for (const place of places.filter((p) => p.media.length === 0)) {
    try {
      const info = await findImage(place);
      if (!info) {
        stillMissing.push(place.id);
        // eslint-disable-next-line no-console
        console.log(`  - no clean image found for ${place.id}`);
        continue;
      }
      const media = toMedia(place, info);
      places = places.map((p) => (p.id === place.id ? { ...p, media: [media] } : p));
      found.push(place.id);
      // eslint-disable-next-line no-console
      console.log(`  + ${place.id}: ${info.title} (${info.licenseName})`);
    } catch (err) {
      stillMissing.push(place.id);
      // eslint-disable-next-line no-console
      console.warn(`  ! ${place.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Save what was found before the (longer) download stage.
  await writeFile(
    SNAPSHOT_PATH,
    `${JSON.stringify(assembleSnapshot(places, base.version), null, 2)}\n`,
    'utf8',
  );

  const downloaded: Place[] = [];
  for (const place of places) {
    const media: Media[] = [];
    for (const [index, item] of place.media.entries()) {
      media.push(await download(place, item, index));
    }
    downloaded.push({ ...place, media });
  }
  const rebuilt = assembleSnapshot(downloaded, base.version);
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(rebuilt, null, 2)}\n`, 'utf8');

  const remote = rebuilt.places.flatMap((p) => p.media).filter((m) => m.url.startsWith('https://'));
  // eslint-disable-next-line no-console
  console.log(
    [
      `media: found ${found.length} new image(s); ${stillMissing.length} place(s) still without one`,
      stillMissing.length ? `  missing: ${stillMissing.join(', ')}` : null,
      remote.length ? `  ${remote.length} image(s) still point at the web (download failed)` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
