// Blind Walk: follow the directions in your head, then tap where the walker ends up.
// Twist: some steps are relative to the walker's facing ("Turn left", "Forward 2").
import { rand, pick, clamp } from '../core/util.js';

const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1]; // facing: 0 N, 1 E, 2 S, 3 W
const ARROW = ['↑', '→', '↓', '←'];

export default function start(api) {
  const { h, level } = api;
  const ROUNDS = 10;
  const G = [5, 5, 6, 6, 7][level - 1];
  const SPEED = [1100, 1100, 950, 850, 760][level - 1];
  const REL_P = [0.3, 0.38, 0.45, 0.5, 0.55][level - 1];
  const MAXN = G >= 6 ? 3 : 2;

  api.css(`
    .bw-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(10px,2vh,18px); width:100%; }
    .bw-panel { width:min(100%,460px); min-height:clamp(84px,13vh,110px); border-radius:18px; border:2px solid var(--line); background:var(--panel-solid);
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:8px 12px; }
    .bw-ins { font-size:clamp(1.7rem,7vw,2.6rem); font-weight:800; text-align:center; line-height:1.1; }
    .bw-ins.bw-rel { color:var(--c); }
    .bw-ins.bw-pop { animation:bw-pop .25s ease-out; }
    @keyframes bw-pop { from { transform:scale(.7); opacity:0; } to { transform:scale(1); opacity:1; } }
    .bw-dots { display:flex; gap:6px; }
    .bw-dots i { width:9px; height:9px; border-radius:50%; background:var(--line); }
    .bw-dots i.on { background:var(--c); }
    .bw-hint { font-size:.9rem; color:var(--muted); text-align:center; }
    .bw-board { position:relative; width:min(100%,460px,calc(100dvh - 380px)); min-width:240px; aspect-ratio:1; }
    .bw-grid { display:grid; width:100%; height:100%; gap:4px; }
    .bw-cell { border-radius:10px; border:1px solid var(--line); background:color-mix(in srgb,var(--bg2) 80%,transparent); padding:0; cursor:default; position:relative; }
    .bw-grid.bw-live .bw-cell { cursor:pointer; background:var(--panel-solid); }
    .bw-grid.bw-live .bw-cell:hover, .bw-cell.bw-cur { border-color:var(--c); box-shadow:inset 0 0 0 2px var(--c); }
    .bw-cell.bw-right { background:color-mix(in srgb,var(--good) 35%,var(--panel-solid)) !important; border-color:var(--good); }
    .bw-cell.bw-wrong { background:color-mix(in srgb,var(--bad) 35%,var(--panel-solid)) !important; border-color:var(--bad); }
    .bw-start { position:absolute; inset:12%; border-radius:50%; background:var(--c); color:var(--c-ink); display:grid; place-items:center;
      font-size:clamp(1rem,5vw,1.6rem); font-weight:900; box-shadow:0 4px 12px color-mix(in srgb,var(--c) 45%,transparent); pointer-events:none; }
    .bw-start span { display:block; transition:transform .25s; }
    .bw-svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
    .bw-svg polyline { fill:none; stroke:var(--c); stroke-width:.14; stroke-linecap:round; stroke-linejoin:round; opacity:.85;
      stroke-dasharray:1; stroke-dashoffset:1; }
    .bw-svg polyline.bw-draw { transition:stroke-dashoffset var(--bw-dur,1s) linear; stroke-dashoffset:0; }
    .bw-svg circle { fill:var(--c); }
    .bw-recap { display:flex; flex-wrap:wrap; gap:4px; justify-content:center; max-width:460px; min-height:1.6em; }
    .bw-recap span { padding:2px 8px; border-radius:99px; font-weight:700; font-size:.85rem; background:color-mix(in srgb,var(--c) 12%,transparent); }
    .bw-recap span.bw-rel { background:color-mix(in srgb,var(--c) 30%,transparent); }
  `);

  const ins = h('div.bw-ins', '');
  const dots = h('div.bw-dots');
  const hint = h('div.bw-hint', '');
  const grid = h('div.bw-grid', { style: { gridTemplateColumns: `repeat(${G},1fr)`, gridTemplateRows: `repeat(${G},1fr)` } });
  const svg = h('svg.bw-svg', { viewBox: `0 0 ${G} ${G}` });
  const recap = h('div.bw-recap');
  api.stage.append(h('div.bw-wrap', h('div.bw-panel', ins, dots), h('div.bw-board', grid, svg), hint, recap));

  const cells = [];
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
    const b = h('button.bw-cell', { type: 'button', 'data-r': r, 'data-c': c, onclick: () => choose(r, c) });
    cells.push(b);
    grid.append(b);
  }
  const cell = (r, c) => cells[r * G + c];

  let round = 0, score = 0, correct = 0, cur = null, live = false, cursor = null;
  api.setScore(0);

  const inside = (r, c) => r >= 0 && c >= 0 && r < G && c < G;

  // Generate an instruction list of `count` steps that never leaves the grid.
  function generate(count) {
    for (let tries = 0; tries < 500; tries++) {
      const r0 = rand(0, G - 1), c0 = rand(0, G - 1), f0 = rand(0, 3);
      let r = r0, c = c0, f = f0, pendingTurn = false, ok = true;
      const list = [], path = [[r, c]];
      const move = (d, n) => { for (let k = 0; k < n; k++) { r += DR[d]; c += DC[d]; path.push([r, c]); } };
      const fits = (d) => [1, 2, 3].filter((n) => n <= MAXN && inside(r + DR[d] * n, c + DC[d] * n));
      for (let k = 0; k < count && ok; k++) {
        const left = count - k;
        const prevTurn = list.length && list[list.length - 1].kind === 'turn';
        if (pendingTurn && left === 1) {
          const ns = fits(f);
          if (!ns.length) { ok = false; break; }
          const n = pick(ns); list.push({ kind: 'fwd', n, text: `Forward ${n}`, rel: true }); move(f, n); pendingTurn = false;
          continue;
        }
        if (Math.random() < REL_P) {
          if (left > 1 && !prevTurn && Math.random() < 0.55) {
            const t = pick(['L', 'L', 'R', 'R', 'A']);
            f = (f + (t === 'L' ? 3 : t === 'R' ? 1 : 2)) % 4;
            list.push({ kind: 'turn', text: t === 'L' ? 'Turn left ↺' : t === 'R' ? 'Turn right ↻' : 'About-face ⟲', rel: true });
            pendingTurn = true;
            continue;
          }
          const ns = fits(f);
          if (ns.length) { const n = pick(ns); list.push({ kind: 'fwd', n, text: `Forward ${n}`, rel: true }); move(f, n); pendingTurn = false; continue; }
        }
        const dirs = [0, 1, 2, 3].filter((d) => fits(d).length);
        if (!dirs.length) { ok = false; break; }
        const d = pick(dirs), n = pick(fits(d));
        list.push({ kind: 'abs', n, text: `${ARROW[d]} ${n}`, rel: false });
        move(d, n);
      }
      if (!ok || pendingTurn || list[list.length - 1].kind === 'turn') continue;
      if (r === r0 && c === c0) continue;
      // at least one relative step from round 2 on, so the twist always matters
      if (round >= 1 && !list.some((x) => x.rel)) continue;
      return { r0, c0, f0, r, c, list, path };
    }
    return null;
  }

  function newRound() {
    if (api.ended) return;
    const count = Math.min(7, 3 + Math.floor(round / 2) + (level >= 4 ? 1 : 0));
    cur = generate(count) || generate(3);
    live = false; cursor = null;
    grid.classList.remove('bw-live');
    cells.forEach((b) => { b.className = 'bw-cell'; b.replaceChildren(); });
    svg.replaceChildren();
    recap.replaceChildren();
    const tok = h('div.bw-start', h('span', { style: { transform: `rotate(${cur.f0 * 90}deg)` } }, '↑'));
    cell(cur.r0, cur.c0).append(tok);
    cur.tokArrow = tok.firstChild;
    dots.replaceChildren(...cur.list.map(() => h('i')));
    ins.className = 'bw-ins';
    ins.textContent = 'Ready…';
    hint.textContent = `Start here, facing ${['north ↑', 'east →', 'south ↓', 'west ←'][cur.f0]}`;
    api.setInfo(`Round ${round + 1}/${ROUNDS}`);
    api.setProgress(round / ROUNDS);
    let k = 0;
    const show = () => {
      if (api.ended) return;
      if (k >= cur.list.length) return askAnswer();
      const it = cur.list[k];
      ins.className = 'bw-ins' + (it.rel ? ' bw-rel' : '');
      ins.textContent = it.text;
      void ins.offsetWidth; ins.classList.add('bw-pop');
      dots.children[k].classList.add('on');
      api.sfx.note ? api.sfx.note(k % 8) : api.sfx.tick();
      k++;
      api.after(SPEED, () => { if (api.ended) return; ins.textContent = ''; api.after(140, show); });
    };
    api.after(1500, show);
  }

  function askAnswer() {
    ins.className = 'bw-ins';
    ins.textContent = 'Where is it now?';
    hint.textContent = 'Tap the final square (or use arrows + Enter)';
    live = true;
    grid.classList.add('bw-live');
  }

  function choose(r, c) {
    if (!live || api.ended) return;
    live = false;
    grid.classList.remove('bw-live');
    if (cursor) cell(cursor[0], cursor[1]).classList.remove('bw-cur');
    const ok = r === cur.r && c === cur.c;
    const b = cell(r, c).getBoundingClientRect();
    if (ok) {
      correct++;
      score += 10 + 2 * Math.max(0, cur.list.length - 3);
      api.good(b.left + b.width / 2, b.top + b.height / 2);
      cell(r, c).classList.add('bw-right');
    } else {
      api.bad(b.left + b.width / 2, b.top + b.height / 2);
      cell(r, c).classList.add('bw-wrong');
    }
    api.setScore(score);
    reveal(ok);
  }

  function reveal(ok) {
    const pts = cur.path.map(([r, c]) => `${c + 0.5},${r + 0.5}`).join(' ');
    const line = h('polyline', { points: pts, pathLength: 1 });
    const dur = clamp(cur.path.length * 0.12, 0.5, 1.4);
    line.style.setProperty('--bw-dur', dur + 's');
    svg.append(line, h('circle', { cx: cur.c0 + 0.5, cy: cur.r0 + 0.5, r: 0.12 }));
    void line.getBoundingClientRect();
    api.after(30, () => line.classList.add('bw-draw'));
    recap.replaceChildren(...cur.list.map((it) => h('span' + (it.rel ? '.bw-rel' : ''), it.text)));
    ins.textContent = ok ? 'Correct!' : 'Not quite';
    hint.textContent = '';
    api.after(dur * 1000 + 50, () => {
      cell(cur.r, cur.c).classList.add('bw-right');
      round++;
      api.after(ok ? 900 : 1600, () => (round >= ROUNDS ? finish() : newRound()));
    });
  }

  function moveCursor(dr, dc) {
    if (!live) return;
    if (cursor) cell(cursor[0], cursor[1]).classList.remove('bw-cur');
    cursor = cursor ? [clamp(cursor[0] + dr, 0, G - 1), clamp(cursor[1] + dc, 0, G - 1)] : [cur.r0, cur.c0];
    cell(cursor[0], cursor[1]).classList.add('bw-cur');
  }
  api.keys({
    ArrowUp: () => moveCursor(-1, 0), ArrowDown: () => moveCursor(1, 0),
    ArrowLeft: () => moveCursor(0, -1), ArrowRight: () => moveCursor(0, 1),
    Enter: () => { if (live && cursor) choose(cursor[0], cursor[1]); },
    ' ': () => { if (live && cursor) choose(cursor[0], cursor[1]); },
  });

  function finish() {
    api.setProgress(1);
    api.end({ score, stats: { Correct: `${correct} / ${ROUNDS}`, Grid: `${G}×${G}` } });
  }

  window.__cortexDebug = { get target() { return cur && live ? [cur.r, cur.c] : null; }, get cur() { return cur; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  newRound();
}
