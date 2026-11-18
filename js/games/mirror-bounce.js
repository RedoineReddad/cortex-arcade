// Laser Mirrors: memorise the mirrors, then predict where the laser leaves the box.
// Twist: the mirrors vanish before the laser fires — trace it from memory.
import { rand, pick, sample, clamp } from '../core/util.js';

// Direction vectors are (dx, dy) with y pointing down.
//   '/'  : right→up, up→right, left→down, down→left   => (dx,dy) → (-dy,-dx)
//   '\'  : right→down, down→right, left→up, up→left   => (dx,dy) → (dy,dx)
export function reflect(type, dx, dy) { return type === '/' ? [-dy, -dx] : [dy, dx]; }

/** Trace a beam entering from `port` ({side, i}) through an N×N grid of mirrors (Map "r,c" → '/'|'\\'). */
export function trace(N, mirrors, port) {
  let r, c, dx, dy;
  if (port.side === 'T') { r = -1; c = port.i; dx = 0; dy = 1; }
  else if (port.side === 'B') { r = N; c = port.i; dx = 0; dy = -1; }
  else if (port.side === 'L') { r = port.i; c = -1; dx = 1; dy = 0; }
  else { r = port.i; c = N; dx = -1; dy = 0; }
  const pts = [[r, c]];
  const hit = new Set();
  let bounces = 0;
  for (let guard = 0; guard < 400; guard++) {
    r += dy; c += dx;
    if (r < 0) { pts.push([r, c]); return { exit: { side: 'T', i: c }, pts, hits: hit.size, bounces }; }
    if (r >= N) { pts.push([r, c]); return { exit: { side: 'B', i: c }, pts, hits: hit.size, bounces }; }
    if (c < 0) { pts.push([r, c]); return { exit: { side: 'L', i: r }, pts, hits: hit.size, bounces }; }
    if (c >= N) { pts.push([r, c]); return { exit: { side: 'R', i: r }, pts, hits: hit.size, bounces }; }
    const m = mirrors.get(r + ',' + c);
    if (m) { [dx, dy] = reflect(m, dx, dy); hit.add(r + ',' + c); bounces++; pts.push([r, c]); }
  }
  return null;
}

