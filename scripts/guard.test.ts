// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const guard = resolve(process.cwd(), 'scripts/guard.mjs');
const src = { name: 'Wikipedia — X', url: 'https://en.wikipedia.org/wiki/X', license: 'CC-BY-SA' };

function run(event: unknown) {
  return spawnSync(process.execPath, [guard], { input: JSON.stringify(event), encoding: 'utf8' });
}

const place = (factSources: unknown[]) => ({
  id: 'x',
  summary: { text: 't', sources: [src] },
  facts: [{ label: 'L', value: 'V', sources: factSources }],
  media: [],
});

describe('blocking source citation guard', () => {
  it('lets a fully sourced batch through', () => {
    const r = run({
      tool_input: { path: 'scripts/data/batches/europe-a.json', text: JSON.stringify([place([src])]) },
    });
    expect(r.status).toBe(0);
  });

  it('blocks a batch with an unsourced fact (exit 2) and explains why', () => {
    const r = run({
      tool_input: { path: 'scripts/data/batches/europe-a.json', text: JSON.stringify([place([])]) },
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/x fact "L": has no source/);
  });

  it('blocks a source with an unknown license', () => {
    const bad = { ...src, license: 'All rights reserved' };
    const r = run({
      tool_input: { path: 'public/data/snapshot.json', text: JSON.stringify({ places: [place([bad])] }) },
    });
    expect(r.status).toBe(2);
  });

  it('ignores files that are not place data', () => {
    const r = run({ tool_input: { path: 'src/app/App.tsx', text: 'anything' } });
    expect(r.status).toBe(0);
  });

  it('never blocks when the input is not understood', () => {
    expect(run('not json').status).toBe(0);
  });
});
