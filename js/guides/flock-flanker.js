// Guide for Flock Focus: professor's tips and the "How to play" steps.
const ANGLE = { right: 0, down: 90, left: 180, up: 270 };
const BIRD = 'M25 0 Q15 -5 6 -4 Q0 -21 -13 -25 Q-6 -11 -8 -4 L-21 -8 L-16 0 L-21 8 L-8 4 Q-6 11 -13 25 Q0 21 6 4 Q15 5 25 0 Z';

const css = `
  .fft-sky { position: relative; width: 300px; height: 120px; border-radius: 14px; overflow: hidden; background: linear-gradient(#5aa7f0, #a9dcff); }
  .fft-sky.fft-dusk { background: linear-gradient(#f2703a, #ffc46b 70%, #ffd89a); }
  .fft-sky svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .fft-tag { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 1; white-space: nowrap; padding: 2px 10px;
    border-radius: 99px; font-size: .75rem; font-weight: 800; background: rgba(255,255,255,.9); color: #12305a; }
  .fft-dusk .fft-tag { color: #7a2a05; }
  .fft-drift { animation: fftDrift 1.8s linear infinite; }
  @keyframes fftDrift { 0% { transform: translateY(18px); opacity: 0; } 20%, 80% { opacity: 1; } 100% { transform: translateY(-18px); opacity: 0; } }
  .fft-pad { display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(2, 44px); gap: 6px; }
  .fft-pad .tut-box { padding: 0; font-size: 1.3rem; }
  @media (prefers-reduced-motion: reduce) { .fft-drift { animation-duration: 4s; } }
`;

// A row of five birds; dirs[2] is the centre bird.
function flock(h, dirs, centreRing, cls) {
  const g = h('g' + (cls ? '.' + cls : ''));
  dirs.forEach((d, i) => {
    const x = -120 + i * 60;
    if (i === 2 && centreRing) g.append(h('circle', { cx: x, cy: 10, r: 30, fill: 'rgba(255,255,255,.3)', stroke: 'rgba(255,255,255,.85)', 'stroke-width': 2 }));
    g.append(h('g', { transform: `translate(${x} 10) rotate(${ANGLE[d]})` },
      h('path', { d: BIRD, fill: cls ? '#2a1a2e' : '#1d2a44' }),
      h('path', { d: 'M24 0 L17 -3 L17 3 Z', fill: '#f59e0b' })));
  });
  return h('svg', { viewBox: '-160 -50 320 120' }, g);
}

const sky = (h, dusk, tag, svg) => h('div.fft-sky' + (dusk ? '.fft-dusk' : ''), h('div.fft-tag', tag), svg);

export default {
  tips: {
    low: [
      'Glance at the sky colour first. Blue sky: centre bird. Orange sky: the whole flock.',
      'The outer birds are there to fool you. Fix your eyes on the middle and let them blur.',
    ],
    mid: [
      'Good flying! At dusk, ignore the beaks and watch which way the group slides.',
      'Keep a thumb on the arrow keys or swipe the sky. Both are quicker than reaching for buttons.',
    ],
    high: [
      'Eagle eyes! You switch between day and dusk without a wobble.',
      'Superb. Harder levels bring new formations, so find the centre bird fast.',
    ],
  },
  tutorial: [
    {
      say: 'In the day (blue sky), answer where the CENTRE bird points. Ignore the birds around it.',
      demo: (h) => h('div.tut-col', h('style', css),
        sky(h, false, '☀️ Day: centre bird', flock(h, ['left', 'left', 'right', 'left', 'left'], true)),
        h('div.tut-row', h('span.tut-muted', 'Answer'), h('div.tut-box.good', '→'))),
    },
    {
      say: 'Answer with the arrow keys, W A S D, the arrow buttons, or by swiping on the sky.',
      demo: (h) => h('div.tut-row', h('style', css),
        h('div.fft-pad',
          h('div.tut-box', { style: { gridColumn: 2, gridRow: 1 } }, '↑'),
          h('div.tut-box', { style: { gridColumn: 1, gridRow: 2 } }, '←'),
          h('div.tut-box', { style: { gridColumn: 2, gridRow: 2 } }, '↓'),
          h('div.tut-box.on.tut-tap', { style: { gridColumn: 3, gridRow: 2 } }, '→')),
        h('span.tut-muted', 'or swipe the sky')),
    },
    {
      say: 'Here is the twist: at dusk (orange sky) ignore every beak and answer which way the whole flock is MOVING.',
      demo: (h) => h('div.tut-col', h('style', css),
        sky(h, true, '🌇 Dusk: where is it moving?', flock(h, ['right', 'right', 'right', 'right', 'right'], false, 'fft-drift')),
        h('div.tut-row', h('span.tut-muted', 'Beaks say →, flock moves'), h('div.tut-box.good', '↑'))),
    },
    {
      say: 'Quick right answers earn a speed bonus and a wrong one costs 5. You have 45 seconds.',
      demo: (h) => h('div.tut-row', h('div.tut-box', '⏱ 0:45'), h('div.tut-box.good', '+10 + bonus'), h('div.tut-box.bad', '−5')),
    },
  ],
};
