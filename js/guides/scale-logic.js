// Guide for Balance Bench: professor's tips and the "How to play" steps.

const CSS = `
  .slg-scale { width: 150px; height: 84px; overflow: visible; }
  .slg-scale.big { width: 210px; height: 118px; }
  .slg-ink { stroke: var(--ink-soft); stroke-width: 3; stroke-linecap: round; fill: none; }
  .slg-base { fill: var(--ink-soft); opacity: .55; }
  .slg-pan { fill: color-mix(in srgb, var(--c) 25%, var(--sheet)); stroke: var(--c); stroke-width: 2; }
  .slg-pivot { fill: var(--c); }
  .slg-obj { font-size: 20px; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
  .slg-eq { font-size: 1.3rem; font-weight: 700; }
  .slg-tilt { transform-origin: 75px 22px; animation: slg-tilt 2.4s ease-in-out infinite alternate; }
  @keyframes slg-tilt { from { transform: rotate(0deg); } to { transform: rotate(var(--slg-a)); } }
`;

/** A small balance scale. tilt: +1 left side heavier, -1 right side heavier, 0 balanced. */
function scale(h, left, right, tilt, animate, big) {
  const a = tilt > 0 ? -10 : tilt < 0 ? 10 : 0;
  const pan = (items, x) => h('g',
    h('line.slg-ink', { x1: x, y1: 22, x2: x - 18, y2: 48, 'stroke-width': 1.5 }),
    h('line.slg-ink', { x1: x, y1: 22, x2: x + 18, y2: 48, 'stroke-width': 1.5 }),
    h('path.slg-pan', { d: `M${x - 24} 48 L${x + 24} 48 Q${x} 58 ${x - 24} 48 Z` }),
    items.map((it, k) => h('text.slg-obj', { x: x + (k - (items.length - 1) / 2) * 19, y: 45, 'text-anchor': 'middle' }, it)));
  const beam = h('g' + (animate ? '.slg-tilt' : ''), { style: animate ? `--slg-a:${a}deg` : `transform-origin:75px 22px; transform:rotate(${a}deg)` },
    h('line.slg-ink', { x1: 15, y1: 22, x2: 135, y2: 22 }), pan(left, 15), pan(right, 135));
  return h('svg.slg-scale' + (big ? '.big' : ''), { viewBox: '-15 0 180 84' },
    h('path.slg-base', { d: 'M67 82 L83 82 L78 24 L72 24 Z' }),
    beam,
    h('circle.slg-pivot', { cx: 75, cy: 22, r: 4 }));
}

export default {
  tips: {
    low: [
      'The low pan holds the heavier side. Say each scale out loud: "apple is heavier than cherry".',
      'Check every fruit against the question. The heaviest one never sits on a raised pan.',
      'Read the question twice: heaviest and lightest flip the answer.',
    ],
    mid: [
      'Link the scales into one line, like apple > pear > lemon, before you look at the buttons.',
      'When a scale balances groups, turn it into a sum: two cherries = one apple means each cherry is half an apple.',
    ],
    high: [
      'Splendid weighing! Keep your fingers on 1 to 4 and you will be even faster.',
      'Top marks. Harder benches bring more group scales, so keep doing the sums.',
    ],
  },
  tutorial: [
    {
      say: 'Each scale tips toward the heavier side. The pan that sinks holds the heavier fruit.',
      demo: (h) => h('div.tut-col', h('style', CSS), scale(h, ['🍎'], ['🍒'], 1, true, true), h('div.slg-eq', '🍎 > 🍒')),
    },
    {
      say: 'Chain the scales together. If the apple beats the cherry and the cherry beats the lemon, the apple is heaviest.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.tut-row', scale(h, ['🍎'], ['🍒'], 1), scale(h, ['🍒'], ['🍋'], 1)),
        h('div.tut-row', h('div.tut-box.good', '🍎'), h('span.slg-eq', '>'), h('div.tut-box', '🍒'), h('span.slg-eq', '>'), h('div.tut-box', '🍋'))),
    },
    {
      say: 'Here is the twist: some scales hold groups. Two cherries balance one pear, so the pear weighs as much as both cherries.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        scale(h, ['🍒', '🍒'], ['🍐'], 0, false, true),
        h('div.tut-row', h('span.slg-eq', '🍐 = 🍒 + 🍒'), h('span.tut-note', 'do the sum'))),
    },
    {
      say: 'Check whether I want the heaviest or the lightest, then tap it or press 1 to 4. You have one minute.',
      demo: (h) => h('div.tut-col',
        h('div.tut-big', { style: { fontSize: '1.4rem' } }, 'Which is the ', h('span', { style: { color: 'var(--c)' } }, 'LIGHTEST'), '?'),
        h('div.tut-row', ['🍎', '🍒', '🍋'].map((f, i) => h('div.tut-box' + (i === 2 ? '.on.tut-tap' : ''), `${i + 1} ${f}`)))),
    },
  ],
};
