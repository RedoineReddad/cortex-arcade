// Guide for Time Warp: professor's tips and the "How to play" steps.

// Small analog clock; t = minutes past 12:00.
function clock(h, t, size = 78) {
  const hr = Math.floor(t / 60) % 12, mn = t % 60;
  const s = h('svg.clg-clock', { viewBox: '-50 -50 100 100', width: size, height: size });
  s.append(h('circle.clg-rim', { r: 46 }));
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    s.append(h('line.clg-tick', { x1: Math.sin(a) * 36, y1: -Math.cos(a) * 36, x2: Math.sin(a) * 43, y2: -Math.cos(a) * 43 }));
  }
  s.append(h('text.clg-num', { x: 0, y: -27 }, '12'));
  const hand = (cls, ang, len) => h('line.' + cls, { x1: 0, y1: 0, x2: 0, y2: -len, transform: `rotate(${ang})` });
  s.append(hand('clg-hh', hr * 30 + mn * 0.5, 22), hand('clg-mh', mn * 6, 35), h('circle.clg-pin', { r: 3 }));
  return s;
}

const col = (h, label, el) => h('div.tut-col', { style: { gap: '2px' } }, h('span.tut-muted', label), el);

const STYLE = `
  .clg-rim { fill: var(--sheet); stroke: var(--c); stroke-width: 3; }
  .clg-tick { stroke: var(--ink); stroke-width: 2.4; stroke-linecap: round; }
  .clg-num { fill: var(--ink); font-size: 12px; font-weight: 700; text-anchor: middle; dominant-baseline: central; }
  .clg-hh { stroke: var(--ink); stroke-width: 4.6; stroke-linecap: round; }
  .clg-mh { stroke: var(--c); stroke-width: 2.8; stroke-linecap: round; }
  .clg-pin { fill: var(--ink); }
  .clg-clock { flex-shrink: 0; display: block; }
  .clg-mir { border-radius: 50%; box-shadow: 0 0 0 3px #7dd3fc; display: block; }
  .clg-mir svg { display: block; transform: scaleX(-1); }
  .clg-turn svg { display: block; animation: clg-turn 3.2s ease-in-out infinite; }
  @keyframes clg-turn { 0%, 30% { transform: scaleX(-1); } 55%, 100% { transform: scaleX(1); } }
  .clg-badge { font-size: .72rem; font-weight: 700; border: 2px solid #7dd3fc; border-radius: 99px; padding: 0 6px; }
  @media (prefers-reduced-motion: reduce) { .clg-turn svg { animation: none; } }
`;

export default {
  tips: {
    low: [
      'Read the short hand first for the hour, then the long hand for the minutes. Mixing them up is the most common slip.',
      'Count whole hours from start to end first, then add or take away the minutes.',
      'A mirror clock shows 12:00 minus the real time. If it looks like 10:00, it is really 2:00.',
    ],
    mid: [
      'If the end looks earlier than the start, the time went past twelve. Add 12 hours to the end before you subtract.',
      'Rule out answers with the wrong minutes first. Often only one choice has the right minute value.',
    ],
    high: [
      'Time well spent! Harder rounds drop the numbers from the dial, so learn where each hour sits.',
      'Excellent reading. Quick right answers earn a speed bonus, and you are collecting plenty.',
    ],
  },
  tutorial: [
    {
      say: 'You see a start clock and an end clock. Work out how much time passed between them.',
      demo: (h) => h('div.tut-row', h('style', STYLE),
        col(h, 'Start', clock(h, 75)), h('span.tut-big', '→'), col(h, 'End', clock(h, 210)),
        h('div.tut-box.good', '2 h 15 min')),
    },
    {
      say: 'Time only runs forward. If the end looks earlier, the hands went round past twelve.',
      demo: (h) => h('div.tut-col', h('style', STYLE),
        h('div.tut-row', col(h, 'Start', clock(h, 600, 64)), h('span.tut-big', '→'), col(h, 'End', clock(h, 90, 64))),
        h('span.tut-note', '10:00 → 1:30 = 3 h 30 min')),
    },
    {
      say: 'Here is the twist: a clock marked Mirror is seen in a mirror. Flip it left to right in your head before you read it.',
      demo: (h) => h('div.tut-row', h('style', STYLE),
        col(h, h('span.clg-badge', 'Mirror'), h('div.clg-mir', clock(h, 120))), h('span.tut-big', '→'),
        col(h, h('span.tut-note', 'really 2:00'), h('div.clg-turn', clock(h, 120)))),
    },
    {
      say: 'Tap your answer or press 1 to 4. Right answers score more when they are quick, wrong ones cost points.',
      demo: (h) => h('div.tut-row', { style: { maxWidth: '330px' } },
        ['1 h 45 min', '2 h 15 min', '9 h 45 min', '2 h 30 min'].map((t, i) => h('div.tut-box' + (i === 1 ? '.on.tut-tap' : ''),
          h('span', h('small', { style: { opacity: 0.6, marginRight: '6px' } }, String(i + 1)), t)))),
    },
  ],
};
