// Guide for Pattern Sleuth: professor's tips and the "How to play" steps.

const CSS = `
  .psg-seq { display: flex; gap: 4px; align-items: flex-end; justify-content: center; }
  .psg-t { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .psg-t .tut-box { min-width: 36px; padding: 0 4px; }
  .psg-gap { height: 1.1em; font-size: .8rem; font-weight: 700; color: var(--ink-soft); }
  .psg-a .tut-box { border-color: var(--c); color: var(--c); background: color-mix(in srgb, var(--c) 14%, var(--sheet)); }
  .psg-a .psg-gap { color: var(--c); }
  .psg-q .tut-box { border-style: dashed; border-color: var(--c); color: var(--c); }
`;

/** A row of terms. gaps[i] is written above term i; cls(i) adds a class to term i. */
function seq(h, terms, gaps = [], cls = () => '') {
  return h('div.psg-seq', h('style', CSS), terms.map((t, i) =>
    h('div.psg-t' + cls(i) + (t === '?' ? '.psg-q' : ''), h('span.psg-gap', gaps[i] || ''), h('div.tut-box', t))));
}

export default {
  tips: {
    low: [
      'Write the gaps between neighbours in your head first. Most rules show up in the gaps.',
      'If the gaps make no sense, look at every other number. It may be two series woven together.',
    ],
    mid: [
      'Check for doubling and square numbers when the gaps grow quickly.',
      'Spot the rule from the first three numbers, then test it on the last two before you tap.',
      'Quick, sure answers earn a speed bonus. A wild guess costs more than it wins.',
    ],
    high: [
      'Sharp sleuthing! You read those patterns like a detective reads footprints.',
      'Superb. Longer sequences and more woven series are coming, so keep checking every other term.',
    ],
  },
  tutorial: [
    {
      say: 'Find the rule that turns each number into the next one. Then pick the number that replaces the question mark.',
      demo: (h) => h('div.tut-col', seq(h, ['3', '7', '11', '15', '?'], ['', '+4', '+4', '+4', '+4']), h('span.tut-note', 'next is 19')),
    },
    {
      say: 'Rules can add, multiply, use square numbers or grow their gaps. Look at the gaps first.',
      demo: (h) => h('div.tut-col',
        seq(h, ['2', '4', '8', '16', '?'], ['', '×2', '×2', '×2', '×2']),
        seq(h, ['1', '3', '6', '10', '?'], ['', '+2', '+3', '+4', '+5'])),
    },
    {
      say: 'Here is the twist: some sequences are two series woven together. Read every other number.',
      demo: (h) => h('div.tut-col',
        seq(h, ['5', '20', '7', '17', '9', '14', '?'], ['', '', '+2', '−3', '+2', '−3', '+2'], (i) => (i % 2 === 0 ? '.psg-a' : '')),
        h('span.tut-muted', '5, 7, 9, … and 20, 17, 14, …')),
    },
    {
      say: 'Tap your answer or press 1 to 4. Quick answers earn a bonus, and wrong ones cost five points.',
      demo: (h) => h('div.tut-col',
        h('div.tut-row', ['13', '11', '12', '16'].map((c, i) => h('div.tut-box' + (c === '11' ? '.on.tut-tap' : ''), `${i + 1} · ${c}`))),
        h('span.tut-muted', 'One minute on the clock')),
    },
  ],
};
