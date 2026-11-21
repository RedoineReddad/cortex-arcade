// Guide for Rainfall Sums: professor's tips and the "How to play" steps.
const CSS = `
  .rm-t-sky { position: relative; width: 280px; height: 150px; border: 1px solid var(--edge); border-radius: 12px; overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--c) 12%, var(--sheet)), var(--sheet)); }
  .rm-t-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 8px; background: color-mix(in srgb, var(--c) 45%, var(--sheet)); }
  .rm-t-ground.hit { background: var(--pen); }
  .rm-t-drop { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); white-space: nowrap;
    padding: 6px 12px; border-radius: 20px 20px 20px 20px / 24px 24px 16px 16px; font-weight: 700; font-size: 1.05rem;
    background: color-mix(in srgb, var(--c) 18%, var(--sheet)); border: 2px solid var(--c); color: var(--ink); }
  .rm-t-drop.mirror { background: color-mix(in srgb, #d946ef 20%, var(--sheet)); border-color: #d946ef; }
  .rm-t-drop.low { border-color: var(--pen); }
  .rm-t-badge { display: inline-grid; place-items: center; margin-left: 6px; width: 1.4em; height: 1.4em; border-radius: 50%;
    background: #d946ef; color: #fff; font-size: .8em; }
  .rm-t-fall { animation: rm-t-fall 2.6s ease-in infinite; }
  /* the 0% frame is a meaningful still: the drop near the top, ready to be answered */
  @keyframes rm-t-fall { 0% { top: 8px; opacity: 1; } 65% { top: 70px; opacity: 1; scale: 1; } 75% { top: 70px; opacity: 0; scale: 1.5; } 76% { top: 8px; opacity: 0; scale: 1; } 100% { top: 8px; opacity: 1; } }
  .rm-t-hearts { position: absolute; top: 6px; left: 8px; color: var(--pen); letter-spacing: 2px; font-weight: 700; }
  .rm-t-hearts .lost { color: var(--ink-soft); }
  @media (prefers-reduced-motion: reduce) { .rm-t-fall { animation: none; top: 40px; } }
`;
const style = (h) => h('style', CSS);

export default {
  tips: {
    low: [
      'Pop the lowest drop first. The one nearest the ground is the one that costs you a heart.',
      'If the line under your typed answer turns red, no drop has that answer. Press delete and check the sum again.',
      'Pink drops with ⇄ want the answer backwards: 3 × 7 is 21, so you type 12.',
    ],
    mid: [
      'You rarely need Enter. A drop pops by itself as soon as your answer matches it.',
      'Pop three in a row without a wrong entry and every drop is worth more, so keep the combo going.',
      'Mirror drops are worth 15 instead of 10. Work out the sum first, then flip the digits.',
    ],
    high: [
      'A whole storm of sums and hardly a drop wasted. Splendid!',
      'Next time the rain falls faster. Keep your eyes on the drops nearest the ground.',
    ],
  },
  tutorial: [
    {
      say: 'Sums fall like raindrops. Type the answer on the keypad or keyboard and the matching drop pops.',
      demo: (h) => h('div.tut-row', style(h),
        h('div.rm-t-sky', { style: { width: '190px' } }, h('div.rm-t-drop.rm-t-fall', '6 + 7'), h('div.rm-t-ground')),
        h('div.tut-col', h('div.tut-box.on', '13'), h('span.tut-muted', 'you type'))),
    },
    {
      say: 'Every drop that reaches the ground costs a heart. Lose all three and the rain stops.',
      demo: (h) => h('div', style(h),
        h('div.rm-t-sky',
          h('div.rm-t-hearts', '♥♥', h('span.lost', '♡')),
          h('div.rm-t-drop.low', { style: { top: 'auto', bottom: '10px' } }, '9 − 4'),
          h('div.rm-t-ground.hit'))),
    },
    {
      say: 'Here is the twist: a pink drop with ⇄ wants its answer backwards. 4 × 7 is 28, so type 82.',
      demo: (h) => h('div.tut-col', style(h),
        h('div.rm-t-drop.mirror', { style: { position: 'static', transform: 'none' } }, '4 × 7', h('span.rm-t-badge', '⇄')),
        h('div.tut-row', h('div.tut-box.bad', '28'), h('span.tut-note', 'no,'), h('div.tut-box.good', '82'), h('span.tut-note', 'yes!'))),
    },
    {
      say: 'Pop drops in a row to build a combo bonus. A wrong entry resets the combo, so stay accurate.',
      demo: (h) => h('div.tut-col',
        h('div.tut-row', h('div.tut-box.good', '+10'), h('div.tut-box.good', '+10'), h('div.tut-box.good', '+11'), h('div.tut-box.good', '+11')),
        h('span.tut-note', 'combo ×4')),
    },
  ],
};
