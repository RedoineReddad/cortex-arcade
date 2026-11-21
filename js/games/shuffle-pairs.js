// Shifty Pairs: classic concentration, but every miss makes two hidden cards swap places.
import { shuffle, sample } from '../core/util.js';

const SYMBOLS = ['🍎', '🍋', '🍇', '🍉', '🥝', '🍒', '🐙', '🦊', '🐢', '🦉', '🐝', '🌵', '🌻', '🍄', '⭐', '🌙', '⚽', '🎈', '🚀', '🎲', '🔔', '💎', '🧩', '🎸'];

export default function start(api) {
  const { h, level } = api;
  const PAIRS = [6, 8, 8, 10, 10][level - 1];
  const GAP = 8;

  api.css(`
    :root { --sp-warn:#b45309; --sp-glow:#f59e0b; }
    @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --sp-warn:#fbbf24; --sp-glow:#fbbf24; } }
    .sp-wrap { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; flex:1; min-height:0; justify-content:center; }
    .sp-board { position:relative; flex:none; }
    .sp-card {
      position:absolute; left:0; top:0; padding:0; border:0; background:none; cursor:pointer;
      perspective:700px; transition:transform .6s cubic-bezier(.45,.05,.3,1);
    }
    .sp-card.moving { z-index:3; }
    .sp-inner { position:absolute; inset:0; transform-style:preserve-3d; transition:transform .4s ease; }
    .sp-card.up .sp-inner { transform:rotateY(180deg); }
    .sp-side {
      position:absolute; inset:0; border-radius:14px; backface-visibility:hidden; -webkit-backface-visibility:hidden;
      display:grid; place-items:center; border:2px solid var(--line);
    }
    .sp-back {
      background:
        radial-gradient(circle at 30% 30%, color-mix(in srgb,var(--c) 55%,transparent) 0 12%, transparent 13%),
        repeating-linear-gradient(45deg, color-mix(in srgb,var(--c) 22%,var(--panel-solid)) 0 8px, color-mix(in srgb,var(--c) 34%,var(--panel-solid)) 8px 16px);
      border-color:color-mix(in srgb,var(--c) 50%,var(--line));
      transition:box-shadow .2s, border-color .2s;
    }
    .sp-card:hover .sp-back { border-color:var(--c); }
    .sp-card.up .sp-back, .sp-card:not(.up) .sp-face { visibility:hidden; transition:visibility 0s .2s; }
    .sp-face { background:var(--panel-solid); transform:rotateY(180deg); font-size:var(--sp-fs, 2rem); }
    .sp-card.moving .sp-back { border-color:var(--sp-glow); box-shadow:0 0 0 3px var(--sp-glow), 0 0 22px 4px color-mix(in srgb,var(--sp-glow) 55%,transparent); }
    .sp-card.done .sp-face { border-color:var(--good); background:color-mix(in srgb,var(--good) 16%,var(--panel-solid)); animation:spPop .35s ease-out; }
    .sp-card.done { cursor:default; }
    .sp-card.miss .sp-face { border-color:var(--bad); background:color-mix(in srgb,var(--bad) 14%,var(--panel-solid)); }
    @keyframes spPop { 50% { transform:rotateY(180deg) scale(1.12); } }
    .sp-msg { min-height:1.4em; font-weight:700; color:var(--muted); text-align:center; }
    .sp-msg.warn { color:var(--sp-warn); }
  `);

  const board = h('div.sp-board');
  const msg = h('div.sp-msg', 'Find all the pairs');
  const wrap = h('div.sp-wrap', board, msg);
  api.stage.append(wrap);

  const syms = sample(SYMBOLS, PAIRS);
  // slots[i] = card at slot i
  const cards = shuffle([...syms, ...syms]).map((s, i) => {
    const el = h('button.sp-card', { type: 'button', 'aria-label': 'Hidden card' },
      h('div.sp-inner', h('div.sp-side.sp-back'), h('div.sp-side.sp-face', s)));
    const c = { sym: s, slot: i, el, up: false, done: false };
    el.addEventListener('click', () => flip(c));
    board.append(el);
    return c;
  });

  let cols, rows, cw, ch;
  function layout() {
    const sw = api.stage.clientWidth - 32, sh = api.stage.clientHeight - 80;
    if (PAIRS === 6) { cols = 4; rows = 3; }
    else if (PAIRS === 8) { cols = 4; rows = 4; }
    else if (sw > sh) { cols = 5; rows = 4; } else { cols = 4; rows = 5; }
    cw = Math.min((sw - (cols - 1) * GAP) / cols, ((sh - (rows - 1) * GAP) / rows) * 0.8, 120);
    cw = Math.max(40, Math.floor(cw));
    ch = Math.floor(cw * 1.25);
    board.style.width = cols * cw + (cols - 1) * GAP + 'px';
    board.style.height = rows * ch + (rows - 1) * GAP + 'px';
    board.style.setProperty('--sp-fs', Math.round(cw * 0.5) + 'px');
    cards.forEach(place);
  }
  function place(c) {
    const col = c.slot % cols, row = Math.floor(c.slot / cols);
    c.el.style.width = cw + 'px';
    c.el.style.height = ch + 'px';
    c.el.style.transform = `translate(${col * (cw + GAP)}px, ${row * (ch + GAP)}px)`;
  }
  layout();
  api.on(window, 'resize', layout);

  const sw = api.stopwatch();
  let flips = 0, open = [], busy = false, matched = 0, misses = 0, swaps = 0;
  api.setInfo(`0/${PAIRS} pairs`);
  api.setProgress(0);

  function flip(c) {
    if (busy || api.ended || c.up || c.done) return;
    c.up = true;
    c.el.classList.add('up');
    c.el.setAttribute('aria-label', c.sym);
    flips++;
    api.sfx.tick();
    open.push(c);
    if (open.length < 2) return;
    const [a, b] = open;
    open = [];
    busy = true;
    if (a.sym === b.sym) {
      a.done = b.done = true;
      matched++;
      api.setInfo(`${matched}/${PAIRS} pairs`);
      api.setProgress(matched / PAIRS);
      api.after(250, () => {
        a.el.classList.add('done'); b.el.classList.add('done');
        const r = b.el.getBoundingClientRect();
        api.good(r.left + r.width / 2, r.top + r.height / 2);
        busy = false;
        msg.className = 'sp-msg';
        msg.textContent = 'Pair!';
        if (matched === PAIRS) api.after(700, finish);
      });
    } else {
      misses++;
      api.after(350, () => {
        a.el.classList.add('miss'); b.el.classList.add('miss');
        const r = b.el.getBoundingClientRect();
        api.bad(r.left + r.width / 2, r.top + r.height / 2);
      });
      api.after(1000, () => {
        a.up = b.up = false;
        a.el.classList.remove('up', 'miss'); b.el.classList.remove('up', 'miss');
        a.el.setAttribute('aria-label', 'Hidden card'); b.el.setAttribute('aria-label', 'Hidden card');
        api.after(450, shift);
      });
    }
  }

  function shift() {
    if (api.ended) return;
    const pool = cards.filter((c) => !c.done && !c.up);
    let x, y;
    for (let t = 0; t < 40 && pool.length >= 2; t++) {
      [x, y] = sample(pool, 2);
      if (x.sym !== y.sym) break;
    }
    if (!x || x.sym === y.sym) { busy = false; return; }
    swaps++;
    msg.className = 'sp-msg warn';
    msg.textContent = '⇄ Two cards are swapping!';
    x.el.classList.add('moving'); y.el.classList.add('moving');
    api.after(180, () => {
      [x.slot, y.slot] = [y.slot, x.slot];
      place(x); place(y);
      api.after(700, () => {
        x.el.classList.remove('moving'); y.el.classList.remove('moving');
        // once they have landed, move just these two nodes so the Tab order follows the slots on screen
        // (moving a node drops focus, so restore it)
        const had = document.activeElement;
        const order = cards.slice().sort((p, q) => p.slot - q.slot);
        [x, y].forEach((c) => { const nxt = order[order.indexOf(c) + 1]; board.insertBefore(c.el, nxt ? nxt.el : null); });
        if (had && had !== document.activeElement && board.contains(had)) had.focus({ preventScroll: true });
        msg.className = 'sp-msg';
        msg.textContent = '';
        busy = false;
      });
    });
  }

  function finish() {
    sw.stop();
    const t = sw.elapsed;
    const extra = Math.max(0, flips - 2 * PAIRS);
    // Normalised to a 6-pair board so bigger boards (higher levels) don't inflate the score.
    const k = 6 / PAIRS;
    const score = Math.max(10, Math.round(150 - extra * 3 * k - t * 0.5 * k));
    api.end({ score, stats: { Flips: String(flips), Time: t.toFixed(1) + 's', Swaps: String(swaps) } });
  }

  window.__cortexDebug = {
    cards: () => cards.map((c) => ({ sym: c.sym, done: c.done, up: c.up, el: c.el })),
    get busy() { return busy; },
  };
  api.onCleanup(() => { delete window.__cortexDebug; });
}
