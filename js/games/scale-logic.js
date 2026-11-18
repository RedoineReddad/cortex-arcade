// Balance Bench: read the balance scales and deduce the heaviest / lightest object.
import { rand, pick, shuffle, sample } from '../core/util.js';

const ITEMS = ['🍎', '🍐', '🍒', '🍋', '🍉', '🍌', '🍇', '🍑', '🥥', '🍍', '🥝', '🍓'];

const sum = (side, w) => side.reduce((a, i) => a + w[i], 0);
const rel = (s, w) => Math.sign(sum(s.L, w) - sum(s.R, w)); // +1 left heavier, -1 right heavier, 0 balanced

function allAssignments(k, max) {
  const out = [];
  const cur = new Array(k);
  const rec = (i) => {
    if (i === k) { out.push(cur.slice()); return; }
    for (let v = 1; v <= max; v++) { cur[i] = v; rec(i + 1); }
  };
  rec(0);
  return out;
}
const cache = {};
const assignments = (k, max) => (cache[k + ':' + max] ||= allAssignments(k, max));

function extreme(w, want) {
  let best = 0, tie = false;
  for (let i = 1; i < w.length; i++) {
    const better = want === 'heaviest' ? w[i] > w[best] : w[i] < w[best];
    if (better) { best = i; tie = false; } else if (w[i] === w[best]) tie = true;
  }
  return tie ? -1 : best;
}

/** Returns the forced answer index, or -1 if the scales don't determine it uniquely. */
export function determined(k, scales, want, max = 12) {
  let ans = null;
  for (const w of assignments(k, max)) {
    if (!scales.every((s) => rel(s, w) === s.r)) continue;
    const e = extreme(w, want);
    if (e < 0) return -1;
    if (ans === null) ans = e; else if (ans !== e) return -1;
  }
  return ans === null ? -1 : ans;
}

function randomScale(k, w, group) {
  const idx = [...Array(k).keys()];
  let L, R;
  if (!group) { [L, R] = sample(idx, 2).map((i) => [i]); }
  else {
    const [a, b, c] = shuffle(idx);
    const t = rand(0, 3);
    if (t === 0) { L = [a, a]; R = [b]; } // 🍒🍒 vs 🍎
    else if (t === 1) { L = [a, b]; R = [c]; } // 🍋+🍒 vs 🍎
    else if (t === 2) { L = [a, a, a]; R = [b]; }
    else { L = [a, a]; R = [b, c]; }
    if (Math.random() < 0.5) [L, R] = [R, L];
  }
  const s = { L, R, group: L.length + R.length > 2 };
  s.r = rel(s, w);
  return s;
}

/** Generate a puzzle: {names, weights, scales, want, answer, group}. */
export function makePuzzle(level) {
  const k = level === 1 ? 3 : level === 2 ? pick([3, 4]) : 4;
  const pGroup = [0.25, 0.4, 0.55, 0.6, 0.65][level - 1];
  for (let attempt = 0; attempt < 400; attempt++) {
    const w = sample([1, 2, 3, 4, 5, 6, 7, 8], k);
    const want = Math.random() < 0.5 ? 'heaviest' : 'lightest';
    let scales = [];
    const seen = new Set();
    for (let tries = 0; tries < 40 && scales.length < 4; tries++) {
      const s = randomScale(k, w, Math.random() < pGroup);
      const key = [...s.L].sort() + '|' + [...s.R].sort();
      const key2 = [...s.R].sort() + '|' + [...s.L].sort();
      if (seen.has(key) || seen.has(key2)) continue;
      seen.add(key);
      scales.push(s);
      if (determined(k, scales, want, 10) >= 0) break;
    }
    if (determined(k, scales, want, 10) < 0) continue;
    // drop redundant scales
    for (let i = scales.length - 1; i >= 0 && scales.length > 1; i--) {
      const rest = scales.filter((_, j) => j !== i);
      if (determined(k, rest, want, 10) >= 0) scales = rest;
    }
    const minScales = level >= 4 ? 3 : 2;
    if (scales.length < minScales) continue;
    const hasGroup = scales.some((s) => s.group);
    if (level >= 3 && !hasGroup) continue;
    // final check over a wider weight range (≈ real-valued weights)
    const ans = determined(k, scales, want, k === 3 ? 24 : 16);
    if (ans < 0 || ans !== extreme(w, want)) continue;
    return { names: sample(ITEMS, k), weights: w, scales: shuffle(scales), want, answer: ans, group: hasGroup };
  }
  // fallback: a plain chain
  const w = [3, 2, 1].slice(0, 3);
  return { names: sample(ITEMS, 3), weights: w, want: 'heaviest', answer: 0, group: false,
    scales: [{ L: [0], R: [1], r: 1 }, { L: [1], R: [2], r: 1 }] };
}

