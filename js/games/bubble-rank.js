// Bubble Rank: drifting bubbles carry expressions; pop them in value order.
// Twist: every 3rd round the arrow flips (⬇) and you pop largest first.
import { rand, pick, randf, clamp, shuffle } from '../core/util.js';

const fmt = (n) => (n < 0 ? '−' + -n : String(n));

function expression(level) {
  const kinds = level === 1 ? ['n', 'add', 'add']
    : level === 2 ? ['n', 'add', 'sub', 'sub']
      : level === 3 ? ['add', 'sub', 'mul', 'mul']
        : ['add', 'sub', 'mul', 'div', 'neg'];
  const big = [9, 20, 30, 40, 60][level - 1];
  const k = pick(kinds);
  let a, b;
  switch (k) {
    case 'n': a = rand(1, 20); return { txt: String(a), v: a };
    case 'add':
      a = rand(level >= 4 ? -9 : 1, big); b = rand(1, big);
      return { txt: `${fmt(a)} + ${b}`, v: a + b };
    case 'sub':
      a = rand(2, big); b = rand(1, level >= 4 ? big : a - 1);
      return { txt: `${a} − ${b}`, v: a - b };
    case 'mul':
      a = rand(2, level >= 5 ? 12 : 9); b = rand(2, 9);
      if (level >= 4 && Math.random() < 0.3) a = -a;
      return { txt: `${fmt(a)} × ${b}`, v: a * b };
    case 'div':
      b = rand(2, 9); a = rand(2, level >= 5 ? 12 : 9);
      return { txt: `${a * b} ÷ ${b}`, v: a };
    default: // neg
      a = -rand(1, 15);
      return { txt: fmt(a), v: a };
  }
}

