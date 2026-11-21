// Flock Focus: flanker task. Day → centre bird's direction. Dusk → the whole flock's drift direction.
import { pick, clamp } from '../core/util.js';

const DIRS = ['up', 'right', 'down', 'left'];
const ANGLE = { right: 0, down: 90, left: 180, up: 270 };
const VEC = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

const FORMATIONS = {
  line: [[0, 0], [-64, 0], [-128, 0], [64, 0], [128, 0]],
  plus: [[0, 0], [-68, 0], [68, 0], [0, -68], [0, 68]],
  vee: [[0, -34], [-60, 0], [-120, 34], [60, 0], [120, 34]],
  veeDown: [[0, 34], [-60, 0], [-120, -34], [60, 0], [120, -34]],
  cross: [[0, 0], [-60, -55], [60, -55], [-60, 55], [60, 55]],
};

export default function start(api) {
  const { h, level } = api;
  const duskRate = 0.3 + 0.05 * level; // 35% … 55%
  const forms = level <= 2 ? ['line'] : level === 3 ? ['line', 'plus', 'vee'] : ['line', 'plus', 'vee', 'veeDown', 'cross'];
  const incongruentRate = [0.4, 0.45, 0.5, 0.55, 0.6][level - 1];
  const driftSpeed = 55 + level * 6; // viewBox units / s

  api.css(`
    .ff-wrap { width: min(620px, 100%); flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .ff-sky {
      position: relative; width: 100%; flex: 1; min-height: 220px; max-height: 520px; border-radius: 22px; overflow: hidden;
      background: linear-gradient(#5aa7f0, #a9dcff); transition: background .35s; touch-action: none; cursor: grab;
      box-shadow: inset 0 0 0 2px rgba(255,255,255,.25);
    }
    .ff-sky.ff-dusk { background: linear-gradient(#f2703a, #ffc46b 70%, #ffd89a); }
    .ff-sky svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .ff-sun { transition: fill .35s, cy .35s; }
    .ff-tag {
      position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 2; white-space: nowrap;
      padding: 6px 14px; border-radius: 99px; font-weight: 800; font-size: .95rem;
      background: rgba(255,255,255,.88); color: #12305a; box-shadow: 0 3px 10px rgba(0,0,0,.15);
    }
    .ff-dusk .ff-tag { color: #7a2a05; }
    .ff-tag.ff-pulse { animation: ffPulse .45s ease-out; }
    @keyframes ffPulse { from { transform: translateX(-50%) scale(1.25); } to { transform: translateX(-50%) scale(1); } }
    .ff-bird-in { animation: ffFlap .35s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
    @keyframes ffFlap { to { transform: scaleY(.72); } }
    .ff-pad { display: grid; grid-template-columns: repeat(3, 64px); grid-template-rows: repeat(2, 56px); gap: 8px; }
    .ff-btn { font-size: 1.7rem; padding: 0; border-radius: 16px; }
    .ff-btn.ff-up { grid-column: 2; grid-row: 1; }
    .ff-btn.ff-left { grid-column: 1; grid-row: 2; }
    .ff-btn.ff-down { grid-column: 2; grid-row: 2; }
    .ff-btn.ff-right { grid-column: 3; grid-row: 2; }
    .ff-hint { font-size: .85rem; }
    @media (min-width: 700px) { .ff-pad { grid-template-columns: repeat(3, 76px); grid-template-rows: repeat(2, 60px); } }
  `);

  const svg = h('svg', { viewBox: '-200 -150 400 300', preserveAspectRatio: 'xMidYMid meet' });
  const sun = h('circle.ff-sun', { cx: 150, cy: -105, r: 22, fill: '#fff6b0', opacity: 0.9 });
  const clouds = h('g', { opacity: 0.55, fill: '#fff' },
    h('ellipse', { cx: -140, cy: -95, rx: 40, ry: 12 }), h('ellipse', { cx: -118, cy: -103, rx: 22, ry: 11 }),
    h('ellipse', { cx: 110, cy: 110, rx: 46, ry: 12 }), h('ellipse', { cx: 132, cy: 101, rx: 22, ry: 10 }));
  const flock = h('g');
  svg.append(sun, clouds, flock);
  const tag = h('div.ff-tag', '☀️ Day: centre bird');
  const sky = h('div.ff-sky.tap', tag, svg);
  const pad = h('div.ff-pad', DIRS.map((d) =>
    h('button.choice.ff-btn.ff-' + d, { type: 'button', 'aria-label': d, onpointerdown: (e) => { e.preventDefault(); answer(d, e); } }, ARROW[d])));
  const hint = h('div.g-sub.ff-hint', 'Arrows / WASD / swipe');
  api.stage.append(h('div.ff-wrap', sky, pad, hint));

  function bird(dir, x, y, centre, fill) {
    const inner = h('g.ff-bird-in',
      h('path', { d: 'M25 0 Q15 -5 6 -4 Q0 -21 -13 -25 Q-6 -11 -8 -4 L-21 -8 L-16 0 L-21 8 L-8 4 Q-6 11 -13 25 Q0 21 6 4 Q15 5 25 0 Z', fill, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1 }),
      h('path', { d: 'M24 0 L17 -3 L17 3 Z', fill: '#f59e0b' }));
    inner.style.animationDelay = (-Math.random() * 0.35).toFixed(2) + 's';
    const g = h('g', { transform: `translate(${x} ${y}) rotate(${ANGLE[dir]}) scale(1.25)` }, inner);
    const wrap = h('g');
    if (centre) wrap.append(h('circle', { cx: x, cy: y, r: 36, fill: 'rgba(255,255,255,.28)', stroke: 'rgba(255,255,255,.6)', 'stroke-width': 1.5 }));
    wrap.append(g);
    return wrap;
  }

  let score = 0, n = 0, correct = 0, rtSum = 0, dayN = 0, dayOk = 0, duskN = 0, duskOk = 0;
  let trial = null, locked = true, isDusk = false, drift = null;
  api.setScore(0);

  function makeTrial() {
    const dusk = Math.random() < duskRate;
    const centre = pick(DIRS);
    const r = Math.random();
    let flankers;
    if (r < incongruentRate) { const f = Math.random() < 0.6 ? OPP[centre] : pick(DIRS.filter((d) => d !== centre && d !== OPP[centre])); flankers = [f, f, f, f]; }
    else if (r < incongruentRate + 0.15 && level >= 2) flankers = [0, 1, 2, 3].map(() => pick(DIRS));
    else flankers = [centre, centre, centre, centre];
    const dirs = [centre, ...flankers];
    let move = null;
    if (dusk) {
      // Drift direction differs from the centre bird and from where most birds point.
      const counts = {};
      dirs.forEach((d) => (counts[d] = (counts[d] || 0) + 1));
      const opts = DIRS.filter((d) => d !== centre && (counts[d] || 0) <= 1);
      move = pick(opts.length ? opts : DIRS.filter((d) => d !== centre));
    }
    const form = pick(forms);
    return { dusk, dirs, move, form, answer: dusk ? move : centre };
  }

  function next() {
    if (api.ended) return;
    flock.replaceChildren();
    trial = makeTrial();
    const changed = trial.dusk !== isDusk;
    isDusk = trial.dusk;
    sky.classList.toggle('ff-dusk', isDusk);
    sun.setAttribute('fill', isDusk ? '#ffefc2' : '#fff6b0');
    sun.setAttribute('cy', isDusk ? 120 : -105);
    tag.textContent = isDusk ? '🌇 Dusk: where is the flock MOVING?' : '☀️ Day: where does the CENTRE bird point?';
    if (changed) { tag.classList.remove('ff-pulse'); void tag.offsetWidth; tag.classList.add('ff-pulse'); }
    // Short empty-sky pause so the sky change registers before the birds appear.
    api.after(changed ? 420 : 200, show);
  }

  function show() {
    if (api.ended) return;
    const pos = FORMATIONS[trial.form];
    const fill = isDusk ? '#2a1a2e' : '#1d2a44';
    const g = h('g');
    trial.dirs.forEach((d, i) => g.append(bird(d, pos[i][0], pos[i][1], i === 0 && !isDusk && trial.form !== 'line', fill)));
    flock.append(g);
    trial.t0 = performance.now();
    locked = false;
    if (trial.dusk) {
      const [vx, vy] = VEC[trial.move];
      // Symmetric sweep so the widest formation (±128 plus a bird) never leaves the 400-wide view.
      const span = 60, start = -60;
      drift && drift.stop();
      drift = api.loop((dt, el) => {
        if (locked || api.ended) return false;
        let p = start + el * driftSpeed;
        if (p > span) p = start + ((p - start) % (span - start));
        const fade = clamp(Math.min(p - start, span - p) / 25, 0.15, 1);
        g.setAttribute('transform', `translate(${vx * p * 0.6} ${vy * p * 0.4})`);
        g.setAttribute('opacity', fade.toFixed(2));
      });
    }
  }

  function answer(dir, e) {
    if (locked || api.ended || !trial) return;
    locked = true;
    n++;
    const rt = (performance.now() - trial.t0) / 1000;
    const ok = dir === trial.answer;
    const btn = pad.querySelector('.ff-' + dir);
    const r = btn.getBoundingClientRect();
    if (trial.dusk) duskN++; else dayN++;
    if (ok) {
      correct++; rtSum += rt;
      if (trial.dusk) duskOk++; else dayOk++;
      const limit = trial.dusk ? 1.5 : 1.2;
      score += 10 + Math.round(5 * clamp((limit - rt) / 0.8, 0, 1));
      btn.classList.add('right');
      api.good(r.left + r.width / 2, r.top);
    } else {
      score = Math.max(0, score - 5);
      btn.classList.add('wrong');
      pad.querySelector('.ff-' + trial.answer).classList.add('right');
      api.bad(r.left + r.width / 2, r.top);
      api.banner((trial.dusk ? 'Flock moved ' : 'Centre bird pointed ') + ARROW[trial.answer], 700);
    }
    api.setScore(score);
    api.after(ok ? 260 : 750, () => {
      pad.querySelectorAll('.ff-btn').forEach((b) => b.classList.remove('right', 'wrong'));
      next();
    });
  }

  const K = (d) => () => answer(d);
  api.keys({ ArrowUp: K('up'), ArrowDown: K('down'), ArrowLeft: K('left'), ArrowRight: K('right'), w: K('up'), s: K('down'), a: K('left'), d: K('right') });

  // Swipe on the sky.
  let sw = null;
  api.on(sky, 'pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  api.on(sky, 'pointerup', (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    sw = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    answer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  api.on(sky, 'pointercancel', () => { sw = null; });

  api.timer(45, () => {
    locked = true;
    const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
    api.end({
      score,
      stats: {
        Correct: `${correct} / ${n}`,
        'Day accuracy': pct(dayOk, dayN),
        'Dusk accuracy': pct(duskOk, duskN),
        'Avg time': correct ? (rtSum / correct).toFixed(2) + 's' : '–',
      },
    });
  });

  window.__cortexDebug = { get answer() { return trial && !locked ? trial.answer : null; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  next();
}
