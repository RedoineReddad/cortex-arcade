// Guide for Color Clash: professor's tips and the "How to play" steps.
const RED = '#e0323c';

const css = `
  .clt-card { display: grid; place-items: center; width: 190px; height: 92px; border-radius: 14px; background: var(--sheet);
    border: 6px solid var(--ink); font-weight: 800; font-size: 2rem; letter-spacing: .04em; }
  .clt-card.clt-dash { border-style: dashed; }
  .clt-tag { font-size: .8rem; font-weight: 700; color: var(--ink-soft); }
  .clt-sw { display: inline-block; width: 16px; height: 16px; border-radius: 50%; margin-right: 6px; vertical-align: -2px; }
  .tut-box.clt-btn { display: flex; align-items: center; gap: 2px; }
  .clt-arrow { font-size: 1.6rem; color: var(--ink-soft); }
`;

const sw = (h, c) => h('span.clt-sw', { style: { background: c } });
const card = (h, word, dashed) => h('div.clt-card' + (dashed ? '.clt-dash' : ''), { style: { color: RED } }, word);

export default {
  tips: {
    low: [
      'Look at the frame first, then the word. Solid means ink, dashed means word.',
      'Do not read the word on a solid frame. Squint a little and just name the colour.',
      'A wrong tap costs more than a slow one, so take half a second to be sure.',
    ],
    mid: [
      'Nice work! Rest your fingers on keys 1 to 6 so you never hunt for a button.',
      'The buttons move around on harder levels, so read the label, not the spot.',
    ],
    high: [
      'Splendid. Your brain ignores the word like a pro now.',
      'Top marks! Next time there are more colours, so keep that frame check quick.',
    ],
  },
  tutorial: [
    {
      say: 'A colour word appears, printed in some ink. Tap the matching colour button, or press its number key.',
      demo: (h) => h('div.tut-col', h('style', css),
        card(h, 'BLUE', false),
        h('div.tut-row',
          h('div.tut-box.clt-btn.tut-tap', sw(h, RED), 'RED', h('span.tut-muted', ' 1')),
          h('div.tut-box.clt-btn', sw(h, '#3b7bff'), 'BLUE', h('span.tut-muted', ' 2')))),
    },
    {
      say: 'A solid frame means: name the INK colour. This word says blue, but the ink is red.',
      demo: (h) => h('div.tut-row', h('style', css),
        h('div.tut-col', h('span.clt-tag', 'Solid frame → ink'), card(h, 'BLUE', false)),
        h('span.clt-arrow', '→'),
        h('div.tut-box.clt-btn.good', sw(h, RED), 'RED')),
    },
    {
      say: 'Here is the twist: a dashed frame means name what the WORD says. Same card, new answer!',
      demo: (h) => h('div.tut-row', h('style', css),
        h('div.tut-col', h('span.clt-tag', 'Dashed frame → word'), card(h, 'BLUE', true)),
        h('span.clt-arrow', '→'),
        h('div.tut-box.clt-btn.good', sw(h, '#3b7bff'), 'BLUE')),
    },
    {
      say: 'Each right answer scores 10, plus a bonus for speed. A wrong one costs 5. You have 45 seconds.',
      demo: (h) => h('div.tut-row', h('div.tut-box', '⏱ 0:45'), h('div.tut-box.good', '+10'), h('div.tut-box.bad', '−5')),
    },
  ],
};
