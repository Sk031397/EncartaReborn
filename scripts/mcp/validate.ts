/**
 * Validation shared by the MCP `validate_places` tool and the pre-write guard
 * hook: schema, sourcing, region, and trail rules for candidate Place records.
 */
import { z } from 'zod';
import { PlaceSchema } from '../../src/data/schema';
import { regionTags } from '../../src/data/regions';

export type ValidationReport = {
  ok: boolean;
  checked: number;
  problems: string[];
};

export function validatePlaces(input: unknown, knownIds: Set<string>): ValidationReport {
  const parsed = z.array(PlaceSchema).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      checked: Array.isArray(input) ? input.length : 0,
      problems: parsed.error.issues
        .slice(0, 20)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    };
  }
  const places = parsed.data;
  const ids = new Set([...knownIds, ...places.map((p) => p.id)]);
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const place of places) {
    if (seen.has(place.id)) problems.push(`${place.id}: duplicate id in this batch`);
    seen.add(place.id);
    if (regionTags(place).length !== 1) {
      problems.push(`${place.id}: needs exactly one region tag in categories`);
    }
    if (place.trails.length < 3 || place.trails.length > 5) {
      problems.push(`${place.id}: has ${place.trails.length} trails (needs 3 to 5)`);
    }
    for (const trail of place.trails) {
      if (trail.toId === place.id) problems.push(`${place.id}: trail links to itself`);
      else if (!ids.has(trail.toId)) problems.push(`${place.id}: trail to unknown id "${trail.toId}"`);
    }
    for (const media of place.media) {
      if (media.alt.trim().length < 10) problems.push(`${place.id}: image alt text is too short`);
    }
  }
  return { ok: problems.length === 0, checked: places.length, problems };
}
