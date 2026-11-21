// Rainfall Sums: equations fall like raindrops; type the answer to pop them.
// Twist: mirror drops (⇄) want the answer with its digits reversed.
import { rand, pick, clamp } from '../core/util.js';

const reverse = (n) => Number(String(n).split('').reverse().join(''));
const mirrorable = (n) => n >= 10 && n % 10 !== 0 && reverse(n) !== n;

export default function start(api) {
  const { h, level } = api;
  const GAME_SECS = 90;
  let lives = 3, score = 0, combo = 0, bestCombo = 0;
  let popped = 0, mirrorsPopped = 0, missed = 0, wrong = 0;
  let spawnIn = 0.4, nextId = 0;
  const drops = [];

  api.css(`
    .rm-wrap { flex: 1; min-height: 0; width: min(560px, 100%); display: flex; flex-direction: column; gap: 10px; align-items: center; }
    .rm-sky {
      position: relative; flex: 1; min-height: 200px; width: 100%; border-radius: 18px; overflow: hidden;
      background: linear-gradient(180deg, color-mix(in srgb, #38bdf8 14%, transparent), color-mix(in srgb, #38bdf8 4%, transparent) 70%, transparent);
      border: 1px solid var(--line);
    }
    .rm-ground {
      position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
      background: repeating-linear-gradient(90deg, color-mix(in srgb, #38bdf8 55%, transparent) 0 14px, color-mix(in srgb, #38bdf8 30%, transparent) 14px 28px);
    }
    .rm-ground.hit { background: var(--bad); transition: background .1s; }
    .rm-status {
      position: absolute; top: 8px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center;
      font-weight: 800; pointer-events: none; z-index: 3; font-size: 1.05rem;
    }
    .rm-lives { letter-spacing: 2px; color: var(--bad); }
    .rm-lives .lost { color: var(--muted); opacity: .45; }
    .rm-combo { color: var(--c); opacity: 0; transition: opacity .2s; }
    .rm-combo.on { opacity: 1; }
    .rm-drop {
      position: absolute; top: 0; left: 50%; z-index: 2; white-space: nowrap;
      padding: 9px 14px 8px; border-radius: 22px 22px 22px 22px / 26px 26px 18px 18px;
      font-weight: 800; font-size: clamp(1rem, 4.2vw, 1.25rem); font-variant-numeric: tabular-nums;
      background: color-mix(in srgb, #38bdf8 26%, var(--panel-solid)); border: 2px solid #38bdf8; color: var(--text);
      box-shadow: 0 4px 12px color-mix(in srgb, #0ea5e9 25%, transparent);
      will-change: translate;
    }
    .rm-drop::before {
      content: ""; position: absolute; left: 50%; top: -9px; width: 14px; height: 14px; transform: translateX(-50%) rotate(45deg);
      background: inherit; border-left: 2px solid #38bdf8; border-top: 2px solid #38bdf8; border-radius: 3px 0 0 0; z-index: -1;
    }
    .rm-drop.mirror { background: color-mix(in srgb, #d946ef 26%, var(--panel-solid)); border-color: #d946ef; box-shadow: 0 4px 14px color-mix(in srgb, #d946ef 35%, transparent); }
    .rm-drop.mirror::before { border-color: #d946ef; }
    .rm-badge {
      display: inline-grid; place-items: center; margin-left: 7px; width: 1.45em; height: 1.45em; border-radius: 50%;
      background: #d946ef; color: #fff; font-size: .8em; vertical-align: 1px;
    }
    .rm-drop.low { border-color: var(--bad); }
    .rm-drop.pop { animation: rmPop .28s ease-out forwards; }
    .rm-drop.splash { animation: rmSplash .4s ease-in forwards; border-color: var(--bad); }
    @keyframes rmPop { to { opacity: 0; scale: 1.6; filter: blur(2px); } }
    @keyframes rmSplash { to { opacity: 0; scale: 1.6 .3; } }
    .rm-float { position: absolute; z-index: 4; font-weight: 900; color: var(--good); pointer-events: none; animation: rmFloat .7s ease-out forwards; transform: translate(-50%, 0); }
    @keyframes rmFloat { to { opacity: 0; translate: 0 -40px; } }
    .rm-kp { width: min(320px, 100%); }
    .rm-kp .keypad { width: 100%; gap: 6px; }
    .rm-kp .kp-display { min-height: 46px; font-size: 1.7rem; }
    .rm-kp .kp-grid { gap: 6px; }
    .rm-kp .kp-key { height: 46px; }
    .rm-kp.nomatch .kp-display { border-color: color-mix(in srgb, var(--bad) 60%, var(--line)); }
    @media (max-height: 760px) { .rm-kp .kp-key { height: 40px; } .rm-kp .kp-display { min-height: 40px; font-size: 1.4rem; } }
  `);

  const lifeEl = h('span.rm-lives');
  const comboEl = h('span.rm-combo');
  const ground = h('div.rm-ground');
  const sky = h('div.rm-sky', h('div.rm-status', lifeEl, comboEl), ground);
  const kpWrap = h('div.rm-kp');
  api.stage.append(h('div.rm-wrap', sky, kpWrap));

  const kp = api.keypad({
    parent: kpWrap, maxLen: 3,
    onSubmit: submit,
    onChange: (v) => kpWrap.classList.toggle('nomatch', !!v && !drops.some((d) => !d.gone && d.req.startsWith(v))),
    // Auto-pop only when the typed value matches a drop and no longer answer on screen could still be meant.
    autoSubmit: (v) => drops.some((d) => !d.gone && d.req === v) && !drops.some((d) => !d.gone && d.req.length > v.length && d.req.startsWith(v)),
  });

  function renderLives() {
    lifeEl.innerHTML = '';
    for (let i = 0; i < 3; i++) lifeEl.append(h('span' + (i < lives ? '' : '.lost'), i < lives ? '♥' : '♡'));
    api.setInfo(`${'♥'.repeat(lives)}${'♡'.repeat(3 - lives)}  ·  ${popped} popped`);
  }
  renderLives();
  api.setScore(0);

  // ── problem generation ──────────────────────────────────────
  function problem(el) {
    const L = level;
    const addMax = [12, 20, 35, 60, 90][L - 1] + Math.floor(el / 15) * 2;
    const ops = ['+', '−'];
    if (L >= 2 || el > 30) ops.push('×');
    if (L >= 4) ops.push('÷');
    const op = pick(ops);
    let a, b, ans;
    if (op === '+') { a = rand(2, addMax); b = rand(2, addMax); ans = a + b; }
    else if (op === '−') { a = rand(5, addMax + 10); b = rand(1, a - 1); ans = a - b; }
    else if (op === '×') { const m = [5, 6, 9, 12, 12][L - 1]; a = rand(2, m); b = rand(2, 9); ans = a * b; }
    else { b = rand(2, 9); ans = rand(2, L >= 5 ? 12 : 9); a = ans * b; }
    return { text: `${a} ${op} ${b}`, ans };
  }

  function spawn(el) {
    const mirrorChance = el < 6 ? 0 : 0.12 + 0.03 * level;
    let mirror = Math.random() < mirrorChance, p, req;
    for (let t = 0; t < 40; t++) {
      p = problem(el);
      if (mirror && !mirrorable(p.ans)) { if (t > 30) mirror = false; continue; }
      req = String(mirror ? reverse(p.ans) : p.ans);
      if (!drops.some((d) => !d.gone && d.req === req)) break;
    }
    // lanes: avoid stacking right below a recently spawned drop
    const lanes = clamp(Math.floor(sky.clientWidth / 112), 3, 6);
    const busy = new Set(drops.filter((d) => !d.gone && d.y < 0.3).map((d) => d.lane));
    const free = [...Array(lanes).keys()].filter((i) => !busy.has(i));
    const lane = free.length ? pick(free) : rand(0, lanes - 1);
    const el2 = h('div.rm-drop' + (mirror ? '.mirror' : ''), p.text, mirror ? h('span.rm-badge', '⇄') : null);
    el2.style.left = ((lane + 0.5) / lanes) * 100 + '%';
    sky.append(el2);
    const fallTime = clamp(12 - 1.1 * (level - 1) - el * 0.045, 4.2, 12) * (mirror ? 1.15 : 1);
    drops.push({ id: nextId++, el: el2, y: 0, v: 1 / fallTime, req, mirror, ans: p.ans, lane, gone: false });
  }

  function remove(d, cls) {
    d.gone = true;
    d.el.classList.add(cls);
    api.after(450, () => d.el.remove());
  }

  function submit(v) {
    if (lives <= 0) return; // the round is over; finish() runs shortly
    const hits = drops.filter((d) => !d.gone && d.req === v);
    if (!hits.length) {
      wrong++; combo = 0; comboEl.classList.remove('on');
      api.bad();
      return;
    }
    const d = hits.reduce((a, b) => (b.y > a.y ? b : a));
    combo++; bestCombo = Math.max(bestCombo, combo);
    const gain = 10 + (d.mirror ? 5 : 0) + (combo >= 6 ? 2 : combo >= 3 ? 1 : 0);
    score += gain; popped++; if (d.mirror) mirrorsPopped++;
    api.setScore(score);
    const r = d.el.getBoundingClientRect(), sr = sky.getBoundingClientRect();
    api.good(r.left + r.width / 2, r.top + r.height / 2);
    const f = h('div.rm-float', '+' + gain);
    f.style.left = r.left - sr.left + r.width / 2 + 'px';
    f.style.top = r.top - sr.top - 10 + 'px';
    sky.append(f);
    api.after(700, () => f.remove());
    comboEl.textContent = `combo ×${combo}`;
    comboEl.classList.toggle('on', combo >= 3);
    remove(d, 'pop');
    renderLives();
  }

  function finish() {
    api.end({
      score,
      stats: { Popped: String(popped), 'Mirror drops': String(mirrorsPopped), 'Best combo': String(bestCombo), Missed: String(missed), 'Wrong entries': String(wrong) },
    });
  }

  api.timer(GAME_SECS, finish);

  api.loop((dt, el) => {
    api.setProgress(el / GAME_SECS);
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn(el);
      spawnIn = clamp(3.0 - 0.25 * (level - 1) - el * 0.016, 0.95, 3.0) * (0.85 + Math.random() * 0.3);
    }
    const H = sky.clientHeight;
    for (const d of drops) {
      if (d.gone) continue;
      d.y += d.v * dt;
      const dh = d.el.offsetHeight || 44;
      d.el.style.translate = `-50% ${40 + d.y * (H - dh - 50)}px`; // start below the hearts/combo line // `translate` (not transform) so the scale animations stay in place
      if (d.y > 0.8) d.el.classList.add('low');
      if (d.y >= 1) {
        missed++; lives--; combo = 0; comboEl.classList.remove('on');
        remove(d, 'splash');
        api.sfx.bad();
        ground.classList.add('hit');
        api.after(250, () => ground.classList.remove('hit'));
        api.banner(`${d.el.firstChild.textContent} = ${d.ans}${d.mirror ? ' ⇄ ' + d.req : ''}`, 1100);
        renderLives();
        if (lives <= 0) { api.after(500, finish); return false; }
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].gone && !drops[i].el.isConnected) drops.splice(i, 1);
    if (kp.value) kpWrap.classList.toggle('nomatch', !drops.some((d) => !d.gone && d.req.startsWith(kp.value)));
  });
}
