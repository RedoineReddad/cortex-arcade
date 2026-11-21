// Guide for Full House: professor's tips and the "How to play" steps.

const CSS = `
  .hc-t-scene { position:relative; width:300px; height:130px; overflow:hidden; border:1px solid var(--edge); border-radius:var(--r2);
    background:linear-gradient(180deg, color-mix(in srgb, #38bdf8 22%, var(--sheet)), var(--sheet) 75%); }
  .hc-t-ground { position:absolute; left:0; right:0; bottom:0; height:20px; background:color-mix(in srgb, #22c55e 35%, var(--sheet)); }
  .hc-t-house { position:absolute; left:50%; bottom:20px; width:130px; height:96px; transform:translateX(-50%); }
  .hc-t-roof { position:absolute; left:-10px; right:-10px; top:0; height:40px; background:#dc5a3c; clip-path:polygon(50% 0, 100% 100%, 0 100%); }
  .hc-t-body { position:absolute; left:0; right:0; bottom:0; height:56px; background:#f6d9a8; }
  .hc-t-body.open { background:#3b2a20; display:flex; align-items:flex-end; justify-content:center; font-size:1.15rem; line-height:1.3; white-space:nowrap; }
  .hc-t-door { position:absolute; left:50%; bottom:0; width:26px; height:38px; transform:translateX(-50%); background:#8b4513; border-radius:12px 12px 0 0; }
  .hc-t-walker { position:absolute; bottom:12px; font-size:1.8rem; line-height:1; }
  .hc-t-in { left:0; animation:hcTIn 2.8s linear infinite; }
  .hc-t-walker span { display:inline-block; transform:scaleX(-1); } /* emoji face left; both walk to the right */
  .hc-t-out { right:0; font-size:1.4rem; animation:hcTOut 2.8s linear infinite; }
  @keyframes hcTIn { 0% { left:-10%; opacity:1; } 45% { left:44%; opacity:1; } 50%, 100% { left:44%; opacity:0; } }
  @keyframes hcTOut { 0%, 50% { right:44%; opacity:0; } 55% { opacity:1; } 100% { right:-10%; opacity:1; } }
  @media (prefers-reduced-motion: reduce) { .hc-t-in, .hc-t-out { animation:none; } .hc-t-in { left:22%; } .hc-t-out { right:22%; } }
  .hc-t-count { display:flex; align-items:center; gap:8px; font-size:1.6rem; font-weight:700; }
  .hc-t-keys { display:grid; grid-template-columns:repeat(5, 44px); gap:6px; }
`;

const house = (h, inside) => h('div.hc-t-house', h('div.hc-t-roof'),
  inside ? h('div.hc-t-body.open', inside) : h('div.hc-t-body', h('div.hc-t-door')));
const scene = (h, ...kids) => h('div.hc-t-scene', h('div.hc-t-ground'), ...kids);

export default {
  tips: {
    low: [
      'Keep two numbers in your head, one for people and one for cats, and say them quietly: "four and two".',
      'Only change a number when someone actually reaches the door. Walkers still on the path don\'t count yet.',
    ],
    mid: [
      'When two arrive at once, update both numbers before you look up again.',
      'Get the starting count right when the house is open. A slip there spoils the whole round.',
    ],
    high: [
      'A perfect head count. Nobody, person or cat, slipped past you.',
      'Superb. Next time the crowd gets busier and faster, so keep both tallies going.',
    ],
  },
  tutorial: [
    {
      say: 'First I open the house so you can see who is inside. Count the people and the cats.',
      demo: (h) => h('div.tut-col', h('style', CSS), scene(h, house(h, '🧍🧍🧍🐈🐈')), h('span.tut-muted', '3 people · 2 cats')),
    },
    {
      say: 'Then the wall closes and they come and go. Add one for each arrival and take one away for each departure.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        scene(h, house(h), h('div.hc-t-walker.hc-t-in', h('span', '🚶')), h('div.hc-t-walker.hc-t-out', h('span', '🐈'))),
        h('span.tut-muted', 'person in: +1 · cat out: −1')),
    },
    {
      say: 'Here is the twist: you only find out at the end whether I ask about people or cats, so keep count of both.',
      demo: (h) => h('div.tut-row', h('style', CSS),
        h('div.tut-box', h('span.hc-t-count', '🧍 4')), h('div.tut-box', h('span.hc-t-count', '🐈 1')),
        h('span.tut-note', 'which one?')),
    },
    {
      say: 'Tap the number, or press 0 to 9 on your keyboard. Each right answer is worth 20 points.',
      demo: (h) => h('div.tut-col', h('style', CSS),
        h('div.tut-big', { style: { fontSize: '1.3rem' } }, 'How many ', h('b', { style: { color: 'var(--c)' } }, 'CATS'), '?'),
        h('div.hc-t-keys', ['0', '1', '2', '3', '4'].map((d) => h('div.tut-box' + (d === '1' ? '.tut-tap' : ''), d)))),
    },
  ],
};
