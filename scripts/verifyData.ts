/**
 * Network verification of the data (run on demand: `npm run data:verify`).
 *
 * The unit tests prove every citation is well formed; this proves it is true:
 *  - every cited page responds (dead links fail the run);
 *  - every Commons image exists and its real license matches the license we
 *    declared (a mismatch fails the run);
 *  - every bundled image file exists on disk and is not empty.
 * Sites that refuse automated requests (UNESCO often does) are reported as
 * warnings, never silently counted as verified.
 */
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapshotSchema } from '../src/data/schema';
import { commonsInfoBatch, politeFetch, sleep } from './lib/net';
import { classifyStatus, collectSources, commonsFileTitle } from './lib/sources';

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(here, '../public/data/snapshot.json');
const PUBLIC_DIR = resolve(here, '../public');

async function checkPage(url: string): Promise<{ status: number } | { error: string }> {
  try {
    let res = await politeFetch(url, { method: 'HEAD' });
    if ([403, 405, 501].includes(res.status)) res = await politeFetch(url, { method: 'GET' });
    await res.body?.cancel();
    return { status: res.status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function pool<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const item = items[next++];
        if (item !== undefined) {
          await work(item);
          await sleep(150);
        }
      }
    }),
  );
}

async function main(): Promise<void> {
  const snapshot = SnapshotSchema.parse(JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')));
  const uses = [...collectSources(snapshot.places).values()];
  const failures: string[] = [];
  const warnings: string[] = [];

  // 1. Commons images: existence + real license, 50 titles per request.
  const commons = uses.filter((u) => commonsFileTitle(u.source.url));
  const titles = [...new Set(commons.map((u) => commonsFileTitle(u.source.url) as string))];
  const infos = new Map<string, Awaited<ReturnType<typeof commonsInfoBatch>> extends Map<string, infer V> ? V : never>();
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    for (const [asked, info] of await commonsInfoBatch(chunk)) infos.set(asked, info);
    await sleep(500);
  }
  for (const use of commons) {
    const title = commonsFileTitle(use.source.url) as string;
    const info = infos.get(title);
    const where = `${use.source.url} (${use.placeIds.join(', ')})`;
    if (!info || info.missing) failures.push(`Commons file not found: ${where}`);
    else if (!info.license) {
      failures.push(`unrecognised license "${info.licenseName}": ${where}`);
    } else if (info.license !== use.source.license) {
      failures.push(
        `license mismatch (declared ${use.source.license}, Commons says ${info.licenseName}): ${where}`,
      );
    }
  }

  // 2. Every other cited page.
  const pages = uses.filter((u) => !commonsFileTitle(u.source.url));
  let ok = 0;
  await pool(pages, 4, async (use) => {
    const result = await checkPage(use.source.url);
    const where = `${use.source.url} (${use.placeIds.join(', ')})`;
    if ('error' in result) return void warnings.push(`no response (${result.error}): ${where}`);
    const verdict = classifyStatus(result.status);
    if (verdict === 'ok') ok++;
    else if (verdict === 'missing') failures.push(`dead link (${result.status}): ${where}`);
    else warnings.push(`${verdict} (${result.status}): ${where}`);
  });

  // 3. Bundled image files.
  let localImages = 0;
  for (const place of snapshot.places) {
    for (const media of place.media) {
      if (!media.url.startsWith('/')) continue;
      const file = resolve(PUBLIC_DIR, `.${media.url}`);
      if (!existsSync(file) || statSync(file).size === 0) {
        failures.push(`bundled image missing or empty: ${media.url} (${place.id})`);
      } else localImages++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      `verified ${snapshot.places.length} places, ${uses.length} distinct sources`,
      `  Commons files checked: ${titles.length}`,
      `  other pages reachable: ${ok} of ${pages.length}`,
      `  bundled images present: ${localImages}`,
      `  warnings: ${warnings.length}`,
      ...warnings.map((w) => `    ~ ${w}`),
      `  failures: ${failures.length}`,
      ...failures.map((f) => `    x ${f}`),
    ].join('\n'),
  );
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
