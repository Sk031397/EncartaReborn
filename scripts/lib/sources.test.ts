import { describe, expect, it } from 'vitest';
import type { Place } from '../../src/data/schema';
import {
  classifyStatus,
  collectSources,
  commonsFileTitle,
  licenseFromCommons,
  looksLikeNonPhoto,
  stripHtml,
  wikipediaTitle,
} from './sources';

describe('licenseFromCommons', () => {
  it('maps the license names Commons actually returns', () => {
    expect(licenseFromCommons('CC BY-SA 3.0')).toBe('CC-BY-SA');
    expect(licenseFromCommons('CC BY-SA 3.0 de')).toBe('CC-BY-SA');
    expect(licenseFromCommons('CC BY 4.0')).toBe('CC-BY');
    expect(licenseFromCommons('CC BY 2.0')).toBe('CC-BY');
    expect(licenseFromCommons('CC0')).toBe('CC0');
    expect(licenseFromCommons('Public domain')).toBe('public-domain');
    expect(licenseFromCommons('PD-USGov-NASA')).toBe('public-domain');
  });

  it('refuses licenses it does not recognise instead of guessing', () => {
    expect(licenseFromCommons('Attribution')).toBeNull();
    expect(licenseFromCommons('Fair use')).toBeNull();
    expect(licenseFromCommons(undefined)).toBeNull();
  });
});

describe('stripHtml', () => {
  it('removes tags and decodes common entities', () => {
    expect(stripHtml('<a href="x">Jane &amp; Co</a> <b>photo</b>')).toBe(
      'Jane & Co photo',
    );
  });
  it('handles missing input', () => {
    expect(stripHtml(undefined)).toBe('');
  });
});

describe('url helpers', () => {
  it('reads a Commons file title from a file page url', () => {
    expect(
      commonsFileTitle('https://commons.wikimedia.org/wiki/File:Mt._Fuji_(1).jpg'),
    ).toBe('File:Mt. Fuji (1).jpg');
    expect(commonsFileTitle('https://en.wikipedia.org/wiki/Japan')).toBeNull();
  });

  it('reads a Wikipedia title', () => {
    expect(wikipediaTitle('https://en.wikipedia.org/wiki/Mount_Fuji')).toBe(
      'Mount_Fuji',
    );
    expect(wikipediaTitle('https://example.org/x')).toBeNull();
  });
});

describe('classifyStatus', () => {
  it('separates dead links from sites that block bots', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(301)).toBe('ok');
    expect(classifyStatus(404)).toBe('missing');
    expect(classifyStatus(403)).toBe('blocked');
    expect(classifyStatus(429)).toBe('blocked');
    expect(classifyStatus(500)).toBe('error');
  });
});

describe('looksLikeNonPhoto', () => {
  it('flags maps, flags, and logos but not photos', () => {
    expect(looksLikeNonPhoto('Flag_of_Iceland.svg')).toBe(true);
    expect(looksLikeNonPhoto('Serengeti_location_map.png')).toBe(true);
    expect(looksLikeNonPhoto('Kirkjufell,_Iceland.jpg')).toBe(false);
  });
});

describe('collectSources', () => {
  const src = {
    name: 'Wikipedia — X',
    url: 'https://en.wikipedia.org/wiki/X',
    license: 'CC-BY-SA' as const,
  };
  const place = (id: string): Place => ({
    id,
    name: id,
    type: 'city',
    coordinates: { lat: 0, lon: 0 },
    summary: { text: 't', sources: [src] },
    facts: [{ label: 'l', value: 'v', sources: [src] }],
    media: [],
    trails: [],
    categories: ['europe'],
  });

  it('lists each distinct url once, with every place that cites it', () => {
    const map = collectSources([place('a'), place('b')]);
    expect(map.size).toBe(1);
    expect(map.get(src.url)?.placeIds).toEqual(['a', 'b']);
  });
});
