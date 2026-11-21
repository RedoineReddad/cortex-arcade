// Guide for Chain Reaction: professor's tips and the "How to play" steps.
export default {
  tips: {
    low: [
      'Say each sum in your head before you type it. Rushing breaks the chain.',
      'A wrong answer still carries on, so the next sum uses the right number: read the new first number carefully.',
    ],
    mid: [
      'Nice chain! Try keeping your fingers on the keypad so every answer goes in with one motion.',
      'Times-tables up to 9 × 9 by heart make this game twice as fast.',
    ],
    high: [
      'Twenty links without a wobble. Lightning arithmetic!',
      'Superb. Next time the numbers get bigger, so stay sharp.',
    ],
  },
  tutorial: [
    {
      say: 'You get twenty quick sums. Type each answer on the keypad, or use your keyboard.',
      demo: (h) => h('div.tut-col', h('div.tut-big', '7 + 5 = ?'), h('div.tut-row', ['1', '2'].map((d) => h('div.tut-box', d)), h('div.tut-box.on', '⏎'))),
    },
    {
      say: 'Here is the twist: your answer becomes the first number of the next sum.',
      demo: (h) => h('div.tut-col',
        h('div.tut-row', h('div.tut-box.good', '12'), h('span.tut-note', 'carries over')),
        h('div.tut-big', h('span', { style: { color: 'var(--c)' } }, '12'), ' − 4 = ?')),
    },
    {
      say: 'Get one wrong and I show the right answer, so the chain carries on with the correct number.',
      demo: (h) => h('div.tut-col', h('div.tut-row', h('div.tut-box.bad', '9'), h('span.tut-note', 'should be 8')), h('div.tut-big', h('span', { style: { color: 'var(--c)' } }, '8'), ' × 3 = ?')),
    },
    {
      say: 'Accuracy scores the most, and speed adds a bonus. Ready?',
      demo: (h) => h('div.tut-row', h('div.tut-box', '⏱ 0:42'), h('div.tut-box.good', '20 / 20')),
    },
  ],
};
