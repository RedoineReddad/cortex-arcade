// Guide for Exact Change: professor's tips and the "How to play" steps.
const CSS = `
  .cc2-t-coin { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none; position: relative;
    font-weight: 700; font-size: .85rem; color: #3b2508; border: 2px solid rgba(0,0,0,.28);
    box-shadow: 0 2px 0 rgba(0,0,0,.25), inset 0 0 0 3px rgba(255,255,255,.28); }
  .cc2-t-coin.cu { background: radial-gradient(circle at 35% 30%, #f3c095, #c57a3e 60%, #a35f2a); }
  .cc2-t-coin.au { background: radial-gradient(circle at 35% 30%, #fff1a8, #e2bb45 60%, #b8902a); width: 48px; height: 48px; }
  .cc2-t-coin.out { background: color-mix(in srgb, var(--ink-soft) 20%, var(--sheet)); color: var(--ink-soft); border: 2px dashed var(--ink-soft); box-shadow: none; }
  .cc2-t-coin.out::after { content: ""; position: absolute; inset: -4px; border-radius: 50%;
    background: linear-gradient(45deg, transparent 46%, var(--pen) 46% 54%, transparent 54%), linear-gradient(-45deg, transparent 46%, var(--pen) 46% 54%, transparent 54%); }
  .cc2-t-note { padding: 8px 14px; border-radius: 6px; text-align: center; font-weight: 700; font-size: 1.4rem; color: #12351f;
    background: repeating-linear-gradient(135deg, #a7e3b8 0 6px, #95d9a8 6px 12px); border: 2px solid #4f9a68; }
  .cc2-t-note small, .cc2-t-price small { display: block; font-size: .65rem; letter-spacing: .06em; text-transform: uppercase; opacity: .8; }
  .cc2-t-price { padding: 8px 14px; border-radius: 6px; text-align: center; font-weight: 700; font-size: 1.4rem; border: 1px solid var(--edge); background: var(--sheet); }
  .cc2-t-tray { display: flex; gap: 6px; align-items: center; padding: 8px 12px; min-height: 64px; border: 2px dashed color-mix(in srgb, var(--c) 55%, var(--edge));
    border-radius: 12px; background: color-mix(in srgb, var(--c) 7%, var(--sheet)); }
  .cc2-t-tray.ok { border: 2px solid var(--good); }
  .cc2-t-slot { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .cc2-t-slot small { font-size: .62rem; font-weight: 700; color: var(--pen); text-transform: uppercase; }
`;
const coin = (h, label, metal, cls = '') => h('div.cc2-t-coin.' + metal + cls, label);

export default {
  tips: {
    low: [
      'Work out the change first: paid minus price. €5 − €4.60 is 40¢.',
      'Start with the biggest coin that still fits, then fill the rest with smaller ones.',
      'Tap a coin in your tray to take it back, or press Backspace to remove the last one.',
    ],
    mid: [
      'Fewest coins earns 15 points instead of 10, so count your coins before you press Give change.',
      'Watch for the 1¢ gap. With 1¢ sold out, 8¢ has to be four 2¢ coins, because 5¢ leaves 3¢ you cannot make.',
      'The number keys 1 to 8 grab coins and Enter hands them over, which is quicker than tapping.',
    ],
    high: [
      'Quick hands and tidy change. A banker in the making!',
      'Superb. Plan the whole handful before you tap: biggest coins first, then check whether a sold-out coin forces a swap.',
    ],
  },
  tutorial: [
    {
      say: 'A customer pays with a note. Your change is the note minus the price.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.cc2-t-note', h('small', 'Paid'), '€5'), h('span.tut-big', '−'),
        h('div.cc2-t-price', h('small', 'Price'), '€4.60'), h('span.tut-big', '='), h('div.tut-box.on', '40¢')),
    },
    {
      say: 'Tap coins in the till to build the change, then press Give change. Tap a coin in your tray to put it back.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.cc2-t-tray', coin(h, '20¢', 'au'), coin(h, '20¢', 'au'), h('span.tut-muted', '= 40¢')),
        h('div.tut-row', coin(h, '5¢', 'cu'), coin(h, '10¢', 'au'), h('div.tut-tap', coin(h, '20¢', 'au')), coin(h, '50¢', 'au'))),
    },
    {
      say: 'Here is the twist: some coins are sold out. No 20¢ today, so 40¢ has to be made another way.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.tut-row', h('div.cc2-t-slot', coin(h, '20¢', 'au', '.out'), h('small', 'sold out')), h('span.tut-note', 'so use')),
        h('div.cc2-t-tray', coin(h, '10¢', 'au'), coin(h, '10¢', 'au'), coin(h, '10¢', 'au'), coin(h, '10¢', 'au'))),
    },
    {
      say: 'Exact change scores 10 points, and using the fewest coins possible adds 5 more. Keys 1 to 8 pick coins and Enter gives them.',
      demo: (h) => h('div.tut-col',
        h('div.tut-row', h('div.tut-box.good', '+10 exact'), h('div.tut-box.good', '+5 fewest')),
        h('div.tut-row', ['1', '2', '3', '…', '8'].map((k) => h('div.tut-box', k)), h('div.tut-box.on', '⏎'))),
    },
  ],
};
