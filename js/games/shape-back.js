// Shape Back: N-back with a switching cue (compare SHAPE or COLOUR with the card N back).
import { rand, pick } from '../core/util.js';

const SHAPES = ['circle', 'square', 'triangle', 'star', 'hexagon'];
const COLORS = [
  { n: 'red', c: '#e11d2e' },
  { n: 'blue', c: '#2f6df6' },
  { n: 'green', c: '#16a34a' },
  { n: 'gold', c: '#eab308' },
  { n: 'purple', c: '#9333ea' },
];

function poly(n, r, rot = -Math.PI / 2, inner = 0) {
  const pts = [];
  const k = inner ? n * 2 : n;
  for (let i = 0; i < k; i++) {
    const rr = inner && i % 2 ? inner : r;
    const a = rot + (i * Math.PI * 2) / k;
    pts.push((rr * Math.cos(a)).toFixed(1) + ',' + (rr * Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}

export default function start(api) {
  const { h, level } = api;
  const N = level >= 3 ? 2 : 1;
  const TOTAL = 40;
  const limit = [2.8, 2.5, 2.9, 2.6, 2.3][level - 1];
  const colors = COLORS.slice(0, level <= 2 ? 4 : 5);

  api.css(`
    .sb-wrap { width: min(480px, 100%); display: flex; flex-direction: column; align-items: center; gap: clamp(10px, 2.4vh, 20px); }
    .sb-cue { display: flex; align-items: center; gap: 10px; padding: 8px 18px; border-radius: 99px; font-weight: 900; font-size: 1.25rem; letter-spacing: .08em;
      border: 3px solid var(--c); background: color-mix(in srgb, var(--c) 14%, var(--panel-solid)); }
    .sb-cue.sb-colour { border-color: #f97316; background: color-mix(in srgb, #f97316 16%, var(--panel-solid)); }
    .sb-cue.sb-mem { border-color: var(--line); background: var(--panel-solid); color: var(--muted); letter-spacing: .03em; }
    .sb-cue.sb-pulse { animation: sbPulse .55s ease-out; }
    @keyframes sbPulse { 0% { transform: scale(1.35); box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 60%, transparent); } 100% { transform: scale(1); box-shadow: 0 0 0 18px transparent; } }
    .sb-q { color: var(--muted); text-align: center; font-size: .95rem; min-height: 1.3em; }
    .sb-q b { color: var(--text); }
    .sb-card { position: relative; width: min(230px, 56vw); aspect-ratio: 1; border-radius: 24px; background: var(--panel-solid); border: 2px solid var(--line);
      box-shadow: var(--shadow); display: grid; place-items: center; }
    .sb-card svg { width: 78%; height: 78%; }
    .sb-card.sb-in { animation: sbIn .2s ease-out; }
    @keyframes sbIn { from { transform: translateX(40px) rotate(4deg); opacity: 0; } to { transform: none; opacity: 1; } }
    .sb-card.ok { border-color: var(--good); box-shadow: 0 0 0 4px color-mix(in srgb, var(--good) 35%, transparent); }
    .sb-card.no { border-color: var(--bad); box-shadow: 0 0 0 4px color-mix(in srgb, var(--bad) 35%, transparent); }
    .sb-count { position: absolute; top: 8px; left: 12px; font-size: .8rem; color: var(--muted); font-weight: 700; }
    .sb-bar { width: min(230px, 56vw); height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; }
    .sb-bar div { height: 100%; width: 100%; background: var(--c); transform-origin: left; }
    .sb-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: min(440px, 100%); }
    .sb-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 8px; }
    .sb-btn small { font-size: .72rem; color: var(--muted); font-weight: 600; }
    .sb-btns.off .sb-btn { opacity: .45; }
  `);

  const cue = h('div.sb-cue');
  const q = h('div.sb-q');
  const count = h('div.sb-count');
  const card = h('div.sb-card', count);
  const barFill = h('div');
  const bar = h('div.sb-bar', barFill);
  const noBtn = h('button.choice.sb-btn', { type: 'button', onpointerdown: (e) => { e.preventDefault(); answer(false); } }, '✗ No match', h('small', '← or F'));
  const yesBtn = h('button.choice.sb-btn', { type: 'button', onpointerdown: (e) => { e.preventDefault(); answer(true); } }, '✓ Match', h('small', '→ or J'));
  const btns = h('div.sb-btns.off', noBtn, yesBtn);
  api.stage.append(h('div.sb-wrap', cue, q, card, bar, btns));

  api.keys({ ArrowLeft: () => answer(false), f: () => answer(false), ArrowRight: () => answer(true), j: () => answer(true) });

  const cards = [];
  let i = -1, dim = pick(['shape', 'colour']), dimLeft = rand(3, 6);
  let awaiting = false, t0 = 0, cardTimer = null, barAnim = null;
  let score = 0, correct = 0, wrong = 0, misses = 0, lures = 0, luresOk = 0, answered = 0, rtSum = 0;
  api.setScore(0);

  function shapeSvg(shape, color) {
    const fill = color.c, stroke = 'rgba(0,0,0,.18)';
    const common = { fill, stroke, 'stroke-width': 3, 'stroke-linejoin': 'round' };
    let el;
    if (shape === 'circle') el = h('circle', { cx: 0, cy: 0, r: 40, ...common });
    else if (shape === 'square') el = h('rect', { x: -36, y: -36, width: 72, height: 72, rx: 6, ...common });
    else if (shape === 'triangle') el = h('polygon', { points: poly(3, 46, -Math.PI / 2), transform: 'translate(0 8)', ...common });
    else if (shape === 'star') el = h('polygon', { points: poly(5, 47, -Math.PI / 2, 20), transform: 'translate(0 3)', ...common });
    else el = h('polygon', { points: poly(6, 43, 0), ...common });
    return h('svg', { viewBox: '-50 -50 100 100' }, el);
  }

  function makeCard() {
    const idx = cards.length;
    if (idx < N) return { shape: pick(SHAPES), color: pick(colors), dim: null };
    if (--dimLeft < 0 || idx === N) {
      if (idx !== N) dim = dim === 'shape' ? 'colour' : 'shape';
      dimLeft = rand(3, 6) - 1;
    }
    const prev = cards[idx - N];
    const match = Math.random() < 0.4;
    const otherSame = Math.random() < (match ? 0.25 : 0.4); // lure when not matching
    const pickDiff = (arr, v) => pick(arr.filter((x) => x !== v));
    let shape, color;
    if (dim === 'shape') {
      shape = match ? prev.shape : pickDiff(SHAPES, prev.shape);
      color = otherSame ? prev.color : pickDiff(colors, prev.color);
    } else {
      color = match ? prev.color : pickDiff(colors, prev.color);
      shape = otherSame ? prev.shape : pickDiff(SHAPES, prev.shape);
    }
    return { shape, color, dim, match, lure: !match && otherSame };
  }

  function next() {
    if (api.ended) return;
    i++;
    if (i >= TOTAL) return finish();
    const c = makeCard();
    cards.push(c);
    api.setProgress(i / TOTAL);
    api.setInfo(`Card ${i + 1}/${TOTAL} · ${N}-back`);
    card.classList.remove('ok', 'no', 'sb-in'); void card.offsetWidth; card.classList.add('sb-in');
    card.replaceChildren(count, shapeSvg(c.shape, c.color));
    count.textContent = '#' + (i + 1);
    const prevDim = i > 0 ? cards[i - 1].dim : null;
    if (!c.dim) {
      cue.className = 'sb-cue sb-mem';
      cue.textContent = '🧠 MEMORISE';
      q.replaceChildren(i === 0 ? `Remember each card — you'll compare with the one ${N} back` : 'Keep remembering…');
      btns.classList.add('off');
      awaiting = false;
      runBar(1.4);
      cardTimer = api.after(1400, next);
      return;
    }
    cue.className = 'sb-cue' + (c.dim === 'colour' ? ' sb-colour' : '');
    cue.textContent = c.dim === 'shape' ? '◆ SHAPE' : '🎨 COLOUR';
    if (c.dim !== prevDim) { void cue.offsetWidth; cue.classList.add('sb-pulse'); api.sfx.tick(); }
    q.replaceChildren('Same ', h('b', c.dim.toUpperCase()), ` as ${N === 1 ? 'the previous card' : '2 cards back'}?`);
    btns.classList.remove('off');
    awaiting = true;
    t0 = performance.now();
    runBar(limit);
    cardTimer = api.after(limit * 1000, () => { if (awaiting) timeout(); });
  }

  function runBar(sec) {
    barAnim && barAnim.cancel();
    barAnim = barFill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
  }

  function timeout() {
    awaiting = false;
    misses++; wrong++;
    score = Math.max(0, score - 5);
    api.setScore(score);
    card.classList.add('no');
    api.bad();
    api.banner('Too slow!', 600);
    api.after(650, next);
  }

  function answer(saidMatch) {
    if (!awaiting || api.ended) return;
    awaiting = false;
    api.clear(cardTimer);
    barAnim && barAnim.pause();
    const c = cards[i];
    const ok = saidMatch === c.match;
    answered++;
    if (c.lure) { lures++; if (ok) luresOk++; }
    const btn = saidMatch ? yesBtn : noBtn;
    const r = btn.getBoundingClientRect();
    if (ok) {
      correct++; rtSum += (performance.now() - t0) / 1000;
      score += 10;
      card.classList.add('ok');
      api.good(r.left + r.width / 2, r.top);
    } else {
      wrong++;
      score = Math.max(0, score - 5);
      card.classList.add('no');
      api.bad(r.left + r.width / 2, r.top);
      const prev = cards[i - N];
      api.banner(c.match ? `It matched (${c.dim})` : `${N} back was ${c.dim === 'shape' ? 'a ' + prev.shape : prev.color.n}`, 800);
    }
    api.setScore(score);
    api.after(ok ? 280 : 800, next);
  }

  function finish() {
    if (api.ended) return;
    api.setProgress(1);
    const judged = correct + wrong;
    api.end({
      score,
      stats: {
        Correct: `${correct} / ${judged}`,
        Accuracy: judged ? Math.round((100 * correct) / judged) + '%' : '–',
        'Lures resisted': lures ? `${luresOk} / ${lures}` : '–',
        'Too slow': String(misses),
        'Avg time': correct ? (rtSum / correct).toFixed(2) + 's' : '–',
      },
    });
  }

  api.timer(60, finish);
  api.onCleanup(() => barAnim && barAnim.cancel());
  window.__cortexDebug = { get expect() { return awaiting ? cards[i].match : null; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  next();
}