export default function start(api) {
  const { h, level } = api;
  const N = [4, 4, 5, 5, 6][level - 1];
  let score = 0, round = 0, cleared = 0, mistakes = 0;
  let bubbles = [], order = [], next = 0, desc = false, roundT0 = 0, busy = true;
  let W = 300, H = 300, now = 0;

  api.css(`
    .br-head { display: flex; align-items: center; gap: 12px; width: min(760px, 100%); } /* same width as the arena */
    .br-dir {
      display: flex; align-items: center; gap: 8px; padding: 6px 14px 6px 8px; border-radius: 999px; font-weight: 800;
      background: color-mix(in srgb, var(--br) 18%, var(--panel-solid)); border: 2px solid var(--br); white-space: nowrap; transition: all .3s;
    }
    .br-dir i { font-style: normal; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--br); color: var(--c-ink); font-size: 1.2rem; }
    .br-trail { display: flex; gap: 5px; flex-wrap: wrap; flex: 1; justify-content: flex-end; min-height: 28px; align-items: center; }
    .br-trail span { padding: 2px 9px; border-radius: 99px; font-weight: 800; font-size: .9rem; background: color-mix(in srgb, var(--br) 22%, transparent); animation: pop .25s ease-out; }
    .br-arena {
      --br: var(--c); position: relative; flex: 1; min-height: 260px; width: min(760px, 100%); border-radius: 20px; overflow: hidden;
      background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--br) 14%, transparent), transparent 60%), color-mix(in srgb, var(--br) 5%, transparent);
      border: 2px solid color-mix(in srgb, var(--br) 35%, var(--line)); transition: border-color .3s, background .3s;
    }
    .br-root { --br: var(--c); display: contents; }
    .br-root.desc, .br-arena.desc { --br: #ec4899; }
    .br-bubble {
      position: absolute; left: 0; top: 0; width: var(--d); height: var(--d); border-radius: 50%; padding: 0;
      display: grid; place-items: center; cursor: pointer; will-change: translate;
      font-weight: 800; font-size: calc(var(--d) * var(--f, .22)); font-variant-numeric: tabular-nums; color: var(--text); white-space: nowrap;
      background: radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 26%),
                  radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--br) 6%, transparent) 50%, color-mix(in srgb, var(--br) 32%, transparent) 100%);
      border: 2px solid color-mix(in srgb, var(--br) 65%, transparent);
      box-shadow: inset -4px -6px 14px color-mix(in srgb, var(--br) 25%, transparent), 0 4px 14px color-mix(in srgb, var(--br) 18%, transparent);
      backdrop-filter: blur(2px);
    }
    .br-bubble.popped { animation: brPop .25s ease-out forwards; pointer-events: none; }
    .br-bubble.wrong { border-color: var(--bad); background: color-mix(in srgb, var(--bad) 30%, transparent); }
    .br-bubble.back { animation: pop .3s ease-out; }
    .br-bubble.cleared { animation: brPop .35s ease-out forwards; }
    @keyframes brPop { 60% { opacity: .8; scale: 1.25; } to { opacity: 0; scale: 1.5; } }
  `);

  const dirIcon = h('i', '⬆');
  const dirText = h('span', 'Smallest first');
  const dirEl = h('div.br-dir', dirIcon, dirText);
  const trail = h('div.br-trail');
  const arena = h('div.br-arena');
  const root = h('div.br-root', h('div.br-head', dirEl, trail), arena);
  api.stage.append(root);

  function measure() { W = arena.clientWidth; H = arena.clientHeight; }

  function newRound() {
    round++;
    desc = round % 3 === 0;
    root.classList.toggle('desc', desc);
    arena.classList.toggle('desc', desc);
    dirIcon.textContent = desc ? '⬇' : '⬆';
    dirText.textContent = desc ? 'Largest first' : 'Smallest first';
    if (desc) api.banner('⬇ Flip! Largest first', 1200);
    arena.innerHTML = '';
    trail.innerHTML = '';
    measure();
    const d = clamp(Math.min(W, H) / (N > 4 ? 3.6 : 3.2), 74, 118);
    const r = d / 2;
    // distinct values
    const exprs = [];
    for (let t = 0; exprs.length < N && t < 500; t++) {
      const e = expression(level);
      if (!exprs.some((x) => x.v === e.v)) exprs.push(e);
    }
    // place with rejection sampling to avoid overlap
    const placed = [];
    for (const e of shuffle(exprs)) {
      let x, y;
      for (let t = 0; t < 200; t++) {
        x = randf(r, W - r); y = randf(r, H - r);
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > d * 1.08)) break;
      }
      const speed = randf(18, 30) + level * 4;
      const ang = randf(0, Math.PI * 2);
      const b = { ...e, x, y, r, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, popped: false };
      b.el = h('button.br-bubble', { type: 'button', style: { '--d': d + 'px' }, onpointerdown: (ev) => { ev.preventDefault(); hit(b, ev); }, onclick: (ev) => { if (ev.detail === 0) hit(b, ev); } }, e.txt);
      b.el.style.setProperty('--d', d + 'px');
      b.el.style.setProperty('--f', clamp(1.45 / e.txt.length, 0.18, 0.3).toFixed(3));
      arena.append(b.el);
      placed.push(b);
    }
    bubbles = placed;
    order = bubbles.slice().sort((p, q) => (desc ? q.v - p.v : p.v - q.v));
    next = 0;
    roundT0 = now;
    busy = false;
    render();
    api.setInfo(`Round ${round}`);
  }

  function hit(b, ev) {
    if (busy || b.popped || api.ended) return;
    const cx = ev.clientX || b.el.getBoundingClientRect().left + b.r;
    const cy = ev.clientY || b.el.getBoundingClientRect().top + b.r;
    if (b === order[next]) {
      b.popped = true;
      b.el.classList.add('popped');
      api.sfx.note(next);
      trail.append(h('span', fmt(b.v)));
      next++;
      if (next === order.length) {
        busy = true;
        cleared++;
        const t = now - roundT0;
        const bonus = Math.max(0, Math.round(N * 2 - t));
        const pts = N * 3 + bonus;
        score += pts;
        api.setScore(score);
        api.good(cx, cy);
        api.banner(`+${pts}${bonus ? ` (speed +${bonus})` : ''}`, 800);
        api.after(800, newRound);
      }
    } else {
      mistakes++;
      busy = true;
      b.el.classList.add('wrong');
      api.bad(cx, cy);
      api.after(550, () => {
        // reset the round: restore every bubble
        for (const q of bubbles) {
          q.el.classList.remove('wrong', 'popped');
          if (q.popped) { q.popped = false; q.el.classList.add('back'); }
        }
        api.after(320, () => bubbles.forEach((q) => q.el.classList.remove('back')));
        trail.innerHTML = '';
        next = 0;
        busy = false;
      });
    }
  }

  function render() {
    for (const b of bubbles) b.el.style.translate = `${b.x - b.r}px ${b.y - b.r}px`; // not `transform`: keeps pop/scale animations centred
  }

  api.loop((dt, el) => {
    now = el;
    measure();
    const live = bubbles.filter((b) => !b.popped);
    for (const b of live) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
    }
    // soft elastic collisions
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const p = live[i], q = live[j];
        const dx = q.x - p.x, dy = q.y - p.y, dist = Math.hypot(dx, dy) || 0.01, min = p.r + q.r;
        if (dist < min) {
          const nx = dx / dist, ny = dy / dist, push = (min - dist) / 2;
          p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
          const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
          if (rel < 0) { p.vx += rel * nx; p.vy += rel * ny; q.vx -= rel * nx; q.vy -= rel * ny; }
        }
      }
    }
    render();
  });

  api.setScore(0);
  api.timer(60, () => api.end({ score, stats: { 'Rounds cleared': String(cleared), Mistakes: String(mistakes) } }));
  // wait one frame so the arena has its size
  api.after(30, newRound);
}
