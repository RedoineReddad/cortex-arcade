// Guide for Trail Mix: professor's tips and the "How to play" steps.

// A tiny board of dots for the demos: [label, x%, y%, done?, moves?]
function board(h, dots, extra) {
  return h('div.tmg-board', extra, dots.map(([lab, x, y, done, moves], i) =>
    h('div.tmg-dot' + (i % 2 ? '.tmg-let' : '') + (done ? '.tmg-done' : '') + (moves ? '.tmg-move' + moves : ''),
      { style: { left: x + '%', top: y + '%' } }, lab)));
}

const STYLE = `
  .tmg-board { position: relative; width: min(300px, 76vw); height: 150px; border: 1px solid var(--edge); border-radius: 8px; background: var(--sheet); }
  .tmg-dot { position: absolute; width: 38px; height: 38px; margin: -19px 0 0 -19px; display: grid; place-items: center; border-radius: 50%;
    border: 3px solid var(--c); background: var(--sheet); color: var(--ink); font-weight: 700; }
  .tmg-dot.tmg-let { border-radius: 30%; }
  .tmg-dot.tmg-done { background: var(--c); color: var(--c-ink); }
  .tmg-board svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .tmg-board polyline { fill: none; stroke: var(--c); stroke-width: 3; vector-effect: non-scaling-stroke; }
  .tmg-move1 { animation: tmg-m1 3s ease-in-out infinite; }
  .tmg-move2 { animation: tmg-m2 3s ease-in-out infinite; }
  .tmg-move3 { animation: tmg-m3 3s ease-in-out infinite; }
  @keyframes tmg-m1 { 0%, 30% { transform: none; } 50%, 100% { transform: translate(-204px, 95px); } }
  @keyframes tmg-m2 { 0%, 30% { transform: none; } 50%, 100% { transform: translate(24px, -22px); } }
  @keyframes tmg-m3 { 0%, 30% { transform: none; } 50%, 100% { transform: translate(60px, -98px); } }
  @media (prefers-reduced-motion: reduce) { .tmg-move1, .tmg-move2, .tmg-move3 { animation: none; } }
`;

export default {
  tips: {
    low: [
      'Say the next two targets in your head, like "3, then C", so you are never hunting for both at once.',
      'A wrong tap costs a full second. One careful look is faster than two quick guesses.',
      'After the reshuffle, don\'t panic: the dots you already joined stay put, only the rest move.',
    ],
    mid: [
      'While your finger moves to one dot, let your eyes already search for the next.',
      'Right before the halfway dot, take a breath. The board is about to jump, so find your next target fresh.',
    ],
    high: [
      'Zippy trails! On harder boards the upcoming labels hide, so keep the count running in your head.',
      'Superb. Next time there are more dots, so keep that number-letter rhythm going.',
    ],
  },
  tutorial: [
    {
      say: 'Join the dots in order, switching between numbers and letters: 1, A, 2, B, 3, C and so on.',
      demo: (h) => h('div.tut-col',
        h('style', STYLE),
        h('div.tut-row', { style: { gap: '4px', flexWrap: 'nowrap' } },
          h('div.tut-box.on', '1'), '→', h('div.tut-box.on', 'A'), '→', h('div.tut-box.on', '2'), '→',
          h('div.tut-box.tut-tap', 'B'), '→', h('div.tut-box', '3')),
        h('span.tut-muted', 'numbers are circles, letters are rounded squares')),
    },
    {
      say: 'Tap each dot on the board, or press Tab to reach it and Enter to pick it. A trail grows behind you.',
      demo: (h) => h('div', h('style', STYLE),
        board(h, [['1', 15, 25, true], ['A', 45, 70, true], ['2', 80, 30, false], ['B', 60, 20], ['3', 25, 75]],
          h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, h('polyline', { points: '15,25 45,70' })))),
    },
    {
      say: 'Here is the twist: at halfway, every dot you have not reached yet jumps to a new place. Your trail stays put.',
      demo: (h) => h('div', h('style', STYLE),
        board(h, [['1', 12, 30, true], ['A', 35, 70, true], ['2', 55, 30, true], ['B', 88, 25, false, 1], ['3', 80, 75, false, 2], ['C', 55, 80, false, 3]],
          h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, h('polyline', { points: '12,30 35,70 55,30' })))),
    },
    {
      say: 'A wrong dot adds one second to your time. Finish three boards as fast and cleanly as you can.',
      demo: (h) => h('div.tut-col',
        h('div.tut-row', h('div.tut-box.bad', 'C'), h('span.tut-note', '+1 s')),
        h('div.tut-row', h('div.tut-box', '⏱ 0:31'), h('div.tut-box.good', '3 / 3 boards'))),
    },
  ],
};
