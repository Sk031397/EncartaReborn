/**
 * Polite networking for the data tools. Wikimedia asks automated clients to
 * identify themselves and to back off on HTTP 429, which is exactly what the
 * curation agents' anonymous fetches ran into. Everything here sends a
 * descriptive User-Agent and retries with a delay.
 */
import type { License } from '../../src/data/schema';
import { USER_AGENT, licenseFromCommons, stripHtml } from './sources';

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function politeFetch(
  url: string,
  init: RequestInit = {},
  tries = 4,
): Promise<Response> {
  let last: Response | undefined;
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
      ...init,
      headers: {
        'user-agent': USER_AGENT,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (res.status !== 429 && res.status < 500) return res;
    last = res;
    const retryAfter = Number(res.headers.get('retry-after'));
    const seconds =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5 * (attempt + 1);
    await sleep(seconds * 1000);
  }
  if (last) return last;
  throw new Error(`No response from ${url}`);
}

export type CommonsInfo = {
  title: string;
  missing: boolean;
  url: string;
  mime: string;
  width: number;
  height: number;
  license: License | null;
  licenseName: string;
  artist: string;
  description: string;
  index: number;
};

type RawMeta = Record<string, { value?: string } | undefined>;
type RawPage = {
  title?: string;
  index?: number;
  missing?: string;
  imageinfo?: Array<{
    url?: string;
    mime?: string;
    width?: number;
    height?: number;
    extmetadata?: RawMeta;
  }>;
};

/** Parse a Commons `action=query&prop=imageinfo` response (format=json). */
export function parseCommonsPages(json: unknown): CommonsInfo[] {
  const pages =
    (json as { query?: { pages?: Record<string, RawPage> } } | null)?.query?.pages ??
    {};
  return Object.values(pages).map((page) => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    const licenseName = stripHtml(meta['LicenseShortName']?.value);
    return {
      title: page.title ?? '',
      missing: page.missing !== undefined || !info,
      url: info?.url ?? '',
      mime: info?.mime ?? '',
      width: info?.width ?? 0,
      height: info?.height ?? 0,
      license: licenseFromCommons(licenseName),
      licenseName,
      artist: stripHtml(meta['Artist']?.value),
      description: stripHtml(meta['ImageDescription']?.value),
      index: page.index ?? 0,
    };
  });
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const IMAGEINFO = 'prop=imageinfo&iiprop=extmetadata%7Curl%7Cmime%7Csize';

/** Look up to 50 Commons file titles at once. Keys are the titles you asked for. */
export async function commonsInfoBatch(
  titles: string[],
): Promise<Map<string, CommonsInfo>> {
  const url =
    `${COMMONS_API}?action=query&format=json&redirects=1&${IMAGEINFO}` +
    `&titles=${encodeURIComponent(titles.join('|'))}`;
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Commons API returned ${res.status}`);
  const json: unknown = await res.json();
  const infos = parseCommonsPages(json);
  const byTitle = new Map(infos.map((info) => [info.title, info]));

  // Titles can be normalised or redirected; map what was asked to what came back.
  const query = (json as {
    query?: {
      normalized?: Array<{ from: string; to: string }>;
      redirects?: Array<{ from: string; to: string }>;
    };
  }).query;
  const alias = new Map<string, string>();
  for (const entry of query?.normalized ?? []) alias.set(entry.from, entry.to);
  for (const entry of query?.redirects ?? []) alias.set(entry.from, entry.to);

  const out = new Map<string, CommonsInfo>();
  for (const asked of titles) {
    let title = asked;
    for (let hop = 0; hop < 3 && alias.has(title); hop++) title = alias.get(title) ?? title;
    const info = byTitle.get(title);
    if (info) out.set(asked, info);
  }
  return out;
}

/** Search Commons files (namespace 6); results are ordered by relevance. */
export async function commonsSearch(term: string, limit = 12): Promise<CommonsInfo[]> {
  const url =
    `${COMMONS_API}?action=query&format=json&generator=search&gsrnamespace=6` +
    `&gsrlimit=${limit}&${IMAGEINFO}&gsrsearch=${encodeURIComponent(term)}`;
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Commons search returned ${res.status}`);
  return parseCommonsPages(await res.json()).sort((a, b) => a.index - b.index);
}
