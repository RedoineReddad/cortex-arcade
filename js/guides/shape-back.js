// Guide for Shape Back: professor's tips and the "How to play" steps.
const RED = '#e0323c', BLUE = '#3b7bff';

const css = `
  .sbt-card { width: 64px; height: 64px; border: 2px solid var(--edge); border-radius: 10px; background: var(--sheet); display: grid; place-items: center; }
  .sbt-card svg { width: 46px; height: 46px; }
  .sbt-card.sbt-now { border-color: var(--ink); border-width: 3px; }
  .sbt-cap { font-size: .75rem; color: var(--ink-soft); text-align: center; }
  .sbt-cue { padding: 3px 14px; border-radius: 99px; font-weight: 900; letter-spacing: .06em; border: 3px solid var(--c); }
  .sbt-cue.sbt-col { border-color: #f97316; }
  .sbt-bar { width: 150px; height: 6px; border-radius: 99px; background: var(--rule); overflow: hidden; }
  .sbt-bar i { display: block; height: 100%; background: var(--c); transform-origin: left; animation: sbtBar 2.5s linear infinite; }
  @keyframes sbtBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
`;

function shape(h, kind, fill) {
  const el = kind === 'circle'
    ? h('circle', { cx: 0, cy: 0, r: 40, fill })
    : h('rect', { x: -36, y: -36, width: 72, height: 72, rx: 6, fill });
  return h('svg', { viewBox: '-50 -50 100 100' }, el);
}
const card = (h, kind, fill, cap, now) => h('div.tut-col', { style: { gap: '4px' } },
  h('div.sbt-card' + (now ? '.sbt-now' : ''), shape(h, kind, fill)), h('span.sbt-cap', cap));

export default {
  tips: {
    low: [
      'Read the cue before you look at the card. It tells you to compare shape or colour.',
      'Say the card out loud in your head, like "red circle". Words are easier to hold than pictures.',
    ],
    mid: [
      'Nice memory! Watch for traps: the same colour on a SHAPE card is not a match.',
      'In 2-back mode, keep a little two-card queue in your head and drop the oldest each time.',
    ],
    high: [
      'Excellent. Your working memory is in top shape today.',
      'Superb switching between shape and colour. Next time the cards come faster.',
    ],
  },
  tutorial: [
    {
      say: 'Cards come one at a time. Compare each new card with the one before it (later, with the one two back).',
      demo: (h) => h('div.tut-row', h('style', css),
        card(h, 'circle', RED, 'before'), h('span.tut-big', '→'), card(h, 'circle', BLUE, 'now', true)),
    },
    {
      say: 'The cue says what counts. On SHAPE, both are circles, so it is a Match even though the colours differ.',
      demo: (h) => h('div.tut-col', h('style', css),
        h('div.sbt-cue', '◆ SHAPE'),
        h('div.tut-row', card(h, 'circle', RED, 'before'), card(h, 'circle', BLUE, 'now', true), h('div.tut-box.good', '✓ Match'))),
    },
    {
      say: 'Here is the twist: the cue keeps switching. On COLOUR the same two cards are No match.',
      demo: (h) => h('div.tut-col', h('style', css),
        h('div.sbt-cue.sbt-col', '🎨 COLOUR'),
        h('div.tut-row', card(h, 'circle', RED, 'before'), card(h, 'circle', BLUE, 'now', true), h('div.tut-box.bad', '✗ No match'))),
    },
    {
      say: 'Press → or J for Match and ← or F for No match, or tap the buttons. Answer before the bar runs out.',
      demo: (h) => h('div.tut-col', h('style', css),
        h('div.sbt-bar', h('i')),
        h('div.tut-row', h('div.tut-box', '✗ No match  ← F'), h('div.tut-box.on', '✓ Match  → J'))),
    },
  ],
};
