/**
 * Find-a-place filtering. This is lookup, not recommendation: a typed query and
 * two plain dropdowns narrow the list, and nothing about the reader's behaviour
 * influences what is shown or in what order (manifesto law 2).
 */
import type { Place, PlaceType } from '../../data/schema';
import { getRegion, type Region } from '../../data/regions';

export type PlaceFilter = {
  query: string;
  type: PlaceType | 'all';
  region: Region | 'all';
};

export const NO_FILTER: PlaceFilter = { query: '', type: 'all', region: 'all' };

export const PLACE_TYPE_OPTIONS: Array<{ value: PlaceType; label: string }> = [
  { value: 'country', label: 'Countries' },
  { value: 'city', label: 'Cities' },
  { value: 'landmark', label: 'Landmarks' },
  { value: 'natural', label: 'Natural wonders' },
  { value: 'heritage', label: 'Heritage sites' },
];

/** Lower-case and strip accents so "ha long" finds "Hạ Long Bay". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .trim();
}

export function isFiltering(filter: PlaceFilter): boolean {
  return filter.query.trim() !== '' || filter.type !== 'all' || filter.region !== 'all';
}

export function filterPlaces(places: Place[], filter: PlaceFilter): Place[] {
  const query = fold(filter.query);
  return places.filter((place) => {
    if (filter.type !== 'all' && place.type !== filter.type) return false;
    if (filter.region !== 'all' && getRegion(place) !== filter.region) return false;
    if (!query) return true;
    return (
      fold(place.name).includes(query) ||
      place.categories.some((category) => fold(category).includes(query))
    );
  });
}
