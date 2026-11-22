/** Colours and type shared by scenes. Mirrors the CSS custom properties in index.css. */
export const THEME = {
  bgTop: 0x161a3a,
  bgBottom: 0x0b0d1f,
  panel: 0x23285a,
  panelHi: 0x2f3570,
  ink: 0xf4f5ff,
  inkMuted: 0xa9acd6,
  good: 0x3ee089,
  bad: 0xff5468,
  gold: 0xffc94a,
  accent: 0x7c6cff,
  font: '"Atkinson", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

export const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
