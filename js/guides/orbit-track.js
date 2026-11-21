// Guide for Orbit Tracker: professor's tips and the "How to play" steps.
const css = `
  .ott-box { width: 300px; height: 130px; border: 1px solid var(--edge); border-radius: 12px; background: var(--sheet); }
  .ott-box circle.ott-orb { fill: var(--ink-soft); }
  .ott-box circle.ott-t { fill: var(--c); stroke: var(--c); }
  .ott-glow { animation: ottGlow 1s ease-in-out infinite alternate; }
  @keyframes ottGlow { from { stroke-width: 2; } to { stroke-width: 7; } }
  .ott-a { animation: ottA 3s ease-in-out infinite alternate; }
  .ott-b { animation: ottB 3.4s ease-in-out infinite alternate; }
  .ott-c { animation: ottC 2.8s ease-in-out infinite alternate; }
  @keyframes ottA { to { transform: translate(90px, 40px); } }
  @keyframes ottB { to { transform: translate(-80px, 30px); } }
  @keyframes ottC { to { transform: translate(40px, -45px); } }
  .ott-fog { fill: rgb(170,180,205); }
  .ott-dive { animation: ottDive 2.6s linear infinite; }
  @keyframes ottDive { from { transform: translateY(-50px); } to { transform: translateY(50px); } }
  .ott-pick { stroke: var(--ink); stroke-width: 3; }
  .ott-dots { display: flex; gap: 6px; }
  .ott-dots i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--c); }
  .ott-dots i.on { background: var(--c); }
  @media (prefers-reduced-motion: reduce) { .ott-a, .ott-b, .ott-c, .ott-dive { animation-duration: 6s; } }
`;

const orb = (h, x, y, cls = '') => h('circle.ott-orb' + cls, { cx: x, cy: y, r: 11 });
const board = (h, ...kids) => h('svg.ott-box', { viewBox: '0 0 300 130' }, ...kids);

export default {
  tips: {
    low: [
      'Track fewer, not more: if you lose one orb, let it go and hold on to the rest.',
      'Do not chase each orb with your eyes. Look at the middle of your group and see it as one shape.',
    ],
    mid: [
      'Good tracking! When an orb enters the fog, guess where it will come out from its direction.',
      'A perfect round adds an extra target, so a steady streak makes the game harder fast.',
    ],
    high: [
      'Brilliant radar. Five orbs through the fog is no small thing.',
      'Outstanding! Your eyes are steadier than my flying saucer.',
    ],
  },
  tutorial: [
    {
      say: 'At the start some orbs glow. Those are yours: remember them.',
      demo: (h) => h('div.tut-col', h('style', css),
        board(h, orb(h, 50, 40), orb(h, 120, 95, '.ott-t.ott-glow'), orb(h, 180, 35), orb(h, 250, 90, '.ott-t.ott-glow'), orb(h, 230, 30)),
        h('span.tut-muted', 'Watch the 2 glowing orbs')),
    },
    {
      say: 'Then they all look the same and swirl around. Keep your eyes on yours.',
      demo: (h) => h('div.tut-col', h('style', css),
        board(h, h('g.ott-a', orb(h, 50, 40)), h('g.ott-b', orb(h, 250, 90)), h('g.ott-c', orb(h, 150, 100)), h('g.ott-b', orb(h, 200, 30)))),
    },
    {
      say: 'Here is the twist: orbs vanish inside the fog bands. Keep tracking them blind until they pop out.',
      demo: (h) => h('div.tut-col', h('style', css),
        board(h,
          h('g.ott-dive', orb(h, 150, 65)),
          h('rect.ott-fog', { x: 0, y: 45, width: 300, height: 40 }),
          orb(h, 60, 20), orb(h, 240, 110)),
        h('span.tut-muted', 'Hidden, but still moving')),
    },
    {
      say: 'When they stop, tap the orbs you tracked. Each one scores 5, and a perfect round adds 10.',
      demo: (h) => h('div.tut-col', h('style', css),
        board(h, orb(h, 50, 40), orb(h, 120, 95, '.ott-t.ott-pick'), orb(h, 180, 35), orb(h, 250, 90), orb(h, 230, 30)),
        h('div.ott-dots', h('i.on'), h('i'))),
    },
  ],
};
