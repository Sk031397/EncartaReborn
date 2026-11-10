/**
 * Snapshot loader — the single runtime entry point to place data.
 *
 * Offline-first law (structure.md law 3): data access goes through this loader,
 * which reads the bundled, licensed snapshot. There is no third-party API call
 * on the critical path. The raw JSON is validated against the canonical
 * SnapshotSchema (zod) so malformed or unsourced data fails loudly rather than
 * rendering (product.md law 5 / Req 6.4, 6.5).
 */
import rawSnapshot from '../../public/data/snapshot.json';
import { SnapshotSchema, type Place, type Snapshot } from './schema';
import { isRenderable } from './validators';

let cached: Snapshot | null = null;

/**
 * Parse and validate the bundled snapshot against SnapshotSchema.
 * Throws a clear error if validation fails. The result is cached so the
 * validation cost is paid once per session.
 */
export function loadSnapshot(): Snapshot {
  if (cached) return cached;

  const result = SnapshotSchema.safeParse(rawSnapshot);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid data snapshot: it does not match SnapshotSchema.\n${issues}`,
    );
  }

  cached = result.data;
  return cached;
}

/**
 * All places that are eligible to render — i.e. whose summary carries at least
 * one valid Source. Unsourced records are gated out here so no caller can
 * accidentally surface them (manifesto law 5).
 */
export function getRenderablePlaces(): Place[] {
  return loadSnapshot().places.filter(isRenderable);
}

/**
 * Look up a single renderable place by id. Returns undefined when the id is
 * unknown or when the place is not renderable.
 */
export function getPlaceById(id: string): Place | undefined {
  return getRenderablePlaces().find((place) => place.id === id);
}

/** Test/HMR helper: drop the cached, validated snapshot. */
export function resetSnapshotCache(): void {
  cached = null;
}
