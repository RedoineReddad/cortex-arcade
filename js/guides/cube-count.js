// Guide for Cube Stack 3D: professor's tips and the "How to play" steps.

const CSS = `
  .cug-svg { overflow: visible; }
  .cug-svg polygon { stroke: var(--ink); stroke-width: 1; stroke-linejoin: round; }
  .cug-t { fill: color-mix(in srgb, var(--c) 30%, var(--sheet)); }
  .cug-l { fill: color-mix(in srgb, var(--c) 60%, var(--sheet)); }
  .cug-r { fill: color-mix(in srgb, var(--c) 85%, var(--sheet)); }
  .cug-o.cug-t { fill: #f9c896; } .cug-o.cug-l { fill: #f6a35c; } .cug-o.cug-r { fill: #d9853e; }
  .cug-b.cug-t { fill: #b3d1f7; } .cug-b.cug-l { fill: #6ea8f0; } .cug-b.cug-r { fill: #4d88d6; }
  .cug-ghost polygon { fill-opacity: .18; stroke-dasharray: 3 2; }
  .cug-hid polygon { fill: var(--good); fill-opacity: .35; stroke: var(--good); }
  .cug-fade { animation: cug-fade 3.2s ease-in-out infinite; }
  @keyframes cug-fade { 0%, 55% { opacity: 1; } 80%, 92% { opacity: .08; } 100% { opacity: 1; } }
  .cug-grid { display: grid; grid-template-columns: repeat(3, 40px); gap: 4px; }
  .cug-grid .tut-box { min-width: 40px; padding: 0; }
  .cug-ob { background: #f6a35c; border-color: #d9853e; color: #1b1530; }
  .cug-bb { background: #6ea8f0; border-color: #4d88d6; color: #1b1530; }
`;

/**
 * Isometric drawing of a heightmap. hm[x][z] = column height.
 * colour(x, z, y) -> extra class ('cug-o', 'cug-b' or ''), mark(x, z, y) -> group class.
 */
function iso(h, hm, { s = 18, colour = () => '', mark = () => '' } = {}) {
  const a = s * 0.866, b = s * 0.5;
  const P = (x, y, z) => `${((x - z) * a).toFixed(1)},${((x + z) * b - y * s).toFixed(1)}`;
  const cubes = [];
  hm.forEach((row, x) => row.forEach((ht, z) => { for (let y = 0; y < ht; y++) cubes.push([x, y, z]); }));
  cubes.sort((p, q) => (p[0] + p[2]) - (q[0] + q[2]) || p[1] - q[1]);
  const n = hm.length, maxH = Math.max(...hm.flat());
  const minX = -n * a - 2, maxX = n * a + 2, minY = -(maxH * s) - 2, maxY = 2 * n * b + 2;
  return h('svg.cug-svg', { viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`, width: maxX - minX, height: maxY - minY },
    cubes.map(([x, y, z]) => {
      const c = colour(x, z, y);
      const k = (f) => 'polygon.' + f + (c ? '.' + c : '');
      return h('g' + (mark(x, z, y) ? '.' + mark(x, z, y) : ''),
        h(k('cug-t'), { points: [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)].join(' ') }),
        h(k('cug-r'), { points: [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)].join(' ') }),
        h(k('cug-l'), { points: [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)].join(' ') }));
    }));
}

const STACK = [[3, 2, 0], [2, 1, 0], [1, 0, 0]]; // 9 cubes, 3 of them hidden

export default {
  tips: {
    low: [
      'Count column by column: find the top of each column, work out how tall it is, then add the heights.',
      'A cube high up always stands on cubes below it, even when you cannot see them.',
    ],
    mid: [
      'Use the turning view. Each side shows you a different set of columns, so check the back ones twice.',
      'In colour rounds, ignore the other colour completely and add only the matching columns.',
    ],
    high: [
      'Splendid stacking! You see hidden cubes like an X-ray machine.',
      'Top marks. Answer while the stack is still turning to earn the full bonus.',
    ],
  },
  tutorial: [
    {
      say: 'A stack of cubes turns for a few seconds and then fades. Count every cube before it goes.',
      demo: (h) => h('div.tut-row', h('style', CSS), h('div.cug-fade', iso(h, STACK, { s: 24 })), h('span.tut-muted', 'then it fades')),
    },
    {
      say: 'Here is the twist: cubes cannot float. Every cube up high stands on hidden cubes, so count those too.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        iso(h, STACK, { s: 16 }),
        h('span.tut-big', '→'),
        iso(h, STACK, { s: 16, mark: (x, z, y) => ((x === 0 && z === 0 && y < 2) || (x === 1 && z === 0 && y === 0) ? 'cug-hid' : 'cug-ghost') }),
        h('div.tut-col', h('span.tut-note', '9 cubes'), h('span.tut-muted', '3 hidden'))),
    },
    {
      say: 'Count column by column. Add up how tall each column is, then type the total and press Enter.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.cug-grid', STACK.flat().map((v) => h('div.tut-box', v ? String(v) : '·'))),
        h('div.tut-col', h('span.tut-muted', '3+2+2+1+1'), h('div.tut-row', h('div.tut-box', '9'), h('div.tut-box.on.tut-tap', '⏎')))),
    },
    {
      say: 'Later rounds ask for one colour. Each column is a single colour, so add only the columns of that colour.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        iso(h, STACK, { s: 22, colour: (x, z) => ((x + z) % 2 === 0 ? 'cug-o' : 'cug-b') }),
        h('div.tut-col', h('span.tut-muted', 'How many orange?'), h('span.tut-note', '3 + 1 + 1 = 5'))),
    },
  ],
};
