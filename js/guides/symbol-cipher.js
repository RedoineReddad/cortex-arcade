// Guide for Glyph Cipher: professor's tips and the "How to play" steps.

const G = {
  tri: { d: 'M12 3 L21 20 H3 Z', dot: [12, 14.5] },
  eye: { d: 'M2 12 Q12 2 22 12 Q12 22 2 12 Z', ring: [12, 12, 3] },
  bolt: { d: 'M14 2 L6 13 H12 L10 22 L18 10 H12 Z' },
  moon: { d: 'M15 3 A9 9 0 1 0 21 16 A7 7 0 1 1 15 3 Z' },
};
const KEY = [['tri', 4], ['eye', 7], ['bolt', 2], ['moon', 9]];

function glyph(h, name, size) {
  const g = G[name];
  return h('svg.scg-glyph', { viewBox: '0 0 24 24', width: size, height: size },
    h('path', { d: g.d }),
    g.dot ? h('circle.scg-dot', { cx: g.dot[0], cy: g.dot[1], r: 1.8 }) : null,
    g.ring ? h('circle', { cx: g.ring[0], cy: g.ring[1], r: g.ring[2] }) : null);
}

function key(h) {
  return h('div.scg-key', KEY.map(([n, d]) => h('div.scg-pair', glyph(h, n, 30), h('span', String(d)))));
}

const STYLE = `
  .scg-glyph path, .scg-glyph circle { fill: none; stroke: var(--ink); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .scg-glyph circle.scg-dot { fill: var(--ink); stroke: none; }
  .scg-key { display: flex; gap: 4px; padding: 4px; border: 2px solid var(--edge); border-radius: 8px; background: var(--sheet); }
  .scg-pair { display: flex; flex-direction: column; align-items: center; width: 40px; padding: 2px 0; }
  .scg-pair span { font-weight: 700; color: var(--c); border-top: 1px solid var(--edge); width: 70%; text-align: center; }
  .scg-big { width: 64px; height: 64px; display: grid; place-items: center; border: 3px solid var(--c); border-radius: 12px; background: var(--sheet); }
  .scg-flip { perspective: 600px; }
  .scg-card { position: relative; transform-style: preserve-3d; animation: scg-flip 4s ease-in-out infinite; }
  .scg-card > * { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .scg-back { position: absolute; inset: 0; transform: rotateY(180deg); display: grid; place-items: center; border: 2px solid var(--c); border-radius: 8px;
    background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--c) 22%, var(--sheet)) 0 8px, var(--sheet) 8px 16px); font-weight: 700; }
  @keyframes scg-flip { 0%, 30% { transform: none; } 45%, 85% { transform: rotateY(180deg); } 100% { transform: none; } }
  @media (prefers-reduced-motion: reduce) { .scg-card { animation: none; transform: rotateY(180deg); } }
`;

export default {
  tips: {
    low: [
      'Look at the glyph first, then scan the key from left to right. Darting about makes you miss it.',
      'A wrong answer takes points away, so a slow right answer beats a fast guess.',
    ],
    mid: [
      'While the key is showing, say a couple of pairs to yourself, like "moon is 9". They pay double when the key hides.',
      'Keep one hand on the number keys of your keyboard. Typing is quicker than tapping.',
    ],
    high: [
      'You decode like a spy! On harder levels the key comes back in a new order, so learn shapes, not places.',
      'Brilliant memory. Those double points add up fast.',
    ],
  },
  tutorial: [
    {
      say: 'A glyph appears in the middle. Find it in the key and read the digit underneath.',
      demo: (h) => h('div.tut-col', h('style', STYLE), key(h),
        h('div.tut-row', h('div.scg-big', glyph(h, 'eye', 44)), h('span.tut-note', '= 7'))),
    },
    {
      say: 'Tap that digit on the pad, or type it on your keyboard. A new glyph appears straight away.',
      demo: (h) => h('div.tut-col', h('style', STYLE),
        h('div.tut-row', h('div.scg-big', glyph(h, 'eye', 44))),
        h('div.tut-row', ['5', '6'].map((d) => h('div.tut-box', d)), h('div.tut-box.on.tut-tap', '7'), h('div.tut-box', '8'))),
    },
    {
      say: 'Here is the twist: every so often the key flips face down. Answer from memory and every right answer scores double.',
      demo: (h) => h('div.tut-col', h('style', STYLE),
        h('div.scg-flip', h('div.scg-card', key(h), h('div.scg-back', 'Key hidden · ×2'))),
        h('div.tut-row', h('div.scg-big', glyph(h, 'bolt', 44)), h('span.tut-note', '2, from memory'))),
    },
    {
      say: 'A wrong answer costs 3 points. You have one minute, so be quick but careful.',
      demo: (h) => h('div.tut-row',
        h('div.tut-box.good', '+3'), h('div.tut-box.good', '+6 hidden'), h('div.tut-box.bad', '−3 wrong')),
    },
  ],
};
