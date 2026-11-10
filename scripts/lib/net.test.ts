import { describe, expect, it } from 'vitest';
import { parseCommonsPages } from './net';

describe('parseCommonsPages', () => {
  const response = {
    query: {
      pages: {
        '1': {
          title: 'File:Paris.jpg',
          index: 2,
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/x/Paris.jpg',
              mime: 'image/jpeg',
              width: 4000,
              height: 3000,
              extmetadata: {
                LicenseShortName: { value: 'CC BY-SA 4.0' },
                Artist: { value: '<a href="u">Jane Doe</a>' },
                ImageDescription: { value: '<p>The <b>Eiffel</b> Tower at dusk</p>' },
              },
            },
          ],
        },
        '-1': { title: 'File:Gone.jpg', missing: '' },
      },
    },
  };

  it('reads license, author, and description from the metadata', () => {
    const [paris] = parseCommonsPages(response).filter((i) => i.title === 'File:Paris.jpg');
    expect(paris?.license).toBe('CC-BY-SA');
    expect(paris?.artist).toBe('Jane Doe');
    expect(paris?.description).toBe('The Eiffel Tower at dusk');
    expect(paris?.width).toBe(4000);
    expect(paris?.missing).toBe(false);
  });

  it('flags files that do not exist', () => {
    const gone = parseCommonsPages(response).find((i) => i.title === 'File:Gone.jpg');
    expect(gone?.missing).toBe(true);
  });

  it('copes with an empty or malformed response', () => {
    expect(parseCommonsPages({})).toEqual([]);
    expect(parseCommonsPages(null)).toEqual([]);
  });
});
