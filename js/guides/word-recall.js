// Guide for Word Vault: professor's tips and the "How to play" steps.

const CSS = `
  .wr-t-grid { display:grid; grid-template-columns:repeat(3, minmax(78px, 1fr)); gap:6px; }
  .wr-t-w { min-height:36px; padding:0 8px; display:grid; place-items:center; border:2px solid var(--edge);
    border-radius:var(--r2); background:var(--sheet); font-weight:700; }
  .wr-t-w.on { border-color:var(--c); background:color-mix(in srgb, var(--c) 18%, var(--sheet)); }
  .wr-t-w.good { border-color:var(--good); color:var(--good); }
  .wr-t-w.bad { border-color:var(--pen); color:var(--pen); text-decoration:line-through; }
  .wr-t-btn { padding:6px 20px; border-radius:99px; background:var(--c); color:var(--c-ink); font-weight:700; }
  .wr-t-pair { display:flex; flex-direction:column; align-items:center; gap:4px; }
`;

const word = (h, w, cls = '') => h('div.wr-t-w' + cls, w);

export default {
  tips: {
    low: [
      'Link the words into a silly story: the cat drank from a mug on a boat. A story sticks far better than a list.',
      'Before you tap a word, ask yourself: did I see this exact word, or only its cousin?',
    ],
    mid: [
      'Use the whole study time. Picture each word as a little scene instead of just reading it.',
      'A wrong pick costs almost as much as a find earns, so leave out the words you are unsure of.',
    ],
    high: [
      'A memory like a bank vault. Not a single cousin got past you.',
      'Superb. The list gets longer next time, so keep building those stories.',
    ],
  },
  tutorial: [
    {
      say: 'First you study a list of words. Press Ready when you have them, or wait for the bar to run out.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.wr-t-grid', ['apple', 'violin', 'river', 'boot', 'crow', 'lemon'].map((w) => word(h, w))),
        h('div.wr-t-btn', 'Ready')),
    },
    {
      say: 'Here is the twist: every word comes back next to a close cousin, like pear next to apple.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        [['apple', 'pear'], ['violin', 'cello'], ['crow', 'raven']].map(([a, b]) =>
          h('div.wr-t-pair', word(h, a), h('span.tut-muted', 'or'), word(h, b)))),
    },
    {
      say: 'Tap every word you studied, then press Done. On a keyboard, Tab to a word and press Enter or Space.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.wr-t-grid', word(h, 'pear'), word(h, 'apple', '.on'), word(h, 'cello'),
          word(h, 'raven'), h('div.wr-t-w.tut-tap', 'violin'), word(h, 'crow', '.on')),
        h('div.wr-t-btn', 'Done')),
    },
    {
      say: 'Each word you find scores 10 points and each wrong pick loses 8. Only tap what you really remember.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.tut-col', word(h, 'apple', '.good'), h('span.tut-note', '+10')),
        h('div.tut-col', word(h, 'cello', '.bad'), h('span.tut-note', '−8')),
        h('div.tut-col', h('div.wr-t-w', { style: { borderStyle: 'dashed', borderColor: 'var(--good)' } }, 'crow'), h('span.tut-muted', 'missed: 0'))),
    },
  ],
};
