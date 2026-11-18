// Trail Mix: Trail-Making-Test-B. Tap 1 → A → 2 → B … as fast as you can.
// Twist: halfway through each board, every dot you have not reached yet jumps to a new spot.
import { clamp, randf } from '../core/util.js';

export default function start(api) {
  const { h, level } = api;
  const BOARDS = 3;
  const PAIRS = [6, 7, 8, 9, 10][level - 1];
  const N = PAIRS * 2;
  const TOTAL = BOARDS * N;
  const LETTERS = 'ABCDEFGHIJ';
  const labels = [];
  for (let i = 0; i < PAIRS; i++) labels.push(String(i + 1), LETTERS[i]);

  api.css(`
    .tm-top { display:flex; flex-direction:column; align-items:center; gap:4px; flex:0 0 auto; }
    .tm-seq { display:flex; gap:4px; flex-wrap:wrap; justify-content:center; font-weight:700; font-size:.95rem; color:var(--muted); }
    .tm-seq b { color:var(--c); font-size:1.15rem; min-width:1.4em; text-align:center; }
    .tm-board { position:relative; flex:1 1 auto; width:min(100%, 900px); min-height:0; border-radius:18px;
      background:color-mix(in srgb, var(--bg2) 70%, transparent); border:1px solid var(--line); overflow:hidden; }
    .tm-svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
    .tm-svg polyline { fill:none; stroke:var(--c); stroke-width:4; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; opacity:.85; }
    .tm-node { position:absolute; transform:translate(-50%,-50%); border-radius:50%; border:3px solid var(--c);
      background:var(--panel-solid); color:var(--text); font-weight:800; display:grid; place-items:center; padding:0;
      cursor:pointer; transition:left .5s cubic-bezier(.5,0,.3,1.2), top .5s cubic-bezier(.5,0,.3,1.2), background .15s, transform .1s;
      font-variant-numeric:tabular-nums; z-index:2; touch-action:manipulation; }
    .tm-node.tm-letter { border-style:solid; border-color:color-mix(in srgb, var(--c) 55%, var(--text)); border-radius:30%; }
    .tm-node:active { transform:translate(-50%,-50%) scale(.92); }
    .tm-node.tm-done { background:var(--c); color:#fff; border-color:var(--c); cursor:default; opacity:.9; }
    .tm-node.tm-last { box-shadow:0 0 0 5px color-mix(in srgb, var(--c) 35%, transparent); }
    .tm-node.tm-wrong { background:color-mix(in srgb, var(--bad) 35%, var(--panel-solid)); border-color:var(--bad); animation:tm-wob .35s; }
    .tm-node.tm-moving { box-shadow:0 0 0 4px color-mix(in srgb, var(--c) 25%, transparent); }
    @keyframes tm-wob { 25%{transform:translate(-50%,-50%) rotate(-10deg)} 75%{transform:translate(-50%,-50%) rotate(10deg)} }
    .tm-board.tm-shuffle { animation:tm-glow .6s; }
    @keyframes tm-glow { 50% { box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--c) 50%, transparent); } }
  `);

  const seq = h('div.tm-seq');
  const sub = h('div.g-sub');
  const board = h('div.tm-board');
  api.stage.append(h('div.tm-top', seq, sub), board);

  const sw = api.stopwatch();
  let boardNo = 0, errors = 0, penalty = 0, doneTotal = 0;
  let nodes = [], next = 0, busy = false, polyline;
  api.setScore(0);

  // Non-overlapping random positions (px), avoiding `fixed` points.
  function scatter(count, fixed, W, H, D) {
    const pad = D / 2 + 6;
    for (let minD = D * 1.6; minD > D * 0.9; minD *= 0.93) {
      const pts = [];
      let tries = 0;
      while (pts.length < count && tries < 4000) {
        tries++;
        const p = { x: randf(pad, W - pad), y: randf(pad, H - pad) };
        if ([...fixed, ...pts].every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= minD)) pts.push(p);
      }
      if (pts.length === count) return pts;
    }
    // fallback: loose grid
    const cols = Math.ceil(Math.sqrt(count * W / H));
    const rows = Math.ceil(count / cols);
    return Array.from({ length: count }, (_, i) => ({ x: pad + ((i % cols) + 0.5) * (W - 2 * pad) / cols, y: pad + (Math.floor(i / cols) + 0.5) * (H - 2 * pad) / rows }));
  }

  function dims() {
    const r = board.getBoundingClientRect();
    const W = Math.max(200, r.width), H = Math.max(200, r.height);
    const D = clamp(Math.sqrt((W * H) / N) * 0.42, 38, 60);
    return { W, H, D };
  }

  function place(n, p, W, H) {
    n.x = (p.x / W) * 100; n.y = (p.y / H) * 100;
    n.el.style.left = n.x + '%'; n.el.style.top = n.y + '%';
  }

  function updateSeq() {
    seq.replaceChildren();
    for (let k = Math.max(0, next - 2); k < Math.min(N, next + 3); k++) {
      if (k > Math.max(0, next - 2)) seq.append('→');
      seq.append(k === next ? h('b', labels[k]) : h('span', { style: { opacity: k < next ? 0.5 : 1 } }, k > next && level >= 3 ? '?' : labels[k]));
    }
    sub.textContent = next < Math.ceil(N / 2) ? 'Alternate numbers and letters' : 'Keep going: the rest have moved!';
  }

  function drawTrail() {
    polyline.setAttribute('points', nodes.slice(0, next).map((n) => `${n.x},${n.y}`).join(' '));
  }

  function newBoard() {
    board.replaceChildren();
    const svg = h('svg.tm-svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
    polyline = h('polyline', { points: '' });
    svg.append(polyline);
    board.append(svg);
    const { W, H, D } = dims();
    const pts = scatter(N, [], W, H, D);
    nodes = labels.map((lab, i) => {
      const el = h('button.tm-node' + (i % 2 ? '.tm-letter' : ''), {
        type: 'button', 'data-i': i,
        style: { width: D + 'px', height: D + 'px', fontSize: D * 0.42 + 'px', transition: 'none' },
        onpointerdown: (e) => { e.preventDefault(); tap(i, e); },
      }, lab);
      const n = { el, i, x: 0, y: 0 };
      place(n, pts[i], W, H);
      board.append(el);
      return n;
    });
    void board.offsetWidth;
    nodes.forEach((n) => (n.el.style.transition = ''));
    next = 0;
    busy = false;
    api.setInfo(`Board ${boardNo + 1}/${BOARDS}`);
    updateSeq();
  }

  function reshuffle() {
    const { W, H, D } = dims();
    const fixed = nodes.slice(0, next).map((n) => ({ x: (n.x / 100) * W, y: (n.y / 100) * H }));
    const pts = scatter(N - next, fixed, W, H, D);
    nodes.slice(next).forEach((n, k) => { n.el.classList.add('tm-moving'); place(n, pts[k], W, H); });
    board.classList.remove('tm-shuffle'); void board.offsetWidth; board.classList.add('tm-shuffle');
    api.sfx.note && api.sfx.note(7);
    api.after(550, () => nodes.forEach((n) => n.el.classList.remove('tm-moving')));
  }

  function tap(i, e) {
    if (api.ended || busy || i < next) return;
    const n = nodes[i];
    if (i !== next) {
      errors++; penalty += 1;
      api.bad(e.clientX, e.clientY);
      api.setInfo(`Board ${boardNo + 1}/${BOARDS} · +${penalty}s`);
      n.el.classList.remove('tm-wrong'); void n.el.offsetWidth; n.el.classList.add('tm-wrong');
      api.after(400, () => n.el.classList.remove('tm-wrong'));
      return;
    }
    if (next > 0) nodes[next - 1].el.classList.remove('tm-last');
    n.el.classList.add('tm-done', 'tm-last');
    next++; doneTotal++;
    api.sfx.tick();
    drawTrail();
    api.setProgress(doneTotal / TOTAL);
    api.setScore(doneTotal);
    updateSeq();
    if (next === Math.ceil(N / 2)) reshuffle();
    if (next === N) {
      busy = true;
      api.good();
      boardNo++;
      if (boardNo >= BOARDS) return finish();
      api.banner(`Board ${boardNo + 1} / ${BOARDS}`, 700);
      api.after(750, () => { if (!api.ended) newBoard(); });
    }
  }

  function finish() {
    sw.stop();
    const t = sw.elapsed + penalty;
    const perNode = t / TOTAL;
    // normalised to the 36-dot level-1 game: ~1.2 s per dot ≈ 130
    const score = Math.max(0, Math.round(200 - perNode * 36 * 1.6 - errors * 5));
    api.end({ score, stats: { Time: t.toFixed(1) + 's', Errors: String(errors), 'Per dot': perNode.toFixed(2) + 's', Dots: String(TOTAL) } });
  }

  window.__cortexDebug = { get next() { return next; }, get board() { return boardNo; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  newBoard();
}
