// Guide for Signal Sprint: professor's tips and the "How to play" steps.
const COL = { green: '#22c55e', red: '#ef4444', amber: '#f59e0b', blue: '#3b82f6' };

const css = `
  .sst-sig { width: 58px; height: 58px; border-radius: 50%; border: 5px solid #1f2430;
    background: radial-gradient(circle at 35% 30%, #fff8 0 12%, var(--lit) 45%, color-mix(in srgb, var(--lit) 70%, #000) 100%);
    box-shadow: 0 0 16px 3px var(--lit); }
  .sst-sig.sst-sm { width: 36px; height: 36px; border-width: 4px; box-shadow: none; }
  .sst-fade { animation: sstFade 1.6s ease-in infinite; }
  @keyframes sstFade { 0%, 40% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.5); } }
  .sst-flip { display: flex; gap: 22px; align-items: center; justify-content: center; padding: 18px 26px; border-radius: 14px;
    background: radial-gradient(circle at 50% 40%, #8b3fe0, #4c1d95); border: 2px solid #c084fc; }
  .sst-lab { color: #fff; font-weight: 800; font-size: .85rem; text-align: center; }
  @media (prefers-reduced-motion: reduce) { .sst-fade { animation: none; opacity: .6; } }
`;

const sig = (h, c, cls = '') => h('div.sst-sig' + cls, { style: { '--lit': COL[c] } });

export default {
  tips: {
    low: [
      'A wrong tap costs more than a slow one. Check the colour, then tap.',
      'Say the rule to yourself each time the screen changes: "green" or "purple means red".',
    ],
    mid: [
      'Good reflexes! Keep one finger hovering over Space so every hit is instant.',
      'When the screen turns purple, pause for a blink before your first tap. The old habit is strong.',
    ],
    high: [
      'Lightning fast and no slips. Splendid self-control!',
      'Top marks. Harder levels add amber and blue decoys, so stay picky.',
    ],
  },
  tutorial: [
    {
      say: 'Signals pop up one at a time. Tap the green ones as fast as you can, or press Space.',
      demo: (h) => h('div.tut-row', h('style', css), h('div.tut-tap', sig(h, 'green')), h('div.tut-box', 'Space')),
    },
    {
      say: 'Leave red alone and let it fade away. On harder levels, amber and blue are decoys too.',
      demo: (h) => h('div.tut-col', h('style', css),
        sig(h, 'red', '.sst-fade'),
        h('div.tut-row', h('span.tut-note', 'wait…'), sig(h, 'amber', '.sst-sm'), sig(h, 'blue', '.sst-sm'))),
    },
    {
      say: 'Here is the twist: when the screen turns purple the rule flips. Tap red and leave green alone!',
      demo: (h) => h('div.sst-flip', h('style', css),
        h('div.tut-col', h('div.tut-tap', sig(h, 'red')), h('span.sst-lab', 'tap')),
        h('div.tut-col', sig(h, 'green'), h('span.sst-lab', 'leave'))),
    },
    {
      say: 'Fast hits score up to 15. A wrong tap costs 10 and a missed one costs 3. You have 45 seconds.',
      demo: (h) => h('div.tut-row', h('div.tut-box', '⏱ 0:45'), h('div.tut-box.good', '+15'), h('div.tut-box.bad', '−10'), h('div.tut-box.bad', '−3')),
    },
  ],
};
