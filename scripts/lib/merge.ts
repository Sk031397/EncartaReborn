/**
 * Pure merge logic for the data pipeline: curated batches and media patches are
 * folded into the existing snapshot. Existing places always win, so re-running
 * the pipeline never overwrites a record that has since been corrected or
 * enriched (for example, an image that was bundled locally).
 */
import type { Media, Place } from '../../src/data/schema';

export type MediaPatch = { placeId: string; media: Media[] };

export type MergeReport = {
  added: string[];
  skippedExisting: string[];
  patched: string[];
  patchUnknownPlace: string[];
};

function mediaKey(media: Media): string {
  // The Commons file page is the stable identity; the url may have been
  // rewritten to a local path after download.
  return media.sources[0]?.url ?? media.url;
}

export function mergeBatches(
  base: Place[],
  batches: Place[][],
  patches: MediaPatch[],
): { places: Place[]; report: MergeReport } {
  const byId = new Map<string, Place>(base.map((place) => [place.id, place]));
  const report: MergeReport = {
    added: [],
    skippedExisting: [],
    patched: [],
    patchUnknownPlace: [],
  };

  for (const batch of batches) {
    for (const place of batch) {
      if (byId.has(place.id)) {
        report.skippedExisting.push(place.id);
      } else {
        byId.set(place.id, place);
        report.added.push(place.id);
      }
    }
  }

  for (const patch of patches) {
    const place = byId.get(patch.placeId);
    if (!place) {
      report.patchUnknownPlace.push(patch.placeId);
      continue;
    }
    const have = new Set(place.media.map(mediaKey));
    const fresh = patch.media.filter((media) => !have.has(mediaKey(media)));
    if (fresh.length === 0) continue;
    byId.set(place.id, { ...place, media: [...place.media, ...fresh] });
    report.patched.push(place.id);
  }

  return { places: [...byId.values()], report };
}
