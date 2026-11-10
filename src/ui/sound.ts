/**
 * Optional UI sound. OFF BY DEFAULT (steering: product.md law 7, Req 7.2).
 *
 * Nothing plays unless the user explicitly opts in. We synthesize short, soft
 * cues with the Web Audio API so there are no autoplaying media files and no
 * network dependency. The preference persists on-device only.
 */
const STORAGE_KEY = 'encarta:sound-enabled';

let enabled = readPref();

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // private mode / no storage → stay silent
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // ignore storage failures; preference simply won't persist
  }
}

type Cue = 'select' | 'page' | 'insert';

const TONES: Record<Cue, { freq: number; dur: number }> = {
  select: { freq: 660, dur: 0.06 },
  page: { freq: 440, dur: 0.08 },
  insert: { freq: 330, dur: 0.18 },
};

let ctx: AudioContext | null = null;

/** Play a soft cue — but only when the user has opted in. */
export function playCue(cue: Cue): void {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const { freq, dur } = TONES[cue];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    // audio unavailable → silently do nothing
  }
}
