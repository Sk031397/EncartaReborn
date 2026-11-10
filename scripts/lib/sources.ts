/**
 * Pure helpers shared by the data tools (verifier, media pipeline) and the MCP
 * server. Nothing here touches the network, so all of it is unit-tested.
 */
import type { License, Place, Source } from '../../src/data/schema';

/** Politeness: Wikimedia asks automated clients to identify themselves. */
export const USER_AGENT =
  'EncartaReborn-DataTools/1.0 (open-source hackathon project; polite, rate-limited data verification)';

/** Strip HTML tags and common entities from Commons metadata fields. */
export function stripHtml(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Map a Commons `LicenseShortName` to our license enum, or null if unknown. */
export function licenseFromCommons(
  shortName: string | undefined,
): License | null {
  if (!shortName) return null;
  const name = shortName.trim();
  if (/^cc0|^cc zero/i.test(name)) return 'CC0';
  if (/public domain|^pd(\b|-)/i.test(name)) return 'public-domain';
  if (/^cc[ -]by[ -]sa/i.test(name)) return 'CC-BY-SA';
  if (/^cc[ -]by/i.test(name)) return 'CC-BY';
  return null;
}

/** Licenses we accept for images that ship with the disc. */
export const IMAGE_LICENSES: ReadonlySet<License> = new Set([
  'CC0',
  'public-domain',
  'CC-BY',
  'CC-BY-SA',
]);

/** `https://commons.wikimedia.org/wiki/File:A_b.jpg` -> `File:A b.jpg` */
export function commonsFileTitle(url: string): string | null {
  const match = /^https:\/\/commons\.wikimedia\.org\/wiki\/(File:.+)$/i.exec(url);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

/** `https://en.wikipedia.org/wiki/Mount_Fuji` -> `Mount_Fuji` */
export function wikipediaTitle(url: string): string | null {
  const match = /^https:\/\/en\.wikipedia\.org\/wiki\/([^#?]+)/i.exec(url);
  return match && match[1] ? match[1] : null;
}

export type SourceUse = { source: Source; placeIds: string[] };

/** Every distinct source URL in the snapshot, with the places that cite it. */
export function collectSources(places: Place[]): Map<string, SourceUse> {
  const out = new Map<string, SourceUse>();
  const add = (source: Source, placeId: string) => {
    const existing = out.get(source.url);
    if (existing) {
      if (!existing.placeIds.includes(placeId)) existing.placeIds.push(placeId);
    } else {
      out.set(source.url, { source, placeIds: [placeId] });
    }
  };
  for (const place of places) {
    for (const s of place.summary.sources) add(s, place.id);
    for (const fact of place.facts) for (const s of fact.sources) add(s, place.id);
    for (const media of place.media) for (const s of media.sources) add(s, place.id);
  }
  return out;
}

export type UrlVerdict = 'ok' | 'blocked' | 'missing' | 'error';

/**
 * Classify an HTTP status. `missing` is a definitive failure (the citation is
 * dead). `blocked` means the site refused an automated request (common for
 * UNESCO), which is a warning, not proof the page is gone.
 */
export function classifyStatus(status: number): UrlVerdict {
  if (status >= 200 && status < 400) return 'ok';
  if (status === 404 || status === 410) return 'missing';
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  return 'error';
}

/** Words in a filename that usually mean "not a photograph of the place". */
export function looksLikeNonPhoto(fileName: string): boolean {
  return /(^|[_\s.-])(map|flag|locator|location|coat[_\s-]?of[_\s-]?arms|logo|seal|diagram|plan|chart|icon|symbol|emblem|banner)([_\s.-]|$)/i.test(
    fileName,
  );
}
