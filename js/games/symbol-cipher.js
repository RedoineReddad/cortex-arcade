// Glyph Cipher: digit-symbol substitution. Decode the big glyph using the key.
// Twist: every ~12 s the key flips face-down; answers from memory score double.
import { shuffle, sample, pick, randf } from '../core/util.js';

// Glyphs drawn as SVG paths in a 24×24 box (no font dependence).
const GLYPHS = [
  { d: 'M12 3 L21 20 H3 Z', dot: [12, 14.5] },
  { d: 'M5 3 H19 L5 21 H19 Z' },
  { d: 'M9 9 H15 V15 H9 Z M9 9 V6 A3 3 0 1 0 6 9 H9 M15 9 H18 A3 3 0 1 0 15 6 V9 M15 15 V18 A3 3 0 1 0 18 15 H15 M9 15 H6 A3 3 0 1 0 9 18 V15' },
  { d: 'M14 2 L6 13 H12 L10 22 L18 10 H12 Z' },
  { d: 'M5 4 V9 A7 7 0 0 0 19 9 V4 M12 4 V22 M8 18 H16' },
  { d: 'M2 12 Q12 2 22 12 Q12 22 2 12 Z', ring: [12, 12, 3] },
  { d: 'M12 11 C7 7 9 2 12 2 C15 2 17 7 12 11 M12 11 V22 M6 14 H18' },
  { d: 'M3 9 L7.5 19 L12 9 L16.5 19 L21 9 M3 4 H21' },
  { d: 'M15 3 A9 9 0 1 0 21 16 A7 7 0 1 1 15 3 Z' },
  { d: 'M12 3 V21 M6 9 L12 3 L18 9 M7 21 H17' },
  { d: 'M12 2 L22 12 L12 22 L2 12 Z M12 8 L16 12 L12 16 L8 12 Z' },
  { d: 'M12 12 C9 7 3 7 3 12 C3 17 9 17 12 12 C15 7 21 7 21 12 C21 17 15 17 12 12 Z' },
  { d: 'M4 4 H20 V20 H4 Z M4 4 L20 20' },
  { d: 'M12 2 L21 17 H3 Z M12 22 L3 7 H21 Z' },
  { d: 'M4 20 V8 A8 8 0 0 1 20 8 V20 M4 14 H20' },
  { d: 'M3 12 H21 M12 3 V21', ring: [12, 12, 8] },
];

