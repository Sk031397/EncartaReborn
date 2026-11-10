/**
 * On-device storage for the expedition log and notes (Req 5).
 *
 * Everything lives in localStorage under a namespaced key. Nothing is ever sent
 * off-device (manifesto law 4). If storage is unavailable (private mode), we
 * degrade to an in-memory store for the session so the app still works, with no
 * data leaving the device.
 */
export type LogEntry = {
  id: string;
  name: string;
  visitedAt: string; // ISO timestamp of the most recent visit
  note: string;
};

const KEY = 'encarta:expedition-log';

// In-memory fallback when localStorage throws (private mode / disabled).
let memory: Record<string, LogEntry> = {};
let useMemory = false;

function readAll(): Record<string, LogEntry> {
  if (useMemory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, LogEntry>) : {};
  } catch {
    useMemory = true;
    return memory;
  }
}

function writeAll(entries: Record<string, LogEntry>): void {
  if (useMemory) {
    memory = entries;
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    useMemory = true;
    memory = entries;
  }
}

/** Record (or refresh) a visit to a place. */
export function recordVisit(id: string, name: string): void {
  const entries = readAll();
  const existing = entries[id];
  entries[id] = {
    id,
    name,
    visitedAt: new Date().toISOString(),
    note: existing?.note ?? '',
  };
  writeAll(entries);
}

/** Persist a personal note for a place (creating a bare entry if needed). */
export function setNote(id: string, name: string, note: string): void {
  const entries = readAll();
  const existing = entries[id];
  entries[id] = {
    id,
    name,
    visitedAt: existing?.visitedAt ?? new Date().toISOString(),
    note,
  };
  writeAll(entries);
}

/** All log entries, most-recently-visited first. Bounded, not a feed. */
export function getLog(): LogEntry[] {
  return Object.values(readAll()).sort((a, b) =>
    b.visitedAt.localeCompare(a.visitedAt),
  );
}

/** Clear the entire on-device log (Req 5.4). */
export function clearLog(): void {
  if (useMemory) {
    memory = {};
    return;
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    memory = {};
    useMemory = true;
  }
}
