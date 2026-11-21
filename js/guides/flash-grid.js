// Guide for Spin Grid: professor's tips and the "How to play" steps.

const CSS = `
  .fg-t-board { position:relative; display:grid; grid-template-columns:repeat(3, 30px); gap:4px; padding:6px;
    border:2px solid var(--edge); border-radius:var(--r2); background:var(--sheet); }
  .fg-t-cell { width:30px; height:30px; border:2px solid var(--edge); border-radius:var(--r1); background:var(--sheet); }
  .fg-t-cell.on { background:var(--c); border-color:var(--c); }
  .fg-t-cell.good { background:var(--good); border-color:var(--good); }
  .fg-t-cell.bad { background:var(--pen); border-color:var(--pen); }
  .fg-t-cell.miss { border:2px dashed var(--good); }
  .fg-t-dot { position:absolute; width:12px; height:12px; border-radius:50%; background:var(--c);
    box-shadow:0 0 0 3px var(--sheet); left:-6px; top:-6px; }
  .fg-t-dot.tr { left:auto; right:-6px; }
  .fg-t-spin { animation:fgTSpin 3s cubic-bezier(.55,.05,.35,1) infinite; }
  @keyframes fgTSpin { 0%, 25% { rotate:0deg; scale:1; } 40% { scale:.75; } 55%, 100% { rotate:90deg; scale:1; } }
  @media (prefers-reduced-motion: reduce) { .fg-t-spin { animation:none; rotate:90deg; } }
`;

// lit = indices 0..8 on a 3×3 board; marks = { index: 'on' | 'good' | 'bad' | 'miss' }
// turned = the board after a quarter turn, so the corner dot sits top-right
const board = (h, marks, { cls = '', tap = -1, turned = false } = {}) => h('div.fg-t-board' + cls,
  [...Array(9).keys()].map((i) => h('div.fg-t-cell' + (marks[i] ? '.' + marks[i] : '') + (i === tap ? '.tut-tap' : ''))),
  h('div.fg-t-dot' + (turned ? '.tr' : '')));

// before the turn: tiles 0, 1, 5. A quarter turn clockwise sends them to 2, 5, 7.
const BEFORE = { 0: 'on', 1: 'on', 5: 'on' };

export default {
  tips: {
    low: [
      'Don\'t learn the tiles one by one. See them as one shape, like an L or a zigzag, and turn the whole shape in your head.',
      'Follow the coloured dot in the corner while the board turns. It shows you where the old top-left corner went.',
    ],
    mid: [
      'A quarter turn clockwise sends the top row down the right-hand side. Learn that one move and the rest follow.',
      'A half turn is the easy one: every tile simply jumps to the opposite side of the board.',
      'Give yourself a beat after the turn before tapping. One wrong tap ends the trial.',
    ],
    high: [
      'Spot on every time. You turn shapes in your head like a spinning satellite.',
      'Excellent. Bigger boards with more tiles come next, so keep grouping them into shapes.',
    ],
  },
  tutorial: [
    {
      say: 'A few tiles light up for a moment. Remember where they are.',
      demo: (h) => h('div.tut-col', h('style', CSS), board(h, BEFORE), h('span.tut-muted', 'Memorise these')),
    },
    {
      say: 'Here is the twist: the board turns before you answer. The dot in the corner turns with it.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        board(h, BEFORE), h('span.tut-note', '↻ 90°'), board(h, BEFORE, { cls: '.fg-t-spin' })),
    },
    {
      say: 'Now tap the tiles where they ended up. On a keyboard, move with the arrow keys and press Enter.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        board(h, { 2: 'good', 7: 'good' }, { tap: 5, turned: true }),
        h('div.tut-col', h('div.tut-row', h('div.tut-box', '←'), h('div.tut-box', '→')), h('div.tut-box', 'Enter'))),
    },
    {
      say: 'Find them all and the next board gets one more tile. One wrong tap ends the trial and shows what you missed.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.tut-col', board(h, { 2: 'good', 5: 'good', 7: 'good' }, { turned: true }), h('span.tut-muted', 'All found: +1 tile')),
        h('div.tut-col', board(h, { 2: 'good', 4: 'bad', 5: 'miss', 7: 'miss' }, { turned: true }), h('span.tut-muted', 'Wrong tap: −1 tile'))),
    },
  ],
};
