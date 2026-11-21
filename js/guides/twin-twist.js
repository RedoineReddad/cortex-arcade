// Guide for Twin Twist 3D: professor's tips and the "How to play" steps.

const CSS = `
  .twg-shape { overflow: visible; }
  .twg-shape rect { fill: color-mix(in srgb, var(--c) 45%, var(--sheet)); stroke: var(--ink); stroke-width: 1.5; }
  .twg-b rect { fill: color-mix(in srgb, var(--c) 20%, var(--sheet)); }
  .twg-lab { font-size: .75rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-soft); }
  .twg-hand { font-size: 1.8rem; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
  .twg-flip { display: inline-block; transform: scaleX(-1); }
  .twg-tumble { animation: twg-tumble 4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
  @keyframes twg-tumble { 0% { transform: rotate(0deg); } 45%, 55% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } }
`;

// An L-shaped polyomino: three cubes in a column with one cube to the right at the foot.
const L = [[0, 0], [0, 1], [0, 2], [1, 2]];

/** cells -> small SVG; rot: quarter turns clockwise; flip: mirror left-right. */
function shape(h, { rot = 0, flip = false, b = false, cls = '' } = {}) {
  const s = 22;
  let cells = L.map(([x, y]) => [flip ? -x : x, y]);
  for (let r = 0; r < rot; r++) cells = cells.map(([x, y]) => [-y, x]);
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const mx = Math.min(...xs), my = Math.min(...ys);
  const ox = (66 - (Math.max(...xs) - mx + 1) * s) / 2, oy = (66 - (Math.max(...ys) - my + 1) * s) / 2; // centre it
  return h('svg.twg-shape' + (b ? '.twg-b' : ''), { width: 80, height: 80, viewBox: '0 0 66 66' },
    h('g' + cls, cells.map(([x, y]) => h('rect', { x: ox + (x - mx) * s, y: oy + (y - my) * s, width: s, height: s, rx: 3 }))));
}

const pair = (h, a, b, verdict) => h('div.tut-row', { style: { gap: '18px' } },
  h('div.tut-col', h('span.twg-lab', 'Shape A'), a),
  h('div.tut-col', h('span.twg-lab', 'Shape B'), b),
  verdict);

export default {
  tips: {
    low: [
      'Find the longest arm in both shapes first, then check which way the short arm at its end points.',
      'If you cannot decide, drag shape B until its longest arm lines up with shape A.',
    ],
    mid: [
      'Compare the two ends of each shape. Mirror shapes always bend the opposite way at one end.',
      'Wrong answers cost five points, so take one extra look when you are unsure.',
    ],
    high: [
      'Splendid spinning! Your mental rotation is out of this world.',
      'Top marks. Bigger, faster-tumbling shapes are coming, so trust your first good look.',
    ],
  },
  tutorial: [
    {
      say: 'Two shapes tumble side by side. Same means shape B is shape A, just turned around.',
      demo: (h) => h('div', h('style', CSS), pair(h, shape(h), shape(h, { rot: 1, b: true }), h('div.tut-box.good', 'Same'))),
    },
    {
      say: 'Mirror means B is the reflection of A, like your left and right hands. No turning makes them match.',
      demo: (h) => h('div', h('style', CSS),
        pair(h, shape(h), shape(h, { flip: true, b: true }),
          h('div.tut-col', h('div.tut-box.on', 'Mirror'), h('div.tut-row', h('span.twg-hand', '✋'), h('span.twg-hand.twg-flip', '✋'))))),
    },
    {
      say: 'Here is the twist: the shapes never stop tumbling and the clock keeps running. Drag shape B to turn it yourself.',
      demo: (h) => h('div', h('style', CSS),
        pair(h, shape(h), h('div.tut-tap', shape(h, { rot: 1, b: true, cls: '.twg-tumble' })), h('span.tut-note', 'drag B'))),
    },
    {
      say: 'Tap Same or Mirror, or press S or ← for same and M or → for mirror. Quick right answers earn a bonus.',
      demo: (h) => h('div.tut-row',
        h('div.tut-col', h('div.tut-box', 'Same'), h('span.tut-muted', 'S / ←')),
        h('div.tut-col', h('div.tut-box', 'Mirror'), h('span.tut-muted', 'M / →')),
        h('div.tut-box', '⏱ 1:00')),
    },
  ],
};
