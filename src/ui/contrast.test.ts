/**
 * Contrast token test (Req 7.1 — WCAG 2.1 AA, text >= 4.5:1).
 *
 * These assertions pin the palette so a future color tweak cannot silently drop
 * text below AA. Values mirror the tokens in tokens.css.
 */
import { describe, it, expect } from 'vitest';

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = {
  bg: '#0e1626',
  surface: '#17233b',
  text: '#eef3fb',
  textDim: '#b9c6de',
  amber: '#ffcf7a',
  amberInk: '#3a2a08',
  teal: '#7fe3d2',
};

describe('color contrast meets WCAG AA (4.5:1 for text)', () => {
  it('body text on background', () => {
    expect(contrastRatio(tokens.text, tokens.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('dim text on background', () => {
    expect(contrastRatio(tokens.textDim, tokens.bg)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('body text on surface panels', () => {
    expect(contrastRatio(tokens.text, tokens.surface)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('amber accent text on background', () => {
    expect(contrastRatio(tokens.amber, tokens.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('ink text on amber buttons', () => {
    expect(contrastRatio(tokens.amberInk, tokens.amber)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('teal links on background', () => {
    expect(contrastRatio(tokens.teal, tokens.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
