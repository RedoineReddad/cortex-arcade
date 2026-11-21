// Guide for Laser Mirrors: professor's tips and the "How to play" steps.

// A 3×3 box with edge ports, drawn in SVG. Units: one cell; the box spans 1..4 inside a 0..5 frame.
// opts: {mirrors: [[r,c,'/'|'\\']], hide, emit: [side,i], beam: [[r,c],...], exit: [side,i], tap: [side,i]}
const portXY = (side, i) => side === 'T' ? [i + 1.5, 0.5] : side === 'B' ? [i + 1.5, 4.5] : side === 'L' ? [0.5, i + 1.5] : [4.5, i + 1.5];

function box(h, { mirrors = [], hide, emit, beam, exit, tap }) {
  const s = h('svg.mbg-svg', { viewBox: '0 0 5 5' });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s.append(h('rect.mbg-cell', { x: c + 1.05, y: r + 1.05, width: 0.9, height: 0.9, rx: 0.12 }));
  for (const side of ['T', 'B', 'L', 'R']) for (let i = 0; i < 3; i++) {
    const [x, y] = portXY(side, i);
    const on = (p) => p && p[0] === side && p[1] === i;
    s.append(h('circle.mbg-port' + (on(emit) ? '.mbg-emit' : '') + (on(exit) ? '.mbg-exit' : '') + (on(tap) ? '.mbg-tap' : ''), { cx: x, cy: y, r: 0.3 }));
  }
  for (const [r, c, t] of mirrors) {
    const x = c + 1, y = r + 1, a = 0.18, b = 0.82;
    const p = t === '/' ? [x + a, y + b, x + b, y + a] : [x + a, y + a, x + b, y + b];
    s.append(h('line.mbg-mirror' + (hide ? '.tut-blink' : ''), { x1: p[0], y1: p[1], x2: p[2], y2: p[3] }));
  }
  if (beam) s.append(h('polyline.mbg-beam', { points: beam.map(([x, y]) => `${x},${y}`).join(' '), pathLength: 1 }));
  return s;
}

const STYLE = `
  .mbg-svg { width: clamp(110px, 30vw, 150px); height: clamp(110px, 30vw, 150px); overflow: visible; }
  .mbg-rule { font-size: .85rem; }
  .mbg-cell { fill: var(--sheet); stroke: var(--edge); stroke-width: .03; }
  .mbg-port { fill: none; stroke: var(--edge); stroke-width: .05; stroke-dasharray: .1 .08; }
  .mbg-port.mbg-emit { fill: var(--c); stroke: var(--c); stroke-dasharray: none; }
  .mbg-port.mbg-exit { fill: color-mix(in srgb, var(--good) 35%, var(--sheet)); stroke: var(--good); stroke-width: .08; stroke-dasharray: none; }
  .mbg-port.mbg-tap { stroke: var(--pen); stroke-width: .08; stroke-dasharray: none; animation: tut-blink 1.4s ease-in-out infinite; }
  .mbg-mirror { stroke: #38bdf8; stroke-width: .12; stroke-linecap: round; }
  .mbg-beam { fill: none; stroke: #f43f5e; stroke-width: .09; stroke-linecap: round; stroke-linejoin: round;
    stroke-dasharray: 1; stroke-dashoffset: 1; animation: mbg-beam 2.6s linear infinite; }
  @keyframes mbg-beam { 0% { stroke-dashoffset: 1; } 50%, 100% { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) { .mbg-beam { animation: none; stroke-dashoffset: 0; } }
`;

const M = [[1, 0, '\\'], [0, 2, '/'], [2, 1, '/']];

export default {
  tips: {
    low: [
      'Note which way each mirror leans and which row it sits in. Then follow the beam one square at a time.',
      'Each mirror turns the beam a quarter turn. Draw the bounce in the air with your finger if it helps.',
    ],
    mid: [
      'Say the mirrors as a little list, like "top right slash, middle left backslash". Words stick better than pictures.',
      'A beam hitting / going right turns up; hitting \\ going right turns down. Learn that pair and the rest follows.',
    ],
    high: [
      'Laser-sharp! Bigger boxes with more mirrors are on the way.',
      'Superb tracing. Long bounces score extra, and you are catching them all.',
    ],
  },
  tutorial: [
    {
      say: 'Mirrors appear in the box. You have about three seconds to memorise them.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE), box(h, { mirrors: M }),
        h('div.tut-box', '⏱ 3 s')),
    },
    {
      say: 'Here is the twist: the mirrors vanish before the laser fires, so you trace the beam from memory.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE), box(h, { mirrors: M, hide: true, emit: ['L', 1] }),
        h('span.tut-note', 'gone!')),
    },
    {
      say: 'Each mirror turns the beam a quarter turn, like a ball bouncing off a slanted wall.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE),
        box(h, { mirrors: M, emit: ['L', 1], exit: ['B', 0], beam: [[0.5, 2.5], [1.5, 2.5], [1.5, 4.5]] }),
        h('div.tut-col', h('div.tut-box.mbg-rule', '→ hits \\ → down'), h('div.tut-box.mbg-rule', '→ hits / → up'))),
    },
    {
      say: 'Tap the edge port where the beam leaves the box. More mirrors in the path means more points.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE),
        box(h, { mirrors: M, hide: true, emit: ['L', 1], tap: ['B', 0] }), h('div.tut-box.good', '+12')),
    },
  ],
};
