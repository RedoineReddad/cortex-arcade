// Signal Sprint: go/no-go. Tap green, leave red. Purple screen flips the rule.
import { rand, randf, pick, clamp } from '../core/util.js';

const COL = {
  green: { lit: '#22c55e', glow: '#4ade80', name: 'GREEN' },
  red: { lit: '#ef4444', glow: '#f87171', name: 'RED' },
  amber: { lit: '#f59e0b', glow: '#fbbf24', name: 'AMBER' },
  blue: { lit: '#3b82f6', glow: '#60a5fa', name: 'BLUE' },
};

export default function start(api) {
  const { h, level } = api;
  const showMs = [1100, 1020, 950, 880, 800][level - 1];
  const decoys = level >= 3;
  const goRate = 0.55;

  api.css(`
    .ss-rule { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 99px; font-weight: 800; font-size: 1.05rem;
      background: var(--panel-solid); border: 2px solid var(--line); white-space: nowrap; transition: background .3s, border-color .3s; }
    .ss-rule i { display: inline-block; width: 18px; height: 18px; border-radius: 50%; vertical-align: -3px; margin: 0 2px; }
    .ss-rule.ss-flip { border-color: #a855f7; background: color-mix(in srgb, #a855f7 22%, var(--panel-solid)); }
    .ss-arena { position: relative; width: min(720px, 100%); flex: 1; min-height: 300px; border-radius: 22px; overflow: hidden;
      background: var(--bg2); border: 2px solid var(--line); transition: background .35s, border-color .35s; }
    .ss-arena.ss-flip { background: radial-gradient(circle at 50% 40%, #8b3fe0, #4c1d95); border-color: #c084fc; }
    .ss-arena.ss-flip::after { content: 'RULE FLIPPED'; position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,.55); font-weight: 900; letter-spacing: .2em; font-size: .85rem; pointer-events: none; }
    .ss-sig { position: absolute; width: var(--sz); height: var(--sz); margin: calc(var(--sz) / -2) 0 0 calc(var(--sz) / -2); border-radius: 50%;
      padding: 0; border: 7px solid #1f2430; cursor: pointer; animation: ssIn .12s ease-out;
      background: radial-gradient(circle at 35% 30%, #fff8 0 12%, var(--lit) 45%, color-mix(in srgb, var(--lit) 70%, #000) 100%);
      box-shadow: 0 0 0 3px rgba(255,255,255,.18), 0 0 28px 6px var(--glow); }
    .ss-sig.ss-gone { animation: ssOut .18s forwards; pointer-events: none; }
    .ss-sig.ss-hit { animation: ssHit .22s forwards; pointer-events: none; }
    @keyframes ssIn { from { transform: scale(.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes ssOut { to { transform: scale(.5); opacity: 0; } }
    @keyframes ssHit { to { transform: scale(1.5); opacity: 0; } }
    .ss-hint { font-size: .85rem; }
    .banner.ss-banner { border-color: #a855f7; color: #a855f7; }
  `);

  const rule = h('div.ss-rule');
  const arena = h('div.ss-arena.tap');
  const hint = h('div.g-sub.ss-hint', 'Tap the signal (or press Space)');
  api.stage.append(rule, arena, hint);

  let flipped = false, cur = null;
  let score = 0, hits = 0, falseTaps = 0, misses = 0, rtSum = 0, holds = 0;
  api.setScore(0);

  const dot = (c) => h('i', { style: { background: COL[c].lit } });
  function renderRule() {
    const go = flipped ? 'red' : 'green', no = flipped ? 'green' : 'red';
    rule.classList.toggle('ss-flip', flipped);
    arena.classList.toggle('ss-flip', flipped);
    rule.replaceChildren(flipped ? '🔄 ' : '', 'Tap ', dot(go), COL[go].name, '  ·  avoid ', dot(no), decoys ? dot('amber') : '', decoys ? dot('blue') : '');
  }
  renderRule();

  let lastPos = null;
  function spawn() {
    if (api.ended) return;
    const r = Math.random();
    let color;
    const go = flipped ? 'red' : 'green', no = flipped ? 'green' : 'red';
    if (decoys && r > 1 - 0.16) color = pick(['amber', 'blue']);
    else if (r < goRate) color = go;
    else color = no;
    const W = arena.clientWidth, H = arena.clientHeight;
    const sz = clamp(Math.min(W, H) * 0.24, 72, 120);
    let x, y, tries = 0;
    do {
      x = randf(sz * 0.7, W - sz * 0.7); y = randf(sz * 0.7, H - sz * 0.7); tries++;
    } while (tries < 20 && lastPos && Math.hypot(x - lastPos[0], y - lastPos[1]) < sz * 1.3);
    lastPos = [x, y];
    const el = h('button.ss-sig', {
      type: 'button', 'aria-label': COL[color].name,
      style: { left: x + 'px', top: y + 'px' },
      onpointerdown: (e) => { e.preventDefault(); e.stopPropagation(); tap(sig, e.clientX, e.clientY); },
    });
    el.style.setProperty('--sz', sz + 'px');
    el.style.setProperty('--lit', COL[color].lit);
    el.style.setProperty('--glow', COL[color].glow);
    const sig = { el, color, isGo: color === go, t0: performance.now(), done: false };
    sig.timer = api.after(showMs, () => expire(sig));
    arena.append(el);
    cur = sig;
  }

  function removeSig(sig, cls) {
    sig.done = true;
    if (cur === sig) cur = null;
    api.clear(sig.timer);
    sig.el.classList.add(cls);
    api.after(250, () => sig.el.remove());
  }

  function scheduleNext(extra = 0) {
    api.after(rand(350, 800) + extra, spawn);
  }

  function expire(sig) {
    if (sig.done) return;
    removeSig(sig, 'ss-gone');
    if (sig.isGo) {
      misses++;
      score = Math.max(0, score - 3);
      api.setScore(score);
      const r = sig.el.getBoundingClientRect();
      api.bad(r.left + r.width / 2, r.top + r.height / 2);
    } else holds++;
    scheduleNext();
  }

  function tap(sig, x, y) {
    if (!sig || sig.done || api.ended) return;
    const rt = performance.now() - sig.t0;
    const r = sig.el.getBoundingClientRect();
    x = x ?? r.left + r.width / 2; y = y ?? r.top + r.height / 2;
    if (sig.isGo) {
      hits++; rtSum += rt;
      const bonus = rt < 400 ? 5 : Math.max(0, Math.round(5 * (1 - (rt - 400) / 500)));
      score += 10 + bonus;
      removeSig(sig, 'ss-hit');
      api.good(x, y);
    } else {
      falseTaps++;
      score = Math.max(0, score - 10);
      removeSig(sig, 'ss-gone');
      api.bad(x, y);
    }
    api.setScore(score);
    scheduleNext();
  }

  api.keys({ ' ': () => tap(cur) });

  // Rule flips: normal for 8–12 s, purple for 5–8 s.
  function scheduleFlip() {
    api.after(flipped ? rand(5000, 8000) : rand(8000, 12000), () => {
      flipped = !flipped;
      if (cur) { const s = cur; removeSig(s, 'ss-gone'); scheduleNext(500); }
      renderRule();
      const b = api.banner(flipped ? '🔄 RULE FLIP! Tap RED' : '✅ Back to normal: tap GREEN', 1100);
      if (flipped) b.classList.add('ss-banner');
      api.sfx.note(flipped ? 7 : 2);
      scheduleFlip();
    });
  }
  scheduleFlip();

  api.timer(45, () => {
    api.end({
      score,
      stats: {
        Hits: String(hits),
        'False taps': String(falseTaps),
        Misses: String(misses),
        'Avg reaction': hits ? Math.round(rtSum / hits) + ' ms' : '–',
      },
    });
  });

  window.__cortexDebug = { get current() { return cur && !cur.done ? { go: cur.isGo, color: cur.color } : null; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  scheduleNext(300);
}
