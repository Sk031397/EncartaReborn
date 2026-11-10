/**
 * Measurements behind the Proof page. Everything is computed from the bundled
 * snapshot and the browser itself, at the moment the reader looks. Nothing here
 * is a hard-coded claim.
 */
import type { License, Place } from '../../data/schema';

export type DataAudit = {
  places: number;
  facts: number;
  images: number;
  sources: number;
  unsourced: number;
  licenses: Partial<Record<License, number>>;
};

export function auditData(places: Place[]): DataAudit {
  const sourceUrls = new Set<string>();
  const licenses: Partial<Record<License, number>> = {};
  let facts = 0;
  let images = 0;
  let unsourced = 0;
  const visit = (sources: Place['summary']['sources']) => {
    if (sources.length === 0) unsourced++;
    for (const s of sources) {
      if (!sourceUrls.has(s.url)) {
        sourceUrls.add(s.url);
        licenses[s.license] = (licenses[s.license] ?? 0) + 1;
      }
    }
  };
  for (const place of places) {
    visit(place.summary.sources);
    for (const fact of place.facts) {
      facts++;
      visit(fact.sources);
    }
    for (const media of place.media) {
      images++;
      visit(media.sources);
    }
  }
  return { places: places.length, facts, images, sources: sourceUrls.size, unsourced, licenses };
}

export type NetworkAudit = {
  /** False when the browser cannot report resources (then we say so). */
  supported: boolean;
  total: number;
  external: string[];
};

/** Every resource this page has loaded since it opened, by origin. */
export function auditNetwork(): NetworkAudit {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return { supported: false, total: 0, external: [] };
  }
  const entries = performance.getEntriesByType('resource');
  const external = new Set<string>();
  for (const entry of entries) {
    try {
      const url = new URL(entry.name);
      if (url.protocol.startsWith('http') && url.origin !== window.location.origin) {
        external.add(url.origin);
      }
    } catch {
      // ignore entries that are not URLs
    }
  }
  return { supported: true, total: entries.length, external: [...external] };
}

export type StorageAudit = {
  cookies: number;
  keys: string[];
  bytes: number;
};

/** What this app has stored on the device (its own `encarta:` keys only). */
export function auditStorage(): StorageAudit {
  const cookies = typeof document !== 'undefined' && document.cookie
    ? document.cookie.split(';').filter((c) => c.trim()).length
    : 0;
  const keys: string[] = [];
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('encarta:')) {
        keys.push(key);
        bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
      }
    }
  } catch {
    // storage unavailable: nothing stored
  }
  return { cookies, keys: keys.sort(), bytes };
}