export default function start(api) {
  const { h, level } = api;
  const HIDE = [4, 4.5, 5, 5.5, 6][level - 1];
  const PTS = 3, PTS_HIDDEN = 6, PENALTY = 3;

  api.css(`
    .sc-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(10px,2.2vh,20px); width:min(100%,560px); }
    .sc-key { perspective:900px; width:100%; }
    .sc-card { position:relative; transform-style:preserve-3d; transition:transform .55s cubic-bezier(.4,.1,.3,1); }
    .sc-card.sc-flip { transform:rotateY(180deg); }
    .sc-face { backface-visibility:hidden; -webkit-backface-visibility:hidden; border-radius:16px; border:2px solid var(--line); background:var(--panel-solid); }
    .sc-front { display:grid; grid-template-columns:repeat(9,1fr); gap:2px; padding:6px; }
    .sc-pair { display:flex; flex-direction:column; align-items:center; gap:2px; padding:4px 0; border-radius:10px; }
    .sc-pair:nth-child(odd) { background:color-mix(in srgb, var(--c) 7%, transparent); }
    .sc-pair svg { width:min(8.4vw,44px); height:min(8.4vw,44px); }
    .sc-pair span { font-weight:800; font-size:clamp(1rem,4vw,1.3rem); color:var(--c); border-top:1px solid var(--line); width:70%; text-align:center; }
    .sc-back { position:absolute; inset:0; transform:rotateY(180deg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
      background:repeating-linear-gradient(45deg, color-mix(in srgb,var(--c) 22%,var(--panel-solid)) 0 10px, color-mix(in srgb,var(--c) 10%,var(--panel-solid)) 10px 20px);
      border-color:var(--c); font-weight:800; text-align:center; }
    .sc-back .sc-hid { font-size:clamp(1rem,4.4vw,1.35rem); }
    .sc-back .sc-x2 { font-size:.85rem; color:var(--c); background:var(--panel-solid); padding:2px 10px; border-radius:99px; }
    .sc-meter { height:4px; width:60%; border-radius:99px; background:var(--line); overflow:hidden; }
    .sc-meter div { height:100%; background:var(--c); width:100%; }
    .sc-big { width:clamp(110px,26vh,170px); aspect-ratio:1; border-radius:24px; display:grid; place-items:center; background:var(--panel-solid);
      border:3px solid var(--c); box-shadow:0 8px 26px color-mix(in srgb,var(--c) 25%,transparent); }
    .sc-big svg { width:70%; height:70%; }
    .sc-big.sc-pop { animation:sc-pop .22s ease-out; }
    .sc-big.sc-hiddenmode { border-style:dashed; }
    @keyframes sc-pop { from { transform:scale(.8); opacity:.3; } to { transform:scale(1); opacity:1; } }
    .sc-glyph path, .sc-glyph circle.sc-ring { fill:none; stroke:var(--text); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .sc-glyph circle.sc-dot { fill:var(--text); }
    .sc-big .sc-glyph path, .sc-big .sc-glyph circle.sc-ring { stroke-width:1.7; }
    .sc-pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; width:min(320px,100%); }
    .sc-pad button { height:clamp(46px,7.5vh,62px); border-radius:14px; border:1px solid var(--line); background:var(--panel-solid); font-size:1.5rem; font-weight:800; cursor:pointer; }
    .sc-pad button:active { transform:scale(.95); background:var(--bg2); }
    .sc-pad button.sc-ok { border-color:var(--good); background:color-mix(in srgb,var(--good) 25%,var(--panel-solid)); }
    .sc-pad button.sc-no { border-color:var(--bad); background:color-mix(in srgb,var(--bad) 25%,var(--panel-solid)); }
    .sc-status { min-height:1.4em; font-weight:700; }
    .sc-status.sc-mem { color:var(--c); }
  `);

  const glyphSvg = (g) => {
    const s = h('svg.sc-glyph', { viewBox: '0 0 24 24' });
    s.append(h('path', { d: g.d }));
    if (g.dot) s.append(h('circle.sc-dot', { cx: g.dot[0], cy: g.dot[1], r: 1.8 }));
    if (g.ring) s.append(h('circle.sc-ring', { cx: g.ring[0], cy: g.ring[1], r: g.ring[2] }));
    return s;
  };

  // fresh mapping: 9 random glyphs ↔ digits 1..9
  const glyphs = sample(GLYPHS, 9);
  const digitOf = new Map();
  shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).forEach((d, i) => digitOf.set(glyphs[i], d));

  const front = h('div.sc-face.sc-front');
  const meterBar = h('div');
  const back = h('div.sc-face.sc-back', h('div.sc-hid', 'Key hidden — from memory!'), h('div.sc-x2', 'double points'), h('div.sc-meter', meterBar));
  const card = h('div.sc-card', front, back);
  const big = h('div.sc-big');
  const status = h('div.sc-status.g-sub', 'Find the glyph in the key, tap its digit');
  const pad = h('div.sc-pad');
  const padBtns = {};
  for (let d = 1; d <= 9; d++) {
    padBtns[d] = h('button', { type: 'button', onpointerdown: (e) => { e.preventDefault(); answer(d, e); } }, String(d));
    pad.append(padBtns[d]);
  }
  api.stage.append(h('div.sc-wrap', h('div.sc-key', card), big, status, pad));

  function renderKey() {
    // sorted by digit at low levels; scrambled order at level ≥3 (so position memory isn't enough)
    const order = level >= 3 ? shuffle(glyphs) : glyphs.slice().sort((a, b) => digitOf.get(a) - digitOf.get(b));
    front.replaceChildren(...order.map((g) => h('div.sc-pair', glyphSvg(g), h('span', String(digitOf.get(g))))));
  }
  renderKey();

  let score = 0, correct = 0, wrong = 0, memCorrect = 0, hidden = false, cur = null, hideStart = 0, shownAt = 0;
  api.setScore(0);

  function nextGlyph() {
    cur = pick(glyphs.filter((g) => g !== cur));
    big.replaceChildren(glyphSvg(cur));
    big.classList.remove('sc-pop'); void big.offsetWidth; big.classList.add('sc-pop');
    shownAt = performance.now();
  }

  function answer(d, e) {
    if (api.ended || !cur) return;
    // a double tap would otherwise answer the next glyph too
    if (performance.now() - shownAt < 150) return;
    const ok = digitOf.get(cur) === d;
    const btn = padBtns[d];
    btn.classList.remove('sc-ok', 'sc-no'); void btn.offsetWidth;
    btn.classList.add(ok ? 'sc-ok' : 'sc-no');
    api.after(220, () => btn.classList.remove('sc-ok', 'sc-no'));
    if (ok) {
      correct++;
      score += hidden ? PTS_HIDDEN : PTS;
      if (hidden) memCorrect++;
      else status.textContent = '\u00a0';
      api.sfx.good();
      nextGlyph();
    } else {
      wrong++;
      score = Math.max(0, score - PENALTY);
      const r = e && e.clientX != null ? [e.clientX, e.clientY] : [];
      api.bad(...r);
      if (!hidden) status.textContent = `That glyph is ${digitOf.get(cur)}`;
      else nextGlyph();
    }
    api.setScore(score);
  }

  api.keys(Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => [String(d), (e) => { if (!e.repeat) answer(d); }])));

  // Key flip cycle
  function hideKey() {
    hidden = true; hideStart = performance.now();
    card.classList.add('sc-flip');
    big.classList.add('sc-hiddenmode');
    status.textContent = 'Key hidden — from memory! ×2';
    status.classList.add('sc-mem');
    api.sfx.tick();
    api.after(HIDE * 1000, showKey);
  }
  function showKey() {
    if (level >= 3) renderKey();
    hidden = false;
    card.classList.remove('sc-flip');
    big.classList.remove('sc-hiddenmode');
    status.textContent = 'Key is back';
    status.classList.remove('sc-mem');
    api.after(randf(11, 13) * 1000 - HIDE * 1000, hideKey);
  }
  api.after(randf(8, 10) * 1000, hideKey);
  api.loop(() => {
    if (hidden) meterBar.style.width = Math.max(0, 100 - ((performance.now() - hideStart) / (HIDE * 10))) + '%';
  });

  api.timer(60, () => {
    api.end({
      score,
      stats: { Correct: String(correct), 'From memory': String(memCorrect), Wrong: String(wrong), 'Per answer': correct ? (60 / correct).toFixed(2) + 's' : '—' },
    });
  });

  window.__cortexDebug = { get answer() { return cur ? digitOf.get(cur) : null; }, get hidden() { return hidden; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  nextGlyph();
}
