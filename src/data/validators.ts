/**
 * Source validators — the runtime embodiment of the anti-feed manifesto law
 * "every factual claim must be sourced" (steering: product.md law 5).
 *
 * The ArticleView's SourceGate and the data-integrity test both call these, so
 * "no unsourced facts" is enforced in code rather than by review.
 */
import type { Fact, Media, Place, Source } from './schema';

/** A source is valid when it has a name, a non-empty url, and a license. */
export function isValidSource(source: Source): boolean {
  return (
    source.name.trim().length > 0 &&
    source.url.trim().length > 0 &&
    source.license.trim().length > 0
  );
}

/** True when the item carries at least one valid source. */
export function hasValidSource(item: {
  sources: Source[];
}): boolean {
  return item.sources.some(isValidSource);
}

/**
 * A place is renderable only if its summary is sourced. Facts and media are
 * filtered individually (see below) rather than disqualifying the whole place.
 */
export function isRenderable(place: Place): boolean {
  return hasValidSource(place.summary);
}

/** Only facts that carry a valid source may be shown. */
export function renderableFacts(place: Place): Fact[] {
  return place.facts.filter(hasValidSource);
}

/** Only media that carries a valid source may be shown. */
export function renderableMedia(place: Place): Media[] {
  return place.media.filter(hasValidSource);
}
