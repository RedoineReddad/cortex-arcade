// Guide for Triangle Twist: professor's tips and the "How to play" steps.
const CSS = `
  .tt-t-tri { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .tt-t-row { display: flex; gap: 6px; }
  .tt-t-cell { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 8px; font-weight: 700; font-size: 1.1rem;
    border: 2px solid var(--edge); background: var(--sheet); color: var(--ink); }
  .tt-t-cell.top { background: color-mix(in srgb, var(--c) 14%, var(--sheet)); border-color: color-mix(in srgb, var(--c) 55%, var(--sheet)); }
  .tt-t-cell.add { border: 2px dashed var(--c); background: color-mix(in srgb, var(--c) 10%, var(--sheet)); }
  .tt-t-cell.sub { border: 2px dashed var(--pen); background: color-mix(in srgb, var(--pen) 10%, var(--sheet)); }
  .tt-t-cell.ask { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 30%, transparent); color: var(--c); }
  .tt-t-new { animation: tt-t-in 2.4s ease-out infinite; }
  @keyframes tt-t-in { 0%, 100% { opacity: 1; } 15% { opacity: .15; } 40% { opacity: 1; } }
  .tt-t-key { color: var(--c); font-weight: 700; }
  .tt-t-key.sub { color: var(--pen); }
  @media (prefers-reduced-motion: reduce) { .tt-t-new { animation: none; } }
`;
const cell = (h, v, cls = '') => h('div.tt-t-cell' + cls, v);
const row = (h, vals, cls) => h('div.tt-t-row', vals.map((v) => cell(h, v, cls)));

export default {
  tips: {
    low: [
      'Work one row at a time and say each new number in your head. Do not try to jump straight to the bottom.',
      'Check the colour before you combine: blue rows add, red rows take the right number away from the left.',
      'In a red row the order matters. 3 next to 8 makes 3 − 8 = −5, so press ± for a minus answer.',
    ],
    mid: [
      'A wrong answer costs 3 points, so one quick check beats a fast guess.',
      'Big numbers in a blue row? Add the tens first, then the ones.',
      'Three numbers on top with one blue and one red row? The middle number cancels out, so the answer is just left − right.',
    ],
    high: [
      'Triangles toppled in record time. Marvellous!',
      'Superb. Bigger triangles come next, so keep that steady row-by-row rhythm.',
    ],
  },
  tutorial: [
    {
      say: 'Each pair of neighbours makes the number below it, row after row, until one number is left at the bottom.',
      demo: (h) => h('div.tt-t-tri', h('style', CSS),
        row(h, [3, 5, 2], '.top'),
        h('div.tt-t-row', cell(h, 8, '.add.tt-t-new'), cell(h, 7, '.add.tt-t-new')),
        h('span.tut-muted', '3 + 5 = 8 · 5 + 2 = 7')),
    },
    {
      say: 'Here is the twist: blue rows add, but red rows subtract, always left minus right.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.tt-t-tri', row(h, [3, 5, 2], '.top'), row(h, [8, 7], '.add'), cell(h, 1, '.sub.tt-t-new')),
        h('div.tut-col', { style: { alignItems: 'flex-start' } },
          h('span', h('b.tt-t-key', 'blue'), ': 3 + 5 = 8'),
          h('span', h('b.tt-t-key.sub', 'red'), ': 8 − 7 = 1'))),
    },
    {
      say: 'Do the middle rows in your head and type only the bottom number. Press ± or the minus key for answers below zero.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.tt-t-tri', row(h, [2, 9, 4], '.top'), row(h, ['', ''], '.sub'), cell(h, '?', '.add.ask')),
        h('div.tut-col', h('div.tut-row', h('div.tut-box', '±'), h('div.tut-box', '2'), h('div.tut-box.on', '⏎')), h('span.tut-note', '−7 + 5 = −2'))),
    },
    {
      say: 'A right answer scores 10 points. A wrong one loses 3 and shows you the whole triangle. You have one minute.',
      demo: (h) => h('div.tut-row', h('div.tut-box.good', '+10'), h('div.tut-box.bad', '−3'), h('div.tut-box', '⏱ 1:00')),
    },
  ],
};
