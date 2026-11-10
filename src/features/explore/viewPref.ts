/**
 * The reader's preferred map view (3D globe or flat map), kept on this device
 * only (manifesto law 4). Defaults to nothing so callers can choose a default.
 */
export type MapView = 'globe' | 'flat';

const KEY = 'encarta:map-view';

export function readViewPref(): MapView | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'globe' || value === 'flat' ? value : null;
  } catch {
    return null; // storage unavailable → no stored preference
  }
}

export function writeViewPref(view: MapView): void {
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // ignore: the preference simply won't persist
  }
}
