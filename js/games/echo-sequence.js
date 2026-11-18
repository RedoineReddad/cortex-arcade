// Backwards Echo: Simon-style melody memory. Orange rounds must be echoed in reverse.
import { rand, clamp } from '../core/util.js';

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const FWD = '#22c55e', REV = '#f97316';

export default function start(api) {
  const { h, level } = api;
  const MAX_ROUNDS = 12;
  const PADS = level <= 2 ? 6 : 8;
  let len = 3 + Math.floor((level - 1) / 2); // 3,3,4,4,5
  let lives = 3, round = 0, score = 0, done = 0, best = 0, revDone = 0;
  let lastModes = [];
  let seq = [], expect = [], pos = 0, accepting = false, reverse = false;

  api.css(`
    .es-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; }
    .es-ring {
      position:relative; width:min(380px, 88vw, 50dvh); aspect-ratio:1; border-radius:50%;
      border:8px solid var(--es-mode, ${FWD}); background:var(--bg2);
      box-shadow:0 0 0 4px color-mix(in srgb,var(--es-mode, ${FWD}) 25%,transparent), var(--shadow);
      transition:border-color .3s, box-shadow .3s;
    }
    .es-pad {
      position:absolute; width:25%; aspect-ratio:1; border-radius:50%; transform:translate(-50%,-50%);
      border:3px solid color-mix(in srgb,var(--pc) 70%,#000); cursor:pointer; padding:0;
      background:color-mix(in srgb,var(--pc) 45%,var(--panel-solid)); opacity:.85;
      transition:transform .12s, box-shadow .12s, background .12s, opacity .12s;
      font-weight:800; font-size:.9rem; color:color-mix(in srgb,var(--pc) 40%,var(--text));
    }
    .es-pad.lit {
      background:var(--pc); opacity:1; transform:translate(-50%,-50%) scale(1.14);
      box-shadow:0 0 26px 6px color-mix(in srgb,var(--pc) 70%,transparent);
    }
    .es-ring.input .es-pad:hover { opacity:1; }
    .es-center {
      position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:44%; aspect-ratio:1;
      border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:var(--panel-solid); border:2px solid var(--line); text-align:center; gap:2px;
    }
    .es-arrow { font-size:clamp(1.6rem, 6vw, 2.4rem); font-weight:900; color:var(--es-mode, ${FWD}); line-height:1; }
    .es-mode { font-weight:800; font-size:.85rem; letter-spacing:.06em; color:var(--es-mode, ${FWD}); }
    .es-state { font-size:.8rem; color:var(--muted); font-weight:600; }
    .es-steps { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; min-height:14px; max-width:340px; }
    .es-step { width:14px; height:14px; border-radius:50%; background:var(--line); transition:background .15s; }
    .es-step.on { background:var(--es-mode, ${FWD}); }
    .es-lives { font-size:1.3rem; letter-spacing:4px; }
    .banner.es-b-fwd { border-color:${FWD}; color:${FWD}; }
    .banner.es-b-rev { border-color:${REV}; color:${REV}; }
  `);

  const ring = h('div.es-ring');
  const arrow = h('div.es-arrow', '▶');
  const modeTxt = h('div.es-mode', 'FORWARD');
  const state = h('div.es-state', 'Watch');
  const center = h('div.es-center', arrow, modeTxt, state);
  const pads = [];
  for (let i = 0; i < PADS; i++) {
    const a = (i / PADS) * Math.PI * 2 - Math.PI / 2;
    const p = h('button.es-pad', {
      type: 'button', 'aria-label': 'pad ' + (i + 1),
      style: { left: 50 + 36 * Math.cos(a) + '%', top: 50 + 36 * Math.sin(a) + '%', '--pc': COLORS[i] },
      onpointerdown: (e) => { e.preventDefault(); press(i); },
    }, String(i + 1));
    p.style.setProperty('--pc', COLORS[i]);
    pads.push(p);
    ring.append(p);
  }
  ring.append(center);
  const steps = h('div.es-steps');
  const sub = h('div.g-sub', 'Keys 1–' + PADS + ' work too');
  const wrap = h('div.es-wrap', ring, steps, sub);
  api.stage.append(wrap);
  const km = {};
  for (let i = 0; i < PADS; i++) km[String(i + 1)] = () => press(i);
  api.keys(km);
  api.setScore(0);

  const showLives = () => api.setInfo(`${'♥'.repeat(lives)}${'♡'.repeat(3 - lives)} · Round ${Math.min(round, MAX_ROUNDS)}/${MAX_ROUNDS}`);

  function flash(i, ms) {
    pads[i].classList.add('lit');
    api.sfx.note(i);
    api.after(ms, () => pads[i].classList.remove('lit'));
  }

  function setMode(rev) {
    reverse = rev;
    const col = rev ? REV : FWD;
    wrap.style.setProperty('--es-mode', col);
    arrow.textContent = rev ? '◀' : '▶';
    modeTxt.textContent = rev ? 'REVERSE' : 'FORWARD';
  }

  function play(list, gap, then) {
    let k = 0;
    const stepFn = () => {
      if (api.ended) return;
      if (k >= list.length) { api.after(200, then); return; }
      flash(list[k], gap * 0.62);
      k++;
      api.after(gap, stepFn);
    };
    stepFn();
  }

  function newRound() {
    if (api.ended) return;
    if (round >= MAX_ROUNDS || lives <= 0) return finish();
    round++;
    showLives();
    api.setProgress((round - 1) / MAX_ROUNDS);
    let rev = false;
    if (round > 1) {
      rev = Math.random() < 0.5;
      const l2 = lastModes.slice(-2);
      if (l2.length === 2 && l2[0] === l2[1]) rev = !l2[0];
    }
    lastModes.push(rev);
    setMode(rev);
    seq = [];
    for (let i = 0; i < len; i++) {
      let p;
      do p = rand(0, PADS - 1); while (p === seq[i - 1]);
      seq.push(p);
    }
    expect = rev ? seq.slice().reverse() : seq.slice();
    pos = 0;
    steps.innerHTML = '';
    for (let i = 0; i < len; i++) steps.append(h('div.es-step'));
    ring.classList.remove('input');
    state.textContent = 'Watch';
    api.banner(rev ? '◀ Reverse!' : 'Forward ▶', 1000, rev ? 'es-b-rev' : 'es-b-fwd');
    const gap = clamp(720 - round * 22 - level * 18, 340, 720);
    api.after(1150, () => play(seq, gap, () => {
      if (api.ended) return;
      accepting = true;
      ring.classList.add('input');
      state.textContent = rev ? 'Echo it backwards' : 'Your turn';
    }));
  }

  function press(i) {
    if (!accepting || api.ended) return;
    const r = pads[i].getBoundingClientRect();
    if (i === expect[pos]) {
      flash(i, 220);
      steps.children[pos]?.classList.add('on');
      pos++;
      if (pos >= expect.length) {
        accepting = false;
        ring.classList.remove('input');
        const pts = Math.round(len * 2 * (reverse ? 1.5 : 1));
        score += pts; done++; best = Math.max(best, len);
        if (reverse) revDone++;
        api.setScore(score);
        api.good(r.left + r.width / 2, r.top + r.height / 2);
        state.textContent = `+${pts}`;
        len++;
        api.after(800, newRound);
      }
    } else {
      accepting = false;
      ring.classList.remove('input');
      lives--;
      api.bad(r.left + r.width / 2, r.top + r.height / 2);
      showLives();
      state.textContent = 'It was…';
      pads[i].classList.add('lit');
      api.after(300, () => pads[i].classList.remove('lit'));
      api.after(700, () => {
        steps.querySelectorAll('.es-step').forEach((s) => s.classList.remove('on'));
        let k = 0;
        play(expect, 420, () => api.after(500, newRound));
        // light the step dots along with the replay
        const tick = () => { if (k < expect.length) { steps.children[k]?.classList.add('on'); k++; api.after(420, tick); } };
        tick();
      });
    }
  }

  function finish() {
    api.setProgress(1);
    api.end({ score, stats: { Echoed: `${done} sequences`, 'Reversed': String(revDone), 'Longest': best ? `${best} notes` : '—' } });
  }

  window.__cortexDebug = { get expect() { return expect; }, get accepting() { return accepting; }, press: (i) => press(i) };
  api.onCleanup(() => { delete window.__cortexDebug; });
  newRound();
}
