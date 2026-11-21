// Guide for Vowel Vanish: professor's tips and the "How to play" steps.

const CSS = `
  .vvg-hint { padding: 3px 12px; border-radius: 99px; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); font-weight: 700; font-size: .8rem; letter-spacing: .04em; text-transform: uppercase; }
  .vvg-word .tut-box { min-width: 38px; padding: 0 4px; }
  .vvg-gap { border-style: dashed !important; color: var(--c); }
  .vvg-cur { border-color: var(--c) !important; border-style: solid !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 30%, transparent); }
  .vvg-skel { font-size: 2rem; font-weight: 800; letter-spacing: .18em; }
  .vvg-opts { display: grid; grid-template-columns: repeat(2, minmax(110px, 1fr)); gap: 6px; }
  .vvg-pop { animation: vvg-pop 2.4s ease-in-out infinite; }
  @keyframes vvg-pop { 0%, 40% { color: transparent; } 55%, 100% { color: var(--good); border-color: var(--good); } }
`;

const word = (h, letters, opts = {}) => h('div.tut-row.vvg-word', letters.map((c, i) => {
  if (c !== '_' && !(opts.fill && opts.fill[i])) return h('div.tut-box', c);
  const cls = i === opts.cur ? '.vvg-gap.vvg-cur' : opts.fill && opts.fill[i] ? '.vvg-gap.vvg-pop' : '.vvg-gap';
  return h('div.tut-box' + cls, opts.fill && opts.fill[i] ? opts.fill[i] : ' ');
}));

export default {
  tips: {
    low: [
      'Read the category first, then say the consonants out loud. The word often pops out.',
      'Fill the gaps from left to right. A wrong vowel only costs a little, so trust your first idea.',
    ],
    mid: [
      'Think of a short list of words from the category, then match their consonants to the skeleton.',
      'When the gaps vanish, look at the first two consonants of each choice before reading the whole word.',
    ],
    high: [
      'Splendid spelling! You see words even with half the letters gone.',
      'Top marks. Keep your fingers near A, E, I, O and U on the keyboard for an even faster round.',
    ],
  },
  tutorial: [
    {
      say: 'Each word has lost its vowels. The hint tells you what kind of word it is.',
      demo: (h) => h('div.tut-col', h('style', CSS), h('span.vvg-hint', 'fruit'), word(h, ['L', '_', 'M', '_', 'N'], { cur: 1 })),
    },
    {
      say: 'Fill the gaps from left to right: tap A, E, I, O or U, or type them on your keyboard.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        word(h, ['L', 'E', 'M', '_', 'N'], { fill: { 3: 'O' } }),
        h('div.tut-row', [...'AEIOU'].map((v) => h('div.tut-box' + (v === 'O' ? '.on.tut-tap' : ''), v)))),
    },
    {
      say: 'Here is the twist: later the gaps vanish too. Match the consonants to a word, then tap it or press 1 to 4.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.tut-row', h('span.vvg-hint', 'animal'), h('div.vvg-skel', 'MNKY')),
        h('div.vvg-opts', ['MONKEY', 'DONKEY', 'MOOSE', 'TURKEY'].map((w, i) => h('div.tut-box' + (i === 0 ? '.good' : ''), `${i + 1} ${w}`)))),
    },
    {
      say: 'Quick answers earn a speed bonus. Miss the same gap three times and I will fill it in for you.',
      demo: (h) => h('div.tut-row', h('div.tut-box', '⏱ 1:00'), h('div.tut-box.good', '+15'), h('span.tut-note', 'speed bonus')),
    },
  ],
};
