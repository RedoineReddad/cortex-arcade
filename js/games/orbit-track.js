// Orbit Tracker: multiple-object tracking on a canvas, with fog bands that hide the orbs.
import { randf, clamp, shuffle } from '../core/util.js';

export default function start(api) {
  const { h, level } = api;
  const ROUNDS = 8;
  const N = 7 + level; // 8..12 orbs
  let K = clamp(2 + Math.floor((level - 1) / 2), 2, 5); // 2..4 at start, adaptive 2..5
  const baseSpeed = 0.2 + level * 0.045; // fraction of min(w,h) per second
  const bandCount = level >= 3 ? 2 : 1;

  api.css(`
    .ot-wrap { position: relative; width: min(680px, 100%); flex: 1; min-height: 280px; max-height: 620px; border-radius: 22px;
      background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c) 10%, var(--bg2)), var(--bg2));
      border: 1px solid var(--line); overflow: hidden; }
    .ot-wrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: pointer; }
    .ot-msg { min-height: 1.6em; font-weight: 700; font-size: 1.1rem; text-align: center; }
    .ot-msg b { color: var(--c); }
    .ot-dots { display: flex; gap: 6px; justify-content: center; min-height: 16px; }
    .ot-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--c); }
    .ot-dot.on { background: var(--c); }
  `);

  const canvas = h('canvas', { 'data-hit': '1' });
  const wrap = h('div.ot-wrap', canvas);
  const msg = h('div.ot-msg');
  const dots = h('div.ot-dots');
  api.stage.append(msg, wrap, dots);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  function resize() {
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const nd = window.devicePixelRatio || 1;
    if (cw === W && ch === H && nd === dpr) return;
    if (W && H) for (const o of orbs) { o.x *= cw / W; o.y *= ch / H; }
    if (H) bands.forEach((b) => { b.y *= ch / H; b.h *= ch / H; });
    W = cw; H = ch; dpr = nd;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  const cssVar = (n, fb) => getComputedStyle(api.stage).getPropertyValue(n).trim() || fb;
  let colors = {};
  function readColors() {
    colors = { c: cssVar('--c', '#7c8cff'), text: cssVar('--text', '#e8ebff'), muted: cssVar('--muted', '#9aa3c7'), good: cssVar('--good', '#22c55e'), bad: cssVar('--bad', '#ef4444'), bg: cssVar('--bg2', '#171b31') };
  }
  readColors();

  let orbs = [], bands = [];
  let phase = 'idle', phaseT = 0, moveDur = 7;
  let round = 0, score = 0, perfect = 0, hitsTotal = 0, targetsTotal = 0, maxK = K;
  let selected = new Set();
  api.setScore(0);

  const R = () => clamp(Math.min(W, H) * 0.045, 13, 24);
  const inFog = (y) => bands.some((b) => y > b.y && y < b.y + b.h);

  function setupRound() {
    resize();
    readColors();
    round++;
    api.setInfo(`Round ${round}/${ROUNDS}`);
    api.setProgress((round - 1) / ROUNDS);
    // Fog bands: horizontal, not overlapping, away from the very edges.
    bands = [];
    const bh = H * (bandCount === 2 ? 0.14 : 0.18);
    const slots = bandCount === 2 ? [[0.14, 0.38], [0.55, 0.78]] : [[0.3, 0.6]];
    for (const [a, b] of slots) bands.push({ y: H * randf(a, b), h: bh, ph: Math.random() * 6 });
    // Orbs: spread out, never starting inside fog.
    const r = R();
    orbs = [];
    for (let i = 0; i < N; i++) {
      let x, y, tries = 0;
      do {
        x = randf(r * 1.5, W - r * 1.5); y = randf(r * 1.5, H - r * 1.5); tries++;
      } while (tries < 300 && (inFog(y) || bands.some((b) => Math.abs(y - (b.y + b.h / 2)) < b.h / 2 + r) || orbs.some((o) => Math.hypot(o.x - x, o.y - y) < r * 3.2)));
      const a = Math.random() * Math.PI * 2;
      orbs.push({ x, y, a, turn: randf(-1.5, 1.5), sp: randf(0.85, 1.15), target: false });
    }
    shuffle(orbs).slice(0, K).forEach((o) => (o.target = true));
    selected = new Set();
    moveDur = randf(6, 8);
    phase = 'show'; phaseT = 0;
    msg.replaceChildren('Watch the ', h('b', `${K} glowing`), ' orbs');
    dots.replaceChildren();
  }

  function step(dt) {
    const r = R();
    const v = baseSpeed * Math.min(W, H);
    for (const o of orbs) {
      // Curvy random paths: the turn rate does a random walk.
      o.turn = clamp(o.turn + randf(-6, 6) * dt, -2.4, 2.4);
      o.a += o.turn * dt;
      o.x += Math.cos(o.a) * v * o.sp * dt;
      o.y += Math.sin(o.a) * v * o.sp * dt;
      if (o.x < r) { o.x = r; o.a = Math.PI - o.a; }
      if (o.x > W - r) { o.x = W - r; o.a = Math.PI - o.a; }
      if (o.y < r) { o.y = r; o.a = -o.a; }
      if (o.y > H - r) { o.y = H - r; o.a = -o.a; }
    }
    // Soft bounce between orbs so they never merge.
    for (let i = 0; i < orbs.length; i++) for (let j = i + 1; j < orbs.length; j++) {
      const A = orbs[i], B = orbs[j];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < r * 2.1) {
        const push = (r * 2.1 - d) / 2, nx = dx / d, ny = dy / d;
        A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
        A.a = reflect(A.a, nx, ny, 1);
        B.a = reflect(B.a, nx, ny, -1);
      }
    }
  }

  // Reflect heading a across the collision normal if moving towards the other orb (sign: +1 for A, -1 for B).
  function reflect(a, nx, ny, sign) {
    let vx = Math.cos(a), vy = Math.sin(a);
    const dot = vx * nx + vy * ny;
    if (dot * sign <= 0) return a;
    vx -= 2 * dot * nx; vy -= 2 * dot * ny;
    return Math.atan2(vy, vx);
  }

  function settle() {
    // When motion stops, nudge any orb resting in fog just outside it, then separate overlaps,
    // so every orb can be seen and tapped.
    const r = R();
    for (let it = 0; it < 30; it++) {
      for (const o of orbs) for (const b of bands) {
        if (o.y > b.y - r && o.y < b.y + b.h + r) {
          o.y = o.y < b.y + b.h / 2 ? Math.max(r, b.y - r - 2) : Math.min(H - r, b.y + b.h + r + 2);
        }
      }
      let moved = false;
      for (let i = 0; i < orbs.length; i++) for (let j = i + 1; j < orbs.length; j++) {
        const A = orbs[i], B = orbs[j];
        let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
        if (d < r * 2.3) {
          if (d < 0.01) { dx = 1; dy = 0; d = 1; }
          const push = (r * 2.3 - d) / 2 + 0.5, nx = dx / d, ny = dy / d;
          A.x = clamp(A.x - nx * push, r, W - r); B.x = clamp(B.x + nx * push, r, W - r);
          A.y = clamp(A.y - ny * push * 0.3, r, H - r); B.y = clamp(B.y + ny * push * 0.3, r, H - r);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function drawOrb(o, r, opts = {}) {
    const g = ctx.createRadialGradient(o.x - r * 0.35, o.y - r * 0.4, r * 0.1, o.x, o.y, r);
    const base = opts.fill || colors.muted;
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, base);
    g.addColorStop(1, mix(base));
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    if (opts.ring) {
      ctx.lineWidth = opts.ringW || 3; ctx.strokeStyle = opts.ring;
      if (opts.dash) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(o.x, o.y, r + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  const mix = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c + 'cc' : c);

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const r = R();
    const fogOn = phase === 'move';
    // Orbs, clipped so that they are fully invisible inside fog bands while moving.
    ctx.save();
    if (fogOn) {
      ctx.beginPath();
      let y0 = 0;
      for (const b of [...bands].sort((a, b) => a.y - b.y)) { ctx.rect(0, y0, W, b.y - y0); y0 = b.y + b.h; }
      ctx.rect(0, y0, W, H - y0);
      ctx.clip();
    }
    for (const o of orbs) {
      if (phase === 'show') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 8);
        if (o.target) {
          ctx.save(); ctx.shadowColor = colors.c; ctx.shadowBlur = 18 + pulse * 10;
          drawOrb(o, r, { fill: colors.c, ring: colors.c, ringW: 3 + pulse * 2 });
          ctx.restore();
        } else drawOrb(o, r);
      } else if (phase === 'reveal') {
        const sel = selected.has(o);
        if (o.target && sel) drawOrb(o, r, { fill: colors.good, ring: colors.good });
        else if (o.target) drawOrb(o, r, { fill: colors.c, ring: colors.c, dash: true });
        else if (sel) drawOrb(o, r, { fill: colors.bad, ring: colors.bad });
        else drawOrb(o, r);
      } else if (phase === 'pick') {
        drawOrb(o, r, selected.has(o) ? { fill: colors.c, ring: colors.text, ringW: 3 } : {});
      } else drawOrb(o, r);
    }
    ctx.restore();
    // Fog bands.
    if (bands.length) {
      const alpha = fogOn ? 1 : phase === 'show' ? 0.55 : 0.18;
      for (const b of bands) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const g = ctx.createLinearGradient(0, b.y - 8, 0, b.y + b.h + 8);
        g.addColorStop(0, 'rgba(160,170,200,0)');
        g.addColorStop(0.12, 'rgba(160,170,200,0.55)');
        g.addColorStop(0.5, 'rgba(185,192,215,0.7)');
        g.addColorStop(0.88, 'rgba(160,170,200,0.55)');
        g.addColorStop(1, 'rgba(160,170,200,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, b.y - 8, W, b.h + 16);
        // drifting wisps
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let i = 0; i < 6; i++) {
          const x = ((i * W) / 5 + t * 18 * (i % 2 ? 1 : -0.7) + b.ph * 50) % (W + 120) - 60;
          ctx.beginPath();
          ctx.ellipse(x, b.y + b.h * (0.3 + 0.4 * ((i * 37) % 10) / 10), 60, b.h * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function finishPick() {
    phase = 'reveal'; phaseT = 0;
    let hits = 0;
    selected.forEach((o) => o.target && hits++);
    hitsTotal += hits; targetsTotal += K;
    const isPerfect = hits === K;
    score += hits * 5 + (isPerfect ? 10 : 0);
    api.setScore(score);
    if (isPerfect) { perfect++; api.good(); api.banner(`Perfect! ${hits}/${K}`, 900); }
    else if (hits >= K / 2) { api.sfx.note(3); api.banner(`${hits}/${K} tracked`, 900); }
    else { api.bad(); api.banner(`${hits}/${K} tracked`, 900); }
    msg.replaceChildren(isPerfect ? '🎯 All tracked!' : `Found ${hits} of ${K}`);
    // Adapt the number of targets.
    const prevK = K;
    if (isPerfect) K = Math.min(5, K + 1, N - 3);
    else if (hits / K < 0.5) K = Math.max(2, K - 1);
    maxK = Math.max(maxK, K);
    api.after(1600, () => {
      if (round >= ROUNDS) {
        api.setProgress(1);
        api.end({
          score,
          stats: {
            'Perfect rounds': `${perfect} / ${ROUNDS}`,
            'Targets found': `${hitsTotal} / ${targetsTotal}`,
            Accuracy: Math.round((100 * hitsTotal) / Math.max(1, targetsTotal)) + '%',
            'Most targets': String(Math.max(maxK, prevK)),
          },
        });
      } else setupRound();
    });
  }

  api.on(canvas, 'pointerdown', (e) => {
    e.preventDefault();
    if (phase !== 'pick' || api.ended) return;
    const b = canvas.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    const r = R();
    let best = null, bd = Infinity;
    for (const o of orbs) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } }
    if (!best || bd > r * 1.7) return;
    if (selected.has(best)) selected.delete(best);
    else { selected.add(best); api.sfx.tick(); }
    renderDots();
    if (selected.size >= K) finishPick();
  });

  function renderDots() {
    dots.replaceChildren(...Array.from({ length: K }, (_, i) => h('div.ot-dot' + (i < selected.size ? '.on' : ''))));
  }

  api.on(window, 'resize', resize);

  api.loop((dt, t) => {
    resize();
    phaseT += dt;
    if (phase === 'show' && phaseT >= 2) {
      phase = 'move'; phaseT = 0;
      msg.replaceChildren('Keep tracking… ', h('b', '🌫️ even through the fog'));
    } else if (phase === 'move') {
      step(dt);
      if (phaseT >= moveDur) {
        settle();
        phase = 'pick'; phaseT = 0;
        msg.replaceChildren('Tap the ', h('b', `${K}`), ' orbs you tracked');
        renderDots();
      }
    }
    draw(t);
  });

  window.__cortexDebug = {
    get phase() { return phase; },
    targets() {
      const b = canvas.getBoundingClientRect();
      return orbs.filter((o) => o.target).map((o) => ({ x: b.left + o.x, y: b.top + o.y }));
    },
  };
  api.onCleanup(() => { delete window.__cortexDebug; });

  // Wait one frame so the canvas has its layout size.
  api.after(30, setupRound);
}
