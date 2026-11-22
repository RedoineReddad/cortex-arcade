import type * as Phaser from 'phaser';

/**
 * The canvas runs at device-pixel resolution (crisp on phones), so game units are device pixels.
 * `u(n)` converts a CSS-pixel design size into game units.
 */
export interface Viewport {
  w: number;
  h: number;
  dpr: number;
  u: (cssPx: number) => number;
  cx: number;
  /** Width of the centred play column (portrait-friendly, capped on desktop). */
  colW: number;
  colX: number;
  /** Safe top inset (room for the shell's quit button). */
  top: number;
}

export const DPR_KEY = 'dpr';

export function viewport(scene: Phaser.Scene): Viewport {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const dpr = (scene.registry.get(DPR_KEY) as number | undefined) ?? 1;
  const u = (n: number) => n * dpr;
  const colW = Math.min(w - u(32), u(460));
  return { w, h, dpr, u, cx: w / 2, colW, colX: (w - colW) / 2, top: u(64) };
}

export function fontPx(px: number, vp: Viewport, weight: 400 | 700 = 700) {
  return { fontSize: `${Math.round(vp.u(px))}px`, fontStyle: weight === 700 ? 'bold' : 'normal' };
}
