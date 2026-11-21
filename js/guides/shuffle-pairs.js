// Guide for Shifty Pairs: professor's tips and the "How to play" steps.

const CSS = `
  .sp-t { --sp-t-glow:#f59e0b; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .sp-t { --sp-t-glow:#fbbf24; } }
  .sp-t-card { width:48px; height:60px; border-radius:var(--r2); display:grid; place-items:center; font-size:1.6rem;
    border:2px solid var(--edge); background:var(--sheet); }
  .sp-t-card.back { border-color:color-mix(in srgb, var(--c) 50%, var(--edge));
    background:repeating-linear-gradient(45deg, color-mix(in srgb, var(--c) 22%, var(--sheet)) 0 7px, color-mix(in srgb, var(--c) 34%, var(--sheet)) 7px 14px); }
  .sp-t-card.good { border-color:var(--good); background:color-mix(in srgb, var(--good) 16%, var(--sheet)); }
  .sp-t-card.bad { border-color:var(--pen); background:color-mix(in srgb, var(--pen) 12%, var(--sheet)); }
  .sp-t-card.move { box-shadow:0 0 0 3px var(--sp-t-glow); border-color:var(--sp-t-glow); }
  .sp-t-swap { position:relative; display:flex; gap:8px; }
  .sp-t-a { animation:spTA 2.6s ease-in-out infinite; }
  .sp-t-b { animation:spTB 2.6s ease-in-out infinite; }
  @keyframes spTA { 0%, 25% { transform:none; } 55%, 100% { transform:translateX(168px); } }
  @keyframes spTB { 0%, 25% { transform:none; } 55%, 100% { transform:translateX(-168px); } }
  @media (prefers-reduced-motion: reduce) { .sp-t-a, .sp-t-b { animation:none; } }
`;

const card = (h, cls, face = '') => h('div.sp-t-card' + cls, face);

export default {
  tips: {
    low: [
      'Start with cards you have never seen. Then every flip teaches you something new.',
      'After a miss, two cards glow and slide. Follow just one of them with your eyes and you will know where both went.',
    ],
    mid: [
      'Each miss makes two cards swap, so a careful flip saves you twice: fewer flips and fewer shuffles.',
      'Name each card with its place as you see it, like "fox, top left". The spot sticks better with a name.',
    ],
    high: [
      'Brilliant. Hardly a wasted flip, even with the cards on the move.',
      'Top marks. The board gets bigger next time, so keep tracking those swaps.',
    ],
  },
  tutorial: [
    {
      say: 'Tap two cards to turn them over. If the pictures match, they stay face up.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        card(h, '.good', '🍎'), card(h, '.back'), card(h, '.good', '🍎'), card(h, '.back.tut-tap')),
    },
    {
      say: 'If they don\'t match, they turn face down again. Try to remember what you saw.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        card(h, '.bad', '🦊'), card(h, '.back'), card(h, '.bad', '🐢'), card(h, '.back')),
    },
    {
      say: 'Here is the twist: after every miss, two face-down cards swap places. Watch where they slide.',
      demo: (h) => h('div.tut-col.sp-t', h('style', CSS),
        h('div.sp-t-swap', card(h, '.back.move.sp-t-a'), card(h, '.back'), card(h, '.back'), card(h, '.back.move.sp-t-b')),
        h('span.tut-muted', '⇄ two cards are swapping')),
    },
    {
      say: 'Find all the pairs. Fewer flips and a quicker time give a bigger score.',
      demo: (h) => h('div.tut-row', h('div.tut-box', 'Flips 16'), h('div.tut-box', '⏱ 42s'), h('div.tut-box.good', '8 / 8 pairs')),
    },
  ],
};
