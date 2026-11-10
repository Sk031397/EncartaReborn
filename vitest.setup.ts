import '@testing-library/jest-dom/vitest';

// jsdom has no canvas or WebGL. Make getContext quietly return null instead of
// logging "not implemented" noise, so the app's WebGL detection takes its normal
// "unavailable" path and Explore renders the flat map in tests.
// (Tests that opt into the plain Node environment have no DOM, so skip it there.)
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: () => null,
  });
}
