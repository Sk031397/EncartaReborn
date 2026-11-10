/**
 * Encarta Reborn sources MCP server (stdio, JSON-RPC 2.0, no dependencies).
 *
 * Gives Kiro agents (notably `source-curator`) real, rate-limited, User-Agent
 * identified access to the approved open datasets, plus a validator for the
 * project's own schema, instead of ad-hoc web fetches that kept hitting HTTP 429.
 *
 * Tools:
 *  - wikipedia_summary  { title }        -> extract, coordinates, lead image
 *  - commons_license    { files[] }      -> real license, author, size, existence
 *  - commons_search     { query, limit } -> license-clean photo candidates
 *  - validate_places    { places | path }-> schema + sourcing + trail checks
 *
 * Registered in .kiro/settings/mcp.json. Run directly: `npx tsx scripts/mcp/server.ts`.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { commonsInfoBatch, commonsSearch, politeFetch } from '../lib/net';
import { IMAGE_LICENSES, looksLikeNonPhoto } from '../lib/sources';
import { validatePlaces } from './validate';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');

type Json = Record<string, unknown>;
type Tool = {
  name: string;
  description: string;
  inputSchema: Json;
  run: (args: Json) => Promise<unknown>;
};

const asString = (v: unknown) => (typeof v === 'string' ? v : '');

const tools: Tool[] = [
  {
    name: 'wikipedia_summary',
    description:
      'Fetch the English Wikipedia summary for an article title: plain-text extract, canonical URL, coordinates, and the lead image file name. Cite it with license CC-BY-SA.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string', description: 'Article title, e.g. "Mount Fuji"' } },
      required: ['title'],
    },
    run: async (args) => {
      const title = asString(args['title']).trim().replace(/ /g, '_');
      if (!title) throw new Error('title is required');
      const res = await politeFetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`Wikipedia returned ${res.status} for "${title}"`);
      const d = (await res.json()) as {
        title?: string;
        extract?: string;
        coordinates?: { lat: number; lon: number };
        content_urls?: { desktop?: { page?: string } };
        originalimage?: { source?: string };
      };
      const lead = d.originalimage?.source?.split('/').pop();
      return {
        title: d.title,
        url: d.content_urls?.desktop?.page,
        license: 'CC-BY-SA',
        extract: d.extract,
        coordinates: d.coordinates ?? null,
        leadImageFile: lead ? `File:${decodeURIComponent(lead).replace(/_/g, ' ')}` : null,
      };
    },
  },
  {
    name: 'commons_license',
    description:
      'Look up Wikimedia Commons files (up to 50) and return each one\'s real license (mapped to the project enum), author, size, and whether it exists. Use before citing any image.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' }, description: 'e.g. ["File:Paris.jpg"]' },
      },
      required: ['files'],
    },
    run: async (args) => {
      const files = (Array.isArray(args['files']) ? args['files'] : [])
        .map(asString)
        .filter(Boolean)
        .map((f) => (f.startsWith('File:') ? f : `File:${f}`))
        .slice(0, 50);
      if (files.length === 0) throw new Error('files must list at least one file');
      const infos = await commonsInfoBatch(files);
      return files.map((file) => {
        const info = infos.get(file);
        if (!info || info.missing) return { file, exists: false };
        return {
          file,
          exists: true,
          license: info.license,
          licenseName: info.licenseName,
          acceptable: info.license !== null && IMAGE_LICENSES.has(info.license),
          author: info.artist,
          width: info.width,
          height: info.height,
          mime: info.mime,
          filePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(info.title.replace(/ /g, '_'))}`,
        };
      });
    },
  },
  {
    name: 'commons_search',
    description:
      'Search Wikimedia Commons for photographs and return only license-clean candidates (CC0, public domain, CC BY, CC BY-SA), skipping maps, flags, and logos.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Max candidates (default 8)' },
      },
      required: ['query'],
    },
    run: async (args) => {
      const query = asString(args['query']).trim();
      if (!query) throw new Error('query is required');
      const limit = Math.min(20, Math.max(1, Number(args['limit']) || 8));
      const results = await commonsSearch(query, Math.min(30, limit * 2));
      return results
        .filter((i) => i.license && IMAGE_LICENSES.has(i.license) && !looksLikeNonPhoto(i.title))
        .slice(0, limit)
        .map((i) => ({
          file: i.title,
          license: i.license,
          licenseName: i.licenseName,
          author: i.artist,
          width: i.width,
          height: i.height,
          description: i.description.slice(0, 200),
        }));
    },
  },
  {
    name: 'validate_places',
    description:
      'Validate Place records against the Encarta Reborn schema and sourcing rules (every summary, fact, and image sourced; one region tag; 3-5 trails that resolve). Pass "places" (array) or "path" (a batch JSON file relative to the project root).',
    inputSchema: {
      type: 'object',
      properties: {
        places: { type: 'array', items: { type: 'object' } },
        path: { type: 'string' },
      },
    },
    run: async (args) => {
      let input: unknown = args['places'];
      const path = asString(args['path']);
      if (path) {
        const file = resolve(ROOT, path);
        if (!file.startsWith(ROOT)) throw new Error('path must stay inside the project');
        input = JSON.parse(await readFile(file, 'utf8'));
      }
      const snapshot = JSON.parse(
        await readFile(resolve(ROOT, 'public/data/snapshot.json'), 'utf8'),
      ) as { places?: Array<{ id: string }> };
      const knownIds = new Set((snapshot.places ?? []).map((p) => p.id));
      return validatePlaces(input, knownIds);
    },
  },
];

const PROTOCOL = '2024-11-05';

function reply(id: unknown, result: unknown) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}
function fail(id: unknown, code: number, message: string) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

async function handle(msg: { id?: unknown; method?: string; params?: Json }) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: asString(params?.['protocolVersion']) || PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: 'encarta-sources', version: '1.0.0' },
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, {
        tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
    case 'tools/call': {
      const tool = tools.find((t) => t.name === params?.['name']);
      if (!tool) return fail(id, -32602, `Unknown tool: ${String(params?.['name'])}`);
      try {
        const result = await tool.run((params?.['arguments'] as Json) ?? {});
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        return reply(id, {
          isError: true,
          content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        });
      }
    }
    default:
      if (isRequest) fail(id, -32601, `Method not found: ${String(method)}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg: { id?: unknown; method?: string; params?: Json };
  try {
    msg = JSON.parse(line);
  } catch {
    return fail(null, -32700, 'Parse error');
  }
  void handle(msg);
});
