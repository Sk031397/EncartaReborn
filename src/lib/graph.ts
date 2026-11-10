/**
 * Curiosity-trail derivation (Req 4).
 *
 * buildTrails returns 3-5 related places derived ONLY from the knowledge graph:
 * shared categories, geographic proximity, and shared place type ("topic").
 * Its signature deliberately accepts no engagement, personalization, or
 * time-on-app signal — there is nowhere to inject one — so manifesto law 2
 * ("no algorithmic recommendations") is structurally enforced, not promised.
 *
 * Authored trail links in the data are honored first (they are editorial,
 * graph-reasoned links). If a place has fewer than the minimum, we top up from
 * the graph; if nothing qualifies, we return fewer rather than padding with
 * irrelevant suggestions (Req 4.4).
 */
import type { Place, TrailLink } from '../data/schema';

const MIN_TRAILS = 3;
const MAX_TRAILS = 5;

/** Great-circle-ish proximity; plain squared distance is enough for ranking. */
function proximity(a: Place, b: Place): number {
  const dLat = a.coordinates.lat - b.coordinates.lat;
  const dLon = a.coordinates.lon - b.coordinates.lon;
  return dLat * dLat + dLon * dLon;
}

function sharedCategoryCount(a: Place, b: Place): number {
  const set = new Set(a.categories);
  return b.categories.filter((c) => set.has(c)).length;
}

/**
 * Derive a reason for linking `from` -> `candidate`, or null if the graph gives
 * no meaningful relationship.
 */
function deriveReason(from: Place, candidate: Place): TrailLink['reason'] | null {
  if (sharedCategoryCount(from, candidate) > 0) return 'category';
  if (candidate.type === from.type) return 'topic';
  // Geographic nearness: within ~25 degrees combined — a loose "same region".
  if (proximity(from, candidate) < 625) return 'geography';
  return null;
}

/**
 * Build 3-5 trail links for `from`, choosing among `all` places.
 * Pure and deterministic given its inputs.
 */
export function buildTrails(from: Place, all: Place[]): TrailLink[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const result: TrailLink[] = [];
  const used = new Set<string>([from.id]);

  // 1) Honor authored links first (skip self and unknown ids).
  for (const link of from.trails) {
    if (used.has(link.toId)) continue;
    if (!byId.has(link.toId)) continue;
    result.push(link);
    used.add(link.toId);
    if (result.length >= MAX_TRAILS) return result;
  }

  // 2) Top up from the graph, ranked by shared categories then proximity.
  const candidates = all
    .filter((p) => !used.has(p.id))
    .map((p) => ({ place: p, reason: deriveReason(from, p) }))
    .filter((c): c is { place: Place; reason: TrailLink['reason'] } =>
      c.reason !== null,
    )
    .sort((a, b) => {
      const byCat =
        sharedCategoryCount(from, b.place) - sharedCategoryCount(from, a.place);
      if (byCat !== 0) return byCat;
      return proximity(from, a.place) - proximity(from, b.place);
    });

  for (const c of candidates) {
    if (result.length >= MAX_TRAILS) break;
    result.push({ toId: c.place.id, reason: c.reason });
    used.add(c.place.id);
  }

  // 3) Return what we have. If fewer than MIN_TRAILS qualify, so be it — we do
  //    not pad with irrelevant links (Req 4.4).
  return result.slice(0, Math.max(MIN_TRAILS, Math.min(result.length, MAX_TRAILS)));
}

export const TRAIL_BOUNDS = { MIN_TRAILS, MAX_TRAILS };
