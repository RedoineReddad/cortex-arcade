// Time Warp: how much time passed between two analog clocks?
// Twist: some clocks are seen in a mirror (🪞) and must be flipped back mentally.
import { rand, pick, shuffle, clamp } from '../core/util.js';

const DAY = 720; // 12 h in minutes

export const mirrorOf = (t) => (DAY - t) % DAY; // what a mirrored clock face appears to show
export function fmtDur(m) {
  const hh = Math.floor(m / 60), mm = m % 60;
  if (!hh) return `${mm} min`;
  if (!mm) return `${hh} h`;
  return `${hh} h ${String(mm).padStart(2, '0')} min`;
}
const fmtClock = (t) => `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`;
const mod = (v) => ((v % DAY) + DAY) % DAY;

export default function start(api) {
  const { h, level } = api;
  const STEP = [15, 10, 5, 5, 5][level - 1];
  const P_MIRROR = [0.3, 0.33, 0.38, 0.42, 0.46][level - 1];
  const DIGITS = level <= 2;

  api.css(`
    .cl2-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(10px,2.4vh,22px); width:min(100%,640px); }
    .cl2-clocks { display:flex; gap:clamp(10px,4vw,40px); justify-content:center; align-items:flex-start; width:100%; }
    .cl2-col { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1 1 0; max-width:250px; }
    .cl2-label { font-weight:800; letter-spacing:.06em; text-transform:uppercase; font-size:.85rem; color:var(--muted); }
    .cl2-face { position:relative; width:100%; aspect-ratio:1; border-radius:50%; }
    .cl2-face svg { width:100%; height:100%; display:block; }
    .cl2-face.cl2-mir svg { transform:scaleX(-1); }
    .cl2-face.cl2-mir::after { content:''; position:absolute; inset:3%; border-radius:50%; pointer-events:none;
      background:linear-gradient(115deg, transparent 30%, rgba(180,220,255,.28) 42%, transparent 48%, transparent 58%, rgba(180,220,255,.18) 64%, transparent 72%); }
    .cl2-face.cl2-mir { box-shadow:0 0 0 4px color-mix(in srgb, #7dd3fc 55%, transparent), 0 0 18px color-mix(in srgb, #7dd3fc 40%, transparent); }
    .cl2-badge { position:absolute; top:-4px; right:-4px; font-size:1.5rem; background:var(--panel-solid); border:2px solid #7dd3fc; border-radius:50%;
      width:2.1rem; height:2.1rem; display:grid; place-items:center; z-index:2; }
    .cl2-rim { fill:var(--panel-solid); stroke:var(--c); stroke-width:3; }
    .cl2-tick { stroke:var(--muted); stroke-width:1; stroke-linecap:round; }
    .cl2-tick.cl2-hr { stroke:var(--text); stroke-width:2.4; }
    .cl2-tick.cl2-q { stroke-width:3.6; }
    .cl2-num { fill:var(--text); font-size:9px; font-weight:700; text-anchor:middle; dominant-baseline:central; }
    .cl2-hh { stroke:var(--text); stroke-width:4.6; stroke-linecap:round; }
    .cl2-mh { stroke:var(--c); stroke-width:2.8; stroke-linecap:round; }
    .cl2-pin { fill:var(--text); }
    .cl2-true { min-height:1.3em; font-weight:700; color:var(--muted); font-variant-numeric:tabular-nums; }
    .cl2-q { font-size:clamp(1.2rem,4.5vw,1.6rem); font-weight:800; text-align:center; }
    .cl2-wrap .choice { font-size:clamp(1.05rem,4vw,1.3rem); font-variant-numeric:tabular-nums; }
  `);

  function clockSvg(t) {
    const hr = Math.floor(t / 60) % 12, mn = t % 60;
    const s = h('svg', { viewBox: '-50 -50 100 100' });
    s.append(h('circle.cl2-rim', { r: 46 }));
    for (let i = 0; i < 60; i++) {
      const isH = i % 5 === 0;
      if (!isH && !(level <= 3)) continue;
      const a = (i * 6 * Math.PI) / 180, r1 = isH ? 36 : 40.5, r2 = 43;
      s.append(h('line.cl2-tick' + (isH ? '.cl2-hr' : '') + (i % 15 === 0 ? '.cl2-q' : ''), {
        x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * r2, y2: -Math.cos(a) * r2,
      }));
    }
    if (DIGITS) for (let i = 1; i <= 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      s.append(h('text.cl2-num', { x: Math.sin(a) * 28.5, y: -Math.cos(a) * 28.5 }, String(i)));
    }
    const ha = hr * 30 + mn * 0.5, ma = mn * 6;
    const hand = (cls, ang, len) => h('line.' + cls, { x1: 0, y1: 0, x2: 0, y2: -len, transform: `rotate(${ang})` });
    s.append(hand('cl2-hh', ha, 22), hand('cl2-mh', ma, 35), h('circle.cl2-pin', { r: 3 }));
    return s;
  }

  const clocks = h('div.cl2-clocks');
  const q = h('div.cl2-q', 'How much time passed?');
  const choices = h('div.choices');
  api.stage.append(h('div.cl2-wrap', clocks, q, choices));

  let score = 0, correct = 0, wrong = 0, n = 0, mirrorsSeen = 0, mirrorsRight = 0;
  let cur = null, locked = true, t0 = 0;
  api.setScore(0);

  function swappedRead(t) {
    // read the hour hand as the minute hand and vice versa
    const hr = Math.floor(t / 60) % 12, mn = t % 60;
    const hourPos = hr * 5 + mn / 12; // in "minute" units around the dial
    const h2 = Math.floor(mn / 5);
    const m2 = Math.round(hourPos / 5) * 5 % 60;
    return mod(h2 * 60 + m2);
  }

  function makeQuestion() {
    const start = rand(0, DAY / STEP - 1) * STEP;
    const elapsed = rand(1, Math.floor((DAY - 5) / STEP)) * STEP; // ≤ 11 h 55 m
    const end = mod(start + elapsed);
    let mirS = Math.random() < P_MIRROR, mirE = Math.random() < P_MIRROR;
    if (level === 1 && mirS && mirE) mirS = false;
    const near = STEP >= 15 ? [15, 30, 60] : [5, 10, 60];
    const cands = [];
    const add = (v, w) => { v = mod(v); if (v > 0 && v !== elapsed && v % 5 === 0) cands.push({ v, w }); };
    // mirror misreads: taking the drawn (mirrored) face at face value
    const seenS = mirS ? mirrorOf(start) : start, seenE = mirE ? mirrorOf(end) : end;
    add(seenE - seenS, 5);
    add(mirrorOf(end) - start, mirE ? 2 : 1);
    add(end - mirrorOf(start), mirS ? 2 : 1);
    // swapped hands
    add(swappedRead(end) - start, 1.5);
    add(end - swappedRead(start), 1);
    // near misses
    for (const d of near) { add(elapsed + d, 2); add(elapsed - d, 2); }
    add(DAY - elapsed, 1);
    const picked = [];
    const pool = shuffle(cands);
    // weighted pick without duplicates
    while (picked.length < 3 && pool.length) {
      const tot = pool.reduce((a, c) => a + c.w, 0);
      let r = Math.random() * tot, k = 0;
      for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r <= 0) break; }
      const c = pool.splice(k, 1)[0];
      if (!picked.includes(c.v)) picked.push(c.v);
    }
    while (picked.length < 3) { const v = mod(elapsed + pick([-1, 1]) * rand(1, 8) * 5); if (v && v !== elapsed && !picked.includes(v)) picked.push(v); }
    // ensure at least one near-miss so the answer isn't obvious by elimination
    if (!picked.some((v) => Math.abs(v - elapsed) <= 15)) {
      const nv = elapsed + (elapsed + near[0] < DAY ? near[0] : -near[0]);
      if (nv > 0 && !picked.includes(nv)) picked[2] = nv;
    }
    return { start, end, elapsed, mirS, mirE, options: shuffle([elapsed, ...picked]) };
  }

  function face(label, t, mir) {
    const f = h('div.cl2-face' + (mir ? '.cl2-mir' : ''), clockSvg(t), mir ? h('div.cl2-badge', { title: 'Mirror' }, '🪞') : null);
    const truth = h('div.cl2-true', ' ');
    return { el: h('div.cl2-col', h('div.cl2-label', label), f, truth), truth };
  }

  function next() {
    if (api.ended) return;
    cur = makeQuestion();
    const a = face('Start', cur.start, cur.mirS), b = face('End', cur.end, cur.mirE);
    cur.truths = [a.truth, b.truth];
    clocks.replaceChildren(a.el, b.el);
    choices.replaceChildren(...cur.options.map((v, i) => h('button.choice', { type: 'button', 'data-v': v, onclick: (e) => answer(v, e.currentTarget) }, h('small', { style: { opacity: 0.5, marginRight: '6px' } }, i + 1), fmtDur(v))));
    locked = false;
    t0 = performance.now();
    api.setInfo(`Q${n + 1}` + (cur.mirS || cur.mirE ? ' · 🪞' : ''));
  }

  function answer(v, btn) {
    if (locked || api.ended) return;
    locked = true;
    n++;
    const ok = v === cur.elapsed;
    mirrorsSeen += cur.mirS + cur.mirE;
    const secs = (performance.now() - t0) / 1000;
    const r = btn.getBoundingClientRect();
    [...choices.children].forEach((c) => { if (Number(c.dataset.v) === cur.elapsed) c.classList.add('right'); });
    cur.truths[0].textContent = fmtClock(cur.start) + (cur.mirS ? ' (true)' : '');
    cur.truths[1].textContent = fmtClock(cur.end) + (cur.mirE ? ' (true)' : '');
    if (ok) {
      correct++;
      mirrorsRight += cur.mirS + cur.mirE;
      const bonus = Math.round(5 * clamp(1 - (secs - 3) / 9, 0, 1));
      score += 10 + bonus;
      api.good(r.left + r.width / 2, r.top + r.height / 2);
    } else {
      wrong++;
      score = Math.max(0, score - 5);
      btn.classList.add('wrong');
      api.bad(r.left + r.width / 2, r.top + r.height / 2);
    }
    api.setScore(score);
    api.after(ok ? 700 : 1600, next);
  }

  api.keys({ 1: () => pressN(0), 2: () => pressN(1), 3: () => pressN(2), 4: () => pressN(3) });
  function pressN(i) { const b = choices.children[i]; if (b) answer(Number(b.dataset.v), b); }

  api.timer(60, () => {
    api.end({ score, stats: { Correct: `${correct} / ${n}`, Wrong: String(wrong), 'Mirror clocks': `${mirrorsRight} / ${mirrorsSeen} read` } });
  });

  window.__cortexDebug = { get answer() { return cur && cur.elapsed; }, get q() { return cur; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  next();
}
