// Guide for Blind Walk: professor's tips and the "How to play" steps.

// A small grid. opts: {n, start:[r,c], face:0..3 (N,E,S,W), path:[[r,c],...], mark:[r,c], cls}
function grid(h, { n = 4, start, face = 0, path, mark, tokCls = '' }) {
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const isStart = start && start[0] === r && start[1] === c;
    const isMark = mark && mark[0] === r && mark[1] === c;
    cells.push(h('div.bwg-cell' + (isMark ? '.bwg-mark.tut-tap' : ''),
      isStart ? h('div.bwg-tok' + tokCls, h('span', { style: { transform: `rotate(${face * 90}deg)` } }, '↑')) : null));
  }
  const svg = path ? h('svg.bwg-svg', { viewBox: `0 0 ${n} ${n}` }, h('polyline', { points: path.map(([r, c]) => `${c + 0.5},${r + 0.5}`).join(' ') })) : null;
  return h('div.bwg-board', { style: { gridTemplateColumns: `repeat(${n}, 1fr)` } }, cells, svg);
}

const STYLE = `
  .bwg-board { position: relative; display: grid; gap: 3px; width: 128px; height: 128px; }
  .bwg-cell { position: relative; border: 1px solid var(--edge); border-radius: 5px; background: var(--sheet); }
  .bwg-cell.bwg-mark { border-color: var(--good); background: color-mix(in srgb, var(--good) 30%, var(--sheet)); }
  .bwg-tok { position: absolute; inset: 10%; border-radius: 50%; background: var(--c); color: var(--c-ink); display: grid; place-items: center; font-weight: 700; }
  .bwg-tok span { display: block; }
  .bwg-turn span { animation: bwg-turn 3s ease-in-out infinite; }
  @keyframes bwg-turn { 0%, 35% { transform: rotate(90deg); } 60%, 100% { transform: rotate(0deg); } }
  .bwg-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .bwg-svg polyline { fill: none; stroke: var(--c); stroke-width: .12; stroke-linecap: round; stroke-linejoin: round; opacity: .8; }
  .bwg-steps { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
  .bwg-steps .tut-box { font-size: 1rem; }
  @media (prefers-reduced-motion: reduce) { .bwg-turn span { animation: none; } }
`;

export default {
  tips: {
    low: [
      'Keep your finger hovering over the board and move it a square at a time as each step appears.',
      'Before the steps start, say out loud which way the walker faces. That one word makes "Turn left" easy.',
    ],
    mid: [
      'Remember the walker turns to face every way it walks. After "→ 2", a "Forward" keeps heading right.',
      'For "Turn left", picture yourself standing on the token and holding out your left arm.',
    ],
    high: [
      'Sharp sense of direction! Later rounds use longer walks on bigger grids, so keep that calm focus.',
      'Superb navigating. You could find your way out of any maze, even with your eyes shut.',
    ],
  },
  tutorial: [
    {
      say: 'The walker starts on the green token. Its arrow shows which way it is facing. Then the steps flash up, one at a time.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE),
        grid(h, { start: [2, 1], face: 1 }), h('div.bwg-steps', h('div.tut-box', '↑ 1'), h('div.tut-box.tut-blink', '→ 2'))),
    },
    {
      say: 'Arrows are map moves: ↑ is always up the board. The walker also turns to face the way it walks.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE),
        grid(h, { start: [2, 1], face: 1, path: [[2, 1], [1, 1], [1, 3]] }),
        h('div.bwg-steps', h('div.tut-box', '↑ 1'), h('div.tut-box', '→ 2'), h('span.tut-muted', 'now facing →'))),
    },
    {
      say: 'Here is the twist: coloured steps like "Turn left" and "Forward 2" depend on which way the walker faces right now.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE),
        grid(h, { start: [3, 1], face: 0, tokCls: '.bwg-turn', path: [[3, 1], [1, 1]] }),
        h('div.bwg-steps', h('span.tut-muted', 'facing →'), h('div.tut-box', { style: { color: 'var(--c)' } }, 'Turn left ↺'),
          h('div.tut-box', { style: { color: 'var(--c)' } }, 'Forward 2'))),
    },
    {
      say: 'The walker never moves on screen, so picture it. Then tap the final square, or use the arrow keys and Enter.',
      demo: (h) => h('div.tut-row', { style: { gap: '18px' } }, h('style', STYLE),
        grid(h, { start: [3, 1], face: 0, mark: [1, 1] }), h('div.tut-col', h('div.tut-box.good', '✓ +10'), h('span.tut-muted', 'longer walks score more'))),
    },
  ],
};
