/**
 * Build-time snapshot assembler (Req 6).
 *
 * Folds curated batches (`scripts/data/batches/*.json`) and media patches
 * (`scripts/data/media-patches.json`) into `public/data/snapshot.json`, drops
 * anything whose summary/fact/media lacks a valid source, drops trail links that
 * do not resolve, validates against the canonical schema, and writes the result.
 * Fails loudly (non-zero exit) if anything is invalid, naming the offending file.
 *
 * Existing places always win over batch entries, so re-running is safe and never
 * overwrites a corrected or enriched record (see scripts/lib/merge.ts).
 *
 * Usage: `npm run data:build` (runs via tsx).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import {
  MediaSchema,
  PlaceSchema,
  SnapshotSchema,
  type Place,
  type Snapshot,
} from '../src/data/schema';
import { hasValidSource, isRenderable } from '../src/data/validators';
import { mergeBatches, type MediaPatch } from './lib/merge';

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(here, '../public/data/snapshot.json');
const BATCH_DIR = resolve(here, 'data/batches');
const PATCH_PATH = resolve(here, 'data/media-patches.json');

/** Keep only sourced facts/media and only renderable (sourced-summary) places. */
export function sanitizePlaces(places: Place[]): Place[] {
  const ids = new Set(places.map((p) => p.id));
  return places.filter(isRenderable).map((place) => ({
    ...place,
    facts: place.facts.filter(hasValidSource),
    media: place.media.filter(hasValidSource),
    // Drop trail links that do not resolve or point to self.
    trails: place.trails.filter((t) => t.toId !== place.id && ids.has(t.toId)),
  }));
}

/** Assemble, validate, and return a Snapshot from candidate places. */
export function assembleSnapshot(places: Place[], version: string): Snapshot {
  const snapshot: Snapshot = {
    version,
    generatedAt: new Date().toISOString(),
    places: sanitizePlaces(places),
  };
  const result = SnapshotSchema.safeParse(snapshot);
  if (!result.success) {
    throw new Error(
      `Assembled snapshot is invalid:\n${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }
  return result.data;
}

const PatchFileSchema = z.array(
  z.object({ placeId: z.string().min(1), media: z.array(MediaSchema) }),
);

function describeIssues(file: string, error: z.ZodError): string[] {
  return error.issues.slice(0, 8).map((issue) => {
    const where = issue.path.join('.') || '(root)';
    return `  ${file}: ${where}: ${issue.message}`;
  });
}

async function readBatches(): Promise<{ batches: Place[][]; errors: string[] }> {
  const batches: Place[][] = [];
  const errors: string[] = [];
  if (!existsSync(BATCH_DIR)) return { batches, errors };
  const files = (await readdir(BATCH_DIR)).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const raw: unknown = JSON.parse(await readFile(resolve(BATCH_DIR, file), 'utf8'));
      const parsed = z.array(PlaceSchema).safeParse(raw);
      if (parsed.success) batches.push(parsed.data);
      else errors.push(...describeIssues(`batches/${file}`, parsed.error));
    } catch (err) {
      errors.push(`  batches/${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { batches, errors };
}

async function readPatches(): Promise<{ patches: MediaPatch[]; errors: string[] }> {
  if (!existsSync(PATCH_PATH)) return { patches: [], errors: [] };
  try {
    const raw: unknown = JSON.parse(await readFile(PATCH_PATH, 'utf8'));
    const parsed = PatchFileSchema.safeParse(raw);
    if (parsed.success) return { patches: parsed.data, errors: [] };
    return { patches: [], errors: describeIssues('media-patches.json', parsed.error) };
  } catch (err) {
    return {
      patches: [],
      errors: [`  media-patches.json: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

const countTrails = (places: Place[]) =>
  places.reduce((sum, place) => sum + place.trails.length, 0);

async function main(): Promise<void> {
  const base = SnapshotSchema.parse(JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')));
  const { batches, errors: batchErrors } = await readBatches();
  const { patches, errors: patchErrors } = await readPatches();
  const errors = [...batchErrors, ...patchErrors];
  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Invalid curation input:\n${errors.join('\n')}`);
    throw new Error(`${errors.length} problem(s) in the curated input files.`);
  }

  const { places, report } = mergeBatches(base.places, batches, patches);
  const trailsBefore = countTrails(places);
  const rebuilt = assembleSnapshot(places, base.version);
  const trailsDropped = trailsBefore - countTrails(rebuilt.places);

  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(rebuilt, null, 2)}\n`, 'utf8');

  const noImage = rebuilt.places.filter((p) => p.media.length === 0).map((p) => p.id);
  // eslint-disable-next-line no-console
  console.log(
    [
      `snapshot.json rebuilt: ${rebuilt.places.length} places, all sourced and validated.`,
      `  added ${report.added.length} new, ${report.skippedExisting.length} already present, ` +
        `${report.patched.length} gained media`,
      `  dropped ${trailsDropped} trail link(s) that did not resolve`,
      report.patchUnknownPlace.length
        ? `  media patches for unknown places: ${report.patchUnknownPlace.join(', ')}`
        : null,
      `  ${noImage.length} place(s) still have no image`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

// Run only when invoked directly (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
