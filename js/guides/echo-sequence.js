// Guide for Backwards Echo: professor's tips and the "How to play" steps.

const PADS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

const CSS = `
  .es-t { --es-t-fwd:#15803d; --es-t-rev:#c2410c; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .es-t { --es-t-fwd:#4ade80; --es-t-rev:#fb923c; } }
  .es-t-frame { display:flex; gap:6px; padding:8px 12px; border:5px solid var(--es-t-fwd); border-radius:999px; background:var(--sheet); }
  .es-t-frame.rev { border-color:var(--es-t-rev); }
  .es-t-pad { width:40px; height:40px; border-radius:50%; display:grid; place-items:center; font-weight:700;
    border:3px solid color-mix(in srgb, var(--pc) 70%, #000); background:color-mix(in srgb, var(--pc) 40%, var(--sheet)); color:var(--ink); }
  .es-t-pad.lit { background:var(--pc); color:#14171c; }
  .es-t-blink { animation:esTBlink 2.4s steps(1) infinite; }
  @keyframes esTBlink { 0% { background:var(--pc); } 22%, 100% { background:color-mix(in srgb, var(--pc) 40%, var(--sheet)); } }
  .es-t-lab { font-weight:700; letter-spacing:.06em; color:var(--es-t-fwd); }
  .es-t-lab.rev { color:var(--es-t-rev); }
  .es-t .tut-col, .tut-col.es-t { gap:6px; }
  .es-t .tut-muted { min-width:58px; text-align:right; }
  .es-t-seq { display:flex; gap:6px; align-items:center; font-weight:700; }
  @media (prefers-reduced-motion: reduce) { .es-t-blink { animation:none; } }
`;

const pad = (h, i, cls = '', style = {}) => h('div.es-t-pad' + cls, { style: { '--pc': PADS[i], ...style } }, String(i + 1));
const seq = (h, list) => h('div.es-t-seq', list.map((i) => pad(h, i, '.lit')));

export default {
  tips: {
    low: [
      'Say the pad numbers to yourself as they play: 2, 5, 3. Numbers are easier to hold on to than colours.',
      'Check the frame before the melody starts. Orange means you play it backwards.',
    ],
    mid: [
      'On a reverse round, hold the whole melody first, then read it back from the end, like a word spelled backwards.',
      'Keys 1 to 8 are quicker than the mouse. Rest your fingers on them and let them follow the numbers.',
    ],
    high: [
      'A perfect echo, forwards and backwards. Your ears are on fire.',
      'Superb. Every right answer adds a note, so split long melodies into groups of three.',
    ],
  },
  tutorial: [
    {
      say: 'The pads light up one at a time and each plays a note. Watch and listen.',
      demo: (h) => h('div.es-t', h('style', CSS),
        h('div.es-t-frame', [0, 1, 2, 3, 4, 5].map((i) => pad(h, i, [1, 4, 2].includes(i) ? '.es-t-blink' : '',
          { animationDelay: { 1: '0s', 4: '.6s', 2: '1.2s' }[i] || '0s' })))),
    },
    {
      say: 'A green frame means forward: play the pads back in the same order.',
      demo: (h) => h('div.tut-col.es-t', h('style', CSS),
        h('div.es-t-lab', '▶ FORWARD'),
        h('div.tut-row', h('span.tut-muted', 'shown'), seq(h, [1, 4, 2])),
        h('div.tut-row', h('span.tut-muted', 'you play'), h('div.es-t-frame', seq(h, [1, 4, 2])))),
    },
    {
      say: 'Here is the twist: an orange frame means reverse. Play the melody from the last note back to the first.',
      demo: (h) => h('div.tut-col.es-t', h('style', CSS),
        h('div.es-t-lab.rev', '◀ REVERSE'),
        h('div.tut-row', h('span.tut-muted', 'shown'), seq(h, [1, 4, 2])),
        h('div.tut-row', h('span.tut-muted', 'you play'), h('div.es-t-frame.rev', seq(h, [2, 4, 1])))),
    },
    {
      say: 'Tap the pads or press keys 1 to 8. Three mistakes and the game is over, so take your time.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.tut-row', ['1', '2', '3', '4', '5'].map((k) => h('div.tut-box' + (k === '2' ? '.on' : ''), k))),
        h('div.tut-row', h('span.tut-big', { style: { color: 'var(--c)' } }, '♥♥♡'), h('span.tut-muted', 'lives left'))),
    },
  ],
};