export default function start(api) {
  const { h, level } = api;
  let score = 0, correct = 0, wrong = 0, n = 0, puzzle, locked = false;

  api.css(`
    .sl-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(10px,2.4vh,22px); width:100%; max-width:760px; }
    .sl-q { font-size:clamp(1.3rem,5.4vw,2rem); font-weight:800; text-align:center; }
    .sl-q b { color:var(--c); letter-spacing:.04em; }
    .sl-scales { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(6px,1.6vw,14px); width:100%; }
    .sl-scales > * { flex:0 1 calc(50% - clamp(6px,1.6vw,14px)); min-width:0; }
    .sl-scales.one > * { flex-basis:min(360px,100%); }
    .sl-scales.two { width:min(720px,100%); }
    @media (max-aspect-ratio: 3/4) { .sl-scales.two > * { flex-basis:min(330px,100%); } }
    .sl-scale { background:var(--panel-solid); border:1px solid var(--line); border-radius:18px; padding:4px 4px 0; animation:sl-in .4s both; }
    .sl-scale svg { display:block; width:100%; height:auto; overflow:visible; }
    .sl-beam { transform-origin:100px 46px; transition:transform .7s cubic-bezier(.3,1.6,.5,1); }
    .sl-ink { stroke:var(--muted); fill:none; stroke-width:3; stroke-linecap:round; }
    .sl-fill { fill:var(--muted); }
    .sl-pan { fill:color-mix(in srgb,var(--c) 30%,var(--bg2)); stroke:var(--c); stroke-width:2; }
    .sl-pivot { fill:var(--c); }
    .sl-obj { font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
    .sl-btns { display:flex; gap:clamp(8px,2vw,14px); justify-content:center; flex-wrap:wrap; }
    .sl-btn { width:clamp(68px,19vw,96px); height:clamp(68px,19vw,96px); font-size:clamp(2rem,9vw,3rem); border-radius:20px;
      border:2px solid var(--line); background:var(--panel-solid); cursor:pointer; transition:transform .08s,border-color .15s; position:relative; }
    .sl-btn:hover { border-color:var(--c); }
    .sl-btn:active { transform:scale(.94); }
    .sl-btn.right { border-color:var(--good); background:color-mix(in srgb,var(--good) 22%,var(--panel-solid)); }
    .sl-btn.wrong { border-color:var(--bad); background:color-mix(in srgb,var(--bad) 22%,var(--panel-solid)); }
    .sl-btn kbd { position:absolute; top:4px; left:8px; font:600 .7rem system-ui; color:var(--muted); }
    .sl-btn small { position:absolute; bottom:3px; right:8px; font:700 .8rem system-ui; color:var(--muted); }
    @keyframes sl-in { from { opacity:0; transform:translateY(10px); } }
  `);

  const q = h('div.sl-q');
  const scalesEl = h('div.sl-scales');
  const btns = h('div.sl-btns');
  api.stage.append(h('div.sl-wrap', scalesEl, q, btns));
  api.setScore(0);
  api.timer(60, finish);

  function drawScale(s, names, i) {
    const angle = s.r === 0 ? 0 : s.r > 0 ? -11 : 11; // heavier side goes down
    const rad = (angle * Math.PI) / 180;
    const end = (dx) => ({ x: 100 + dx * Math.cos(rad), y: 46 + dx * Math.sin(rad) });
    const pan = (side, dx) => {
      const p = end(dx);
      const items = side.map((j) => names[j]);
      const fs = items.length >= 3 ? 19 : items.length === 2 ? 23 : 28;
      const py = p.y + 34;
      const g = h('g',
        h('line.sl-ink', { x1: p.x, y1: p.y, x2: p.x - 26, y2: py, 'stroke-width': 1.5 }),
        h('line.sl-ink', { x1: p.x, y1: p.y, x2: p.x + 26, y2: py, 'stroke-width': 1.5 }),
        h('path.sl-pan', { d: `M${p.x - 34} ${py} L${p.x + 34} ${py} Q${p.x + 30} ${py + 9} ${p.x} ${py + 9} Q${p.x - 30} ${py + 9} ${p.x - 34} ${py} Z` }));
      items.forEach((name, k) => {
        const off = (k - (items.length - 1) / 2) * fs * 0.95;
        g.append(h('text.sl-obj', { x: p.x + off, y: py - 3, 'font-size': fs, 'text-anchor': 'middle' }, name));
      });
      return g;
    };
    const desc = s.L.map((j) => names[j]).join('') + (s.r === 0 ? ' = ' : s.r > 0 ? ' > ' : ' < ') + s.R.map((j) => names[j]).join('');
    return h('div.sl-scale', { style: { animationDelay: i * 70 + 'ms' }, 'aria-label': desc, title: desc },
      h('svg', { viewBox: '-10 -6 220 118' },
        h('path.sl-fill', { d: 'M88 112 L112 112 L103 50 L97 50 Z', opacity: 0.55 }),
        h('rect.sl-fill', { x: 70, y: 108, width: 60, height: 5, rx: 2.5 }),
        h('line.sl-ink', { x1: 100 - 70 * Math.cos(rad), y1: 46 - 70 * Math.sin(rad), x2: 100 + 70 * Math.cos(rad), y2: 46 + 70 * Math.sin(rad), 'stroke-width': 4 }),
        h('circle.sl-pivot', { cx: 100, cy: 46, r: 5 }),
        pan(s.L, -70), pan(s.R, 70)));
  }

  function show() {
    locked = false;
    puzzle = makePuzzle(level);
    scalesEl.className = 'sl-scales' + (puzzle.scales.length === 1 ? ' one' : puzzle.scales.length === 2 ? ' two' : '');
    scalesEl.replaceChildren(...puzzle.scales.map((s, i) => drawScale(s, puzzle.names, i)));
    q.replaceChildren('Which is the ', h('b', puzzle.want.toUpperCase()), '?');
    btns.replaceChildren(...puzzle.names.map((nm, i) => h('button.sl-btn', { type: 'button', onclick: (e) => answer(i, e) }, h('kbd', String(i + 1)), nm)));
    api.setInfo(`Puzzle ${n + 1}`);
  }

  function answer(i, e) {
    if (locked || api.ended) return;
    locked = true;
    n++;
    const b = btns.children;
    const x = e && e.clientX ? e.clientX : undefined, y = e && e.clientY ? e.clientY : undefined;
    if (i === puzzle.answer) {
      correct++;
      score += 10 + (level >= 3 && puzzle.group ? 5 : 0);
      b[i].classList.add('right');
      api.good(x, y);
    } else {
      wrong++;
      score = Math.max(0, score - 5);
      b[i].classList.add('wrong');
      b[puzzle.answer].classList.add('right');
      api.bad(x, y);
    }
    // reveal the hidden weights (relative), sorted
    [...b].forEach((el, j) => el.append(h('small', String(puzzle.weights[j]))));
    api.setScore(score);
    api.after(i === puzzle.answer ? 700 : 1600, show);
  }

  function finish() {
    api.end({ score, stats: { Correct: String(correct), Wrong: String(wrong), Accuracy: n ? Math.round((100 * correct) / n) + '%' : '—' } });
  }

  api.keys({ 1: () => answer(0), 2: () => answer(1), 3: () => answer(2), 4: () => puzzle.names.length > 3 && answer(3) });
  window.__cortexDebug = { get answerIndex() { return puzzle && puzzle.answer; }, get puzzle() { return puzzle; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  show();
}
