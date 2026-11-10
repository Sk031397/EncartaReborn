#!/usr/bin/env node
/**
 * Source Citation Guard (blocking). Runs as a Kiro PreToolUse hook before any
 * write tool. If the write targets place data and would leave a summary, fact,
 * or image without a valid source, it exits with code 2, which blocks the write
 * and tells the agent why. Everything else passes through untouched.
 *
 * Plain Node, no dependencies, so it starts fast on every write.
 * Input: the hook event as JSON on stdin.
 */
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const LICENSES = new Set(['CC0', 'CC-BY', 'CC-BY-SA', 'public-domain', 'ODbL', 'other']);
const DATA_FILE = /(^|[\\/])(public[\\/]data[\\/]snapshot\.json|scripts[\\/]data[\\/](batches[\\/][^\\/]+|media-patches)\.json)$/;

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function sourceProblem(sources, where) {
  if (!Array.isArray(sources) || sources.length === 0) return `${where}: has no source`;
  for (const s of sources) {
    if (!s || typeof s.name !== 'string' || !s.name.trim()) return `${where}: a source has no name`;
    if (typeof s.url !== 'string' || !s.url.startsWith('https://')) return `${where}: a source url is not https`;
    if (!LICENSES.has(s.license)) return `${where}: a source has license "${s?.license}"`;
  }
  return null;
}

function placeProblems(place, index) {
  const id = place && typeof place.id === 'string' ? place.id : `#${index}`;
  const out = [];
  const summary = sourceProblem(place?.summary?.sources, `${id} summary`);
  if (summary) out.push(summary);
  (place?.facts ?? []).forEach((f, i) => {
    const p = sourceProblem(f?.sources, `${id} fact "${f?.label ?? i}"`);
    if (p) out.push(p);
  });
  out.push(...mediaProblems(place?.media, id));
  return out;
}

function mediaProblems(media, id) {
  const out = [];
  (media ?? []).forEach((m, i) => {
    const p = sourceProblem(m?.sources, `${id} image ${i + 1}`);
    if (p) out.push(p);
    if (!m?.alt || String(m.alt).trim().length < 10) out.push(`${id} image ${i + 1}: needs descriptive alt text`);
  });
  return out;
}

function check(file, content) {
  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    return [`not valid JSON (${err.message})`];
  }
  if (/media-patches\.json$/.test(file)) {
    if (!Array.isArray(data)) return ['media-patches.json must be an array'];
    return data.flatMap((patch) => mediaProblems(patch?.media, patch?.placeId ?? '?'));
  }
  const places = Array.isArray(data) ? data : data?.places;
  if (!Array.isArray(places)) return ['expected an array of places (or a snapshot with "places")'];
  return places.flatMap(placeProblems);
}

function main() {
  let event = {};
  try {
    event = JSON.parse(readStdin() || '{}');
  } catch {
    process.exit(0); // not something we understand: never block by accident
  }
  const input = event.tool_input ?? event.toolInput ?? event.input ?? {};
  const target = input.path ?? input.file_path ?? input.targetFile;
  if (typeof target !== 'string' || !DATA_FILE.test(target)) process.exit(0);

  const cwd = event.cwd ?? process.cwd();
  const file = isAbsolute(target) ? target : resolve(cwd, target);

  let content;
  if (typeof input.text === 'string') content = input.text; // full write
  else if (typeof input.newStr === 'string' && typeof input.oldStr === 'string' && existsSync(file)) {
    const before = readFileSync(file, 'utf8');
    content = input.replace_all
      ? before.split(input.oldStr).join(input.newStr)
      : before.replace(input.oldStr, input.newStr);
  } else {
    process.exit(0); // appends and other shapes: the data:build validator catches them
  }

  const problems = check(file, content);
  if (problems.length === 0) process.exit(0);
  const shown = problems.slice(0, 12).map((p) => `  - ${p}`).join('\n');
  const more = problems.length > 12 ? `\n  ...and ${problems.length - 12} more` : '';
  process.stderr.write(
    `Source Citation Guard blocked this write to ${relative(cwd, file) || file}.\n` +
      `Every summary, fact, and image must carry a source with a name, an https url, and a license.\n` +
      `${shown}${more}\nFix these, or leave the unsourced content out.\n`,
  );
  process.exit(2);
}

main();
