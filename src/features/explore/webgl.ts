/**
 * WebGL capability check. The 3D globe is an enhancement: when WebGL is missing
 * (old devices, locked-down browsers, test environments) Explore falls back to
 * the flat map, which has the same places and the same keyboard access.
 */
let cached: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = gl !== null && gl !== undefined;
  } catch {
    cached = false;
  }
  return cached;
}