export default function start(api) {
  const { h, level } = api;
  const ROUNDS = 10;
  const N = [4, 5, 5, 6, 6][level - 1];
  const MIRRORS = [[2, 3], [3, 4], [4, 5], [5, 6], [6, 7]][level - 1];
  const MIN_HITS = level >= 2 ? 2 : 1;
  const MEMO = [3000, 2900, 2700, 2500, 2300][level - 1];
  const S = N + 2;

  api.css(`
    .mb-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(8px,1.8vh,16px); width:100%; }
    .mb-msg { font-size:clamp(1.15rem,4.6vw,1.5rem); font-weight:800; text-align:center; min-height:1.4em; }
    .mb-board { position:relative; width:min(100%,520px,calc(100dvh - 300px)); min-width:260px; aspect-ratio:1; }
    .mb-grid { display:grid; width:100%; height:100%; gap:0; }
    .mb-cell { margin:1.5px; border-radius:6px; background:color-mix(in srgb,var(--bg2) 85%,transparent); border:1px solid var(--line); }
    .mb-port { border-radius:50%; border:2px dashed var(--line); background:transparent; padding:0; margin:20%; cursor:default; display:grid; place-items:center;
      font-weight:900; font-size:clamp(.9rem,3.6vw,1.3rem); color:var(--c); transition:transform .1s, background .15s, border-color .15s; }
    .mb-board.mb-live .mb-port:not(.mb-emit) { cursor:pointer; border-style:solid; border-color:color-mix(in srgb,var(--c) 55%,var(--line)); background:var(--panel-solid); }
    .mb-board.mb-live .mb-port:not(.mb-emit):hover { background:color-mix(in srgb,var(--c) 25%,var(--panel-solid)); transform:scale(1.12); }
    .mb-port.mb-emit { margin:8%; border-radius:10px; border:0; background:var(--c); color:#fff; box-shadow:0 0 16px color-mix(in srgb,var(--c) 70%,transparent); animation:mb-in .35s ease-out; }
    @keyframes mb-in { from { transform:scale(.3); opacity:0; } to { transform:scale(1); opacity:1; } }
    .mb-port.mb-right { border:3px solid var(--good) !important; background:color-mix(in srgb,var(--good) 35%,var(--panel-solid)) !important; }
    .mb-port.mb-wrong { border:3px solid var(--bad) !important; background:color-mix(in srgb,var(--bad) 35%,var(--panel-solid)) !important; }
    .mb-svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible; }
    .mb-mirror { stroke:#7dd3fc; stroke-width:.11; stroke-linecap:round; transition:opacity .3s; filter:drop-shadow(0 0 .05px #7dd3fc); }
    .mb-mirror.mb-back { stroke:var(--text); stroke-width:.17; opacity:.35; }
    .mb-svg.mb-hide .mb-mirror { opacity:0; }
    .mb-beam { fill:none; stroke:#f43f5e; stroke-width:.1; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1; stroke-dashoffset:1;
      filter:drop-shadow(0 0 .08px #f43f5e); }
    .mb-beam.mb-draw { transition:stroke-dashoffset var(--mb-dur,1s) linear; stroke-dashoffset:0; }
    .mb-hitdot { fill:#f43f5e; }
    .mb-bar { width:min(100%,520px); height:6px; border-radius:99px; background:var(--line); overflow:hidden; }
    .mb-bar div { height:100%; width:100%; background:var(--c); }
    .mb-bar div.mb-run { transition:width var(--mb-memo) linear; width:0; }
  `);

  const msg = h('div.mb-msg', '');
  const sub = h('div.g-sub', '');
  const grid = h('div.mb-grid', { style: { gridTemplateColumns: `repeat(${S},1fr)`, gridTemplateRows: `repeat(${S},1fr)` } });
  const svg = h('svg.mb-svg');
  const board = h('div.mb-board', grid, svg);
  const barFill = h('div');
  const bar = h('div.mb-bar', barFill);
  api.stage.append(h('div.mb-wrap', msg, board, bar, sub));

  // grid track sizes, for mapping cell coordinates → SVG coordinates (unit = one inner cell)
  // the grid has no gaps (cells use margins) so the mapping is exact.
  svg.setAttribute('viewBox', `0 0 ${S} ${S}`);
  const cx = (c) => c + 1.5;

  const ports = new Map();
  const portKey = (p) => p.side + p.i;
  for (let gr = 0; gr < S; gr++) for (let gc = 0; gc < S; gc++) {
    const r = gr - 1, c = gc - 1;
    const edgeR = r < 0 || r >= N, edgeC = c < 0 || c >= N;
    if (edgeR && edgeC) { grid.append(h('div')); continue; }
    if (edgeR || edgeC) {
      const p = r < 0 ? { side: 'T', i: c } : r >= N ? { side: 'B', i: c } : c < 0 ? { side: 'L', i: r } : { side: 'R', i: r };
      const b = h('button.mb-port', { type: 'button', 'data-port': portKey(p), onclick: () => choose(p, b) });
      ports.set(portKey(p), b);
      grid.append(b);
    } else grid.append(h('div.mb-cell'));
  }

  let round = 0, score = 0, correct = 0, phase = 'idle', cur = null;
  api.setScore(0);

  const allPorts = [];
  for (let i = 0; i < N; i++) allPorts.push({ side: 'T', i }, { side: 'B', i }, { side: 'L', i }, { side: 'R', i });
  const cellsList = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cellsList.push([r, c]);

  function generate() {
    for (let need = MIN_HITS; need >= 1; need--) {
      for (let tries = 0; tries < 800; tries++) {
        const m = new Map();
        sample(cellsList, rand(MIRRORS[0], MIRRORS[1])).forEach(([r, c]) => m.set(r + ',' + c, pick(['/', '\\'])));
        const entry = pick(allPorts);
        const t = trace(N, m, entry);
        if (!t || t.hits < need || portKey(t.exit) === portKey(entry)) continue;
        return { mirrors: m, entry, ...t };
      }
    }
    return null;
  }

  function drawMirrors() {
    svg.replaceChildren();
    for (const [k, type] of cur.mirrors) {
      const [r, c] = k.split(',').map(Number);
      const x = cx(c) - 0.5, y = cx(r) - 0.5, a = 0.16, b = 0.84;
      const pts = type === '/' ? [x + a, y + b, x + b, y + a] : [x + a, y + a, x + b, y + b];
      const attrs = { x1: pts[0], y1: pts[1], x2: pts[2], y2: pts[3] };
      svg.append(h('line.mb-mirror.mb-back', attrs), h('line.mb-mirror', attrs));
    }
  }

  function newRound() {
    if (api.ended) return;
    cur = generate();
    phase = 'memo';
    board.classList.remove('mb-live');
    ports.forEach((b) => { b.className = 'mb-port'; b.textContent = ''; });
    svg.classList.remove('mb-hide');
    drawMirrors();
    msg.textContent = 'Memorise the mirrors';
    sub.textContent = `${cur.mirrors.size} mirrors`;
    api.setInfo(`Round ${round + 1}/${ROUNDS}`);
    api.setProgress(round / ROUNDS);
    bar.style.visibility = 'visible';
    barFill.className = ''; barFill.style.width = '100%';
    bar.style.setProperty('--mb-memo', MEMO + 'ms');
    void barFill.offsetWidth;
    barFill.classList.add('mb-run'); barFill.style.width = '';
    api.after(MEMO, () => {
      svg.classList.add('mb-hide');
      msg.textContent = '…';
      bar.style.visibility = 'hidden';
      api.after(450, fire);
    });
  }

  function fire() {
    const e = ports.get(portKey(cur.entry));
    e.classList.add('mb-emit');
    e.textContent = { T: '↓', B: '↑', L: '→', R: '←' }[cur.entry.side];
    api.sfx.tick();
    msg.textContent = 'Where does the laser exit?';
    sub.textContent = 'Tap an edge port';
    phase = 'answer';
    board.classList.add('mb-live');
  }

  function choose(p, btn) {
    if (phase !== 'answer' || api.ended || portKey(p) === portKey(cur.entry)) return;
    phase = 'reveal';
    board.classList.remove('mb-live');
    const ok = portKey(p) === portKey(cur.exit);
    const r = btn.getBoundingClientRect();
    if (ok) {
      correct++;
      score += 10 + 2 * cur.hits;
      api.good(r.left + r.width / 2, r.top + r.height / 2);
    } else {
      btn.classList.add('mb-wrong');
      api.bad(r.left + r.width / 2, r.top + r.height / 2);
    }
    api.setScore(score);
    msg.textContent = ok ? `Bullseye! +${10 + 2 * cur.hits}` : 'Missed — watch the beam';
    sub.textContent = `The beam hit ${cur.hits} mirror${cur.hits === 1 ? '' : 's'}`;
    svg.classList.remove('mb-hide');
    const beam = h('polyline.mb-beam', { points: cur.pts.map(([rr, cc]) => `${cx(cc)},${cx(rr)}`).join(' '), pathLength: 1 });
    const dur = clamp(0.35 + cur.pts.length * 0.18, 0.6, 1.6);
    beam.style.setProperty('--mb-dur', dur + 's');
    svg.append(beam);
    void beam.getBoundingClientRect();
    api.after(30, () => beam.classList.add('mb-draw'));
    api.after(dur * 1000 + 50, () => {
      ports.get(portKey(cur.exit)).classList.add('mb-right');
      round++;
      api.after(ok ? 900 : 1700, () => (round >= ROUNDS ? finish() : newRound()));
    });
  }

  function finish() {
    api.setProgress(1);
    api.end({ score, stats: { Correct: `${correct} / ${ROUNDS}`, Grid: `${N}×${N}` } });
  }

  window.__cortexDebug = { get exit() { return cur && phase === 'answer' ? portKey(cur.exit) : null; }, get cur() { return cur; }, get phase() { return phase; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  newRound();
}
