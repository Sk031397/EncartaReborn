import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  recordVisit,
  setNote,
  getLog,
  clearLog,
} from './storage';

beforeEach(() => {
  clearLog();
});

describe('expedition log storage', () => {
  it('records a visit and reads it back', () => {
    recordVisit('japan', 'Japan');
    const log = getLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.id).toBe('japan');
    expect(log[0]?.name).toBe('Japan');
  });

  it('persists a note across reads (round-trip)', () => {
    recordVisit('kyoto', 'Kyoto');
    setNote('kyoto', 'Kyoto', 'Loved the temples.');
    expect(getLog()[0]?.note).toBe('Loved the temples.');
  });

  it('orders entries most-recently-visited first', () => {
    recordVisit('a', 'A');
    recordVisit('b', 'B');
    recordVisit('a', 'A'); // re-visit A → most recent
    expect(getLog()[0]?.id).toBe('a');
  });

  it('clears the log', () => {
    recordVisit('japan', 'Japan');
    clearLog();
    expect(getLog()).toHaveLength(0);
  });

  it('never calls the network (nothing leaves the device)', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    recordVisit('japan', 'Japan');
    setNote('japan', 'Japan', 'note');
    getLog();
    clearLog();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
