// Guide for Bubble Rank: professor's tips and the "How to play" steps.
const CSS = `
  .br-t { --br: var(--c); }
  .br-t.flip { --br: #ec4899; }
  .br-t-dir { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 4px; border-radius: 999px; font-weight: 700;
    background: color-mix(in srgb, var(--br) 16%, var(--sheet)); border: 2px solid var(--br); white-space: nowrap; }
  .br-t-dir i { font-style: normal; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--br); color: var(--sheet); }
  .br-t-bub { position: relative; width: 66px; height: 66px; border-radius: 50%; display: grid; place-items: center; flex: none;
    font-weight: 700; font-size: .95rem; color: var(--ink); white-space: nowrap;
    background: radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--sheet) 70%, transparent), transparent 28%),
                radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--br) 6%, var(--sheet)) 50%, color-mix(in srgb, var(--br) 30%, var(--sheet)) 100%);
    border: 2px solid color-mix(in srgb, var(--br) 70%, transparent); }
  .br-t-bub.bad { border-color: var(--pen); background: color-mix(in srgb, var(--pen) 22%, var(--sheet)); }
  .br-t-bub b { position: absolute; top: -8px; right: -6px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
    font-size: .75rem; background: var(--ink); color: var(--sheet); }
  .br-t-bub small { position: absolute; bottom: -20px; font-size: .8rem; color: var(--ink-soft); font-weight: 400; }
  .br-t-float { animation: br-t-float 3s ease-in-out infinite; }
  .br-t-float:nth-child(2n) { animation-delay: -1.5s; }
  @keyframes br-t-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }
  @media (prefers-reduced-motion: reduce) { .br-t-float { animation: none; } }
`;
const bub = (h, txt, extra = {}) => h('div.br-t-bub.br-t-float' + (extra.cls || ''),
  txt, extra.n ? h('b', extra.n) : null, extra.v != null ? h('small', '= ' + extra.v) : null);
const dir = (h, flip) => h('div.br-t-dir', h('i', flip ? '⬇' : '⬆'), flip ? 'Largest first' : 'Smallest first');

export default {
  tips: {
    low: [
      'Before you tap, find the smallest bubble and say its value out loud. Then look for the next one.',
      'Watch the arrow at the top: ⬆ means smallest first and ⬇ means largest first.',
      'A wrong pop brings every bubble back, so one second of checking saves the whole round.',
    ],
    mid: [
      'Every third round the order flips. When the bubbles turn pink, start with the biggest.',
      'Mind the minus signs: −8 is smaller than 2, and −3 × 4 is −12.',
      'Work out every value first, then pop them in one quick sweep for the speed bonus.',
    ],
    high: [
      'Perfect ranking at full speed. Those bubbles never stood a chance!',
      'Superb. More bubbles and trickier sums come next, so keep ranking them all before your first tap.',
    ],
  },
  tutorial: [
    {
      say: 'Each bubble holds a little sum. Work out what every bubble is worth.',
      demo: (h) => h('div.br-t.tut-row', { style: { gap: '18px', paddingBottom: '18px' } }, h('style', CSS),
        bub(h, '3 + 4', { v: 7 }), bub(h, '9', { v: 9 }), bub(h, '2 × 3', { v: 6 })),
    },
    {
      say: 'When the arrow points up, pop them from smallest to largest. Tap a bubble to pop it.',
      demo: (h) => h('div.br-t.tut-col', h('style', CSS), dir(h, false),
        h('div.tut-row', { style: { gap: '18px' } },
          h('div.tut-tap', bub(h, '2 × 3', { n: 1 })), bub(h, '3 + 4', { n: 2 }), bub(h, '9', { n: 3 }))),
    },
    {
      say: 'Here is the twist: every third round the arrow flips and the bubbles turn pink. Then pop from largest to smallest.',
      demo: (h) => h('div.br-t.flip.tut-col', h('style', CSS), dir(h, true),
        h('div.tut-row', { style: { gap: '18px' } },
          bub(h, '9', { n: 1 }), bub(h, '3 + 4', { n: 2 }), bub(h, '2 × 3', { n: 3 }))),
    },
    {
      say: 'Pop one out of order and all the bubbles come back, so the round starts over. Quick clean rounds earn a speed bonus.',
      demo: (h) => h('div.br-t.tut-row', h('style', CSS),
        bub(h, '9', { cls: '.bad' }), h('span.tut-note', 'oops, too big'), h('div.tut-box.good', '+ speed')),
    },
  ],
};
