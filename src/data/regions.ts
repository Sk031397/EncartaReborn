/**
 * World regions used to browse and filter places. Each place carries exactly one
 * region tag in its `categories` (enforced by the data-integrity test), so
 * filtering is a plain lookup, never a score or a recommendation.
 */
import type { Place } from './schema';

export const REGIONS = [
  'africa',
  'americas',
  'antarctica',
  'asia',
  'europe',
  'middle-east',
  'oceania',
] as const;

export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  africa: 'Africa',
  americas: 'The Americas',
  antarctica: 'Antarctica',
  asia: 'Asia',
  europe: 'Europe',
  'middle-east': 'Middle East',
  oceania: 'Oceania',
};

/** Every region tag a place carries (there should be exactly one). */
export function regionTags(place: Place): Region[] {
  return REGIONS.filter((region) => place.categories.includes(region));
}

export function getRegion(place: Place): Region | undefined {
  return regionTags(place)[0];
}
