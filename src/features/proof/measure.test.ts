import { describe, expect, it } from 'vitest';
import { getRenderablePlaces } from '../../data/snapshotLoader';
import { auditData, auditNetwork, auditStorage } from './measure';

describe('Proof page measurements', () => {
  it('finds no unsourced items in the real snapshot', () => {
    const audit = auditData(getRenderablePlaces());
    expect(audit.places).toBeGreaterThanOrEqual(100);
    expect(audit.unsourced).toBe(0);
    expect(audit.sources).toBeGreaterThan(50);
    expect(Object.keys(audit.licenses).length).toBeGreaterThan(1);
  });

  it('reports network activity without crashing', () => {
    const network = auditNetwork();
    expect(network.external).toEqual([]);
  });

  it('only counts this app’s own storage keys', () => {
    localStorage.setItem?.('encarta:map-view', 'globe');
    const storage = auditStorage();
    expect(storage.cookies).toBe(0);
    expect(storage.keys.every((k) => k.startsWith('encarta:'))).toBe(true);
  });
});
