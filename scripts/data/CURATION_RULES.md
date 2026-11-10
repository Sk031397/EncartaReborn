# Curation rules for place batches

Used by the `source-curator` agent (and by people). The contract is
`src/data/schema.ts`; `npm run data:build` merges batches into
`public/data/snapshot.json`, and `npm run data:verify` checks every URL and image
license over the network.

## Output
- Write ONE file per batch: `scripts/data/batches/<name>.json`, a pretty-printed JSON
  array of `Place` objects for exactly the ids you were given.
- Image-only work goes in `scripts/data/media-patches.json`: an array of
  `{ "placeId": "...", "media": [ Media, ... ] }`.
- Do not edit `public/data/snapshot.json` or any other file.

## Get real data (never rely on memory for numbers, dates, or filenames)
Prefer the `encarta-sources` MCP tools (`wikipedia_summary`, `commons_license`,
`commons_search`, `validate_places`; see `scripts/mcp/server.ts`). They send a
proper User-Agent and retry politely, which avoids the HTTP 429 rate limits that
anonymous fetches hit. If they are not connected, use `web_fetch` on these JSON APIs:
- Wikipedia summary (extract, coordinates, links):
  `https://en.wikipedia.org/api/rest_v1/page/summary/<Title_With_Underscores>`
- Wikipedia article text (for facts):
  `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=<Title>&format=json`
- Commons file license and metadata:
  `https://commons.wikimedia.org/w/api.php?action=query&titles=File:<Name>&prop=imageinfo&iiprop=extmetadata|url|mime&format=json`
- Commons image candidates:
  `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=<terms>&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=extmetadata|url|mime&format=json`

## Fields
- `summary.text`: 2 to 3 neutral sentences, **paraphrased** (never the extract verbatim).
  Source: the Wikipedia article, license `CC-BY-SA`.
- `facts`: 3 to 4, each with `label`, `value`, and at least one source. Only facts you
  confirmed in fetched text. Prefer the Wikipedia article (`CC-BY-SA`).
- UNESCO: cite `https://whc.unesco.org/en/list/<id>/` (license `other`) **only** if you
  fetched that page and confirmed the id matches the site. Never guess an id; cite the
  Wikipedia article instead.
- `coordinates`: from the Wikipedia summary.
- `type`: `country`, `city`, `landmark`, `natural`, or `heritage`.
- `categories`: lowercase tags. **Exactly one region tag** from: `africa`, `americas`,
  `antarctica`, `asia`, `europe`, `middle-east`, `oceania`. Add theme tags such as
  `unesco-world-heritage`, `volcano`, `ancient`, `island`, `coastal`.
- `trails`: 3 to 5 links `{ "toId": "...", "reason": "category" | "geography" | "topic" }`.
  `toId` must come from the ALL_IDS list below. No self-links. Mix nearby places with
  thematically related ones from other regions.
- `media`: at most one image per place, and only when the Commons API shows a license of
  public domain, CC0, CC BY, or CC BY-SA. Map `Public domain`/`PD...` to
  `public-domain`, `CC0` to `CC0`, `CC BY x` to `CC-BY`, `CC BY-SA x` to `CC-BY-SA`.
  - `kind`: `"image"`
  - `url`: `https://commons.wikimedia.org/wiki/Special:FilePath/<File_name>`
  - `alt`: a specific description of what is visible
  - `attribution`: author, license, and "via Wikimedia Commons"
  - `sources[0]`: `{ "name": "Wikimedia Commons — <file>", "url": "https://commons.wikimedia.org/wiki/File:<File_name>", "license": <mapped> }`
  - Prefer a landscape photo (jpg or png). If no file is verified, use `"media": []`.
    **Never guess a filename.**
- Every source: `{ name, url (https), license }` with license one of `CC0`, `CC-BY`,
  `CC-BY-SA`, `public-domain`, `ODbL`, `other`.
- If you cannot source something, leave it out. Fewer, fully sourced facts beat padding.

## ALL_IDS (the only ids trails may point to)
japan, kyoto, eiffel-tower, mount-fuji, mont-saint-michel, grand-canyon, machu-picchu,
great-barrier-reef, great-pyramid-giza, petra, rome, colosseum, venice, santorini,
acropolis-athens, stonehenge, pompeii, iceland, sahara, serengeti, victoria-falls,
table-mountain, mount-kilimanjaro, marrakesh, istanbul, hagia-sophia, taj-mahal,
varanasi, angkor-wat, great-wall-china, forbidden-city, bali, sydney-opera-house, uluru,
christ-the-redeemer, amazon-rainforest, galapagos-islands, chichen-itza,
paris, london, sagrada-familia, alhambra, palace-of-versailles, neuschwanstein-castle,
matterhorn, geirangerfjord, giants-causeway, cliffs-of-moher, prague, amsterdam,
florence, edinburgh, antarctica, tokyo, seoul, singapore, mount-everest, ha-long-bay,
borobudur, bagan, potala-palace, terracotta-army, wulingyuan, lake-baikal, sigiriya,
kathmandu-valley, bangkok, dubai, jerusalem, dead-sea, persepolis, wadi-rum, karnak,
abu-simbel, lalibela, okavango-delta, namib-desert, ngorongoro-crater,
zanzibar-stone-town, timbuktu, madagascar, new-york-city, statue-of-liberty,
golden-gate-bridge, yellowstone, yosemite, niagara-falls, banff-national-park,
mexico-city, teotihuacan, iguazu-falls, torres-del-paine, easter-island,
salar-de-uyuni, milford-sound, tongariro-national-park, kakadu-national-park, fiji,
bora-bora, aoraki-mount-cook

## Finish
Reply in at most 120 words: ids written, ids with no image, anything dropped.
You may not have a terminal; do not claim to have run tests.
