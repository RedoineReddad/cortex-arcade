// Color Clash: Stroop task. Solid frame → answer the INK colour; dashed frame → answer the WORD.
import { pick, shuffle, clamp } from '../core/util.js';

const COLORS = [
  { n: 'RED', c: '#e11d2e' },
  { n: 'BLUE', c: '#2f6df6' },
  { n: 'GREEN', c: '#16a34a' },
  { n: 'YELLOW', c: '#eab308' },
  { n: 'PURPLE', c: '#9333ea' },
  { n: 'ORANGE', c: '#f97316' },
];

export default function start(api) {
  const { h, level } = api;
  const nColors = [4, 4, 5, 5, 6][level - 1];
  const palette = COLORS.slice(0, nColors);
  const wordRate = [0.35, 0.4, 0.42, 0.45, 0.5][level - 1]; // share of dashed (WORD) trials
  const congruentRate = [0.2, 0.15, 0.12, 0.1, 0.08][level - 1];
  const shuffleButtons = level >= 3;

  api.css(`
    .cl-wrap { width: min(520px, 100%); display: flex; flex-direction: column; align-items: center; gap: clamp(12px, 3vh, 26px); }
    .cl-card {
      position: relative; width: min(400px, 92%); aspect-ratio: 1.55; border-radius: 26px;
      display: grid; place-items: center; background: var(--bg2);
      border: 10px solid color-mix(in srgb, var(--text) 80%, transparent);
      box-shadow: var(--shadow);
    }
    .cl-card.cl-word { border-style: dashed; border-color: color-mix(in srgb, var(--text) 70%, transparent); background: color-mix(in srgb, var(--bg2) 85%, var(--c)); }
    .cl-card.cl-pop { animation: clPop .18s ease-out; }
    @keyframes clPop { from { transform: scale(.9); opacity: .2; } to { transform: scale(1); opacity: 1; } }
    .cl-word-txt {
      font-size: clamp(2.6rem, 12vw, 4.4rem); font-weight: 900; letter-spacing: .04em;
      text-shadow: 0 2px 0 rgba(0,0,0,.18), 0 0 1px rgba(0,0,0,.4);
    }
    .cl-mode {
      position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
      padding: 5px 14px; border-radius: 99px; font-weight: 800; font-size: .95rem; white-space: nowrap;
      background: var(--panel-solid); border: 2px solid var(--line); box-shadow: var(--shadow);
    }
    .cl-card.cl-word .cl-mode { border-color: var(--c); color: var(--c); }
    .cl-legend { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; color: var(--muted); font-size: .9rem; }
    .cl-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .cl-legend i { display: inline-block; width: 26px; height: 16px; border-radius: 5px; border: 3px solid var(--muted); }
    .cl-legend i.d { border-style: dashed; }
    .cl-btns { display: grid; gap: 10px; width: min(480px, 100%); grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cl-btns.cl-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    @media (max-width: 560px) { .cl-btns.cl-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .cl-btn { display: flex; align-items: center; gap: 10px; padding: 12px 12px; font-size: 1.05rem; position: relative; justify-content: flex-start; }
    .cl-sw { width: 30px; height: 30px; border-radius: 50%; flex: none; box-shadow: inset 0 -3px 0 rgba(0,0,0,.2), 0 0 0 2px color-mix(in srgb, var(--text) 15%, transparent); }
    .cl-key { position: absolute; top: 4px; right: 8px; font-size: .7rem; color: var(--muted); font-weight: 600; }
    @media (max-width: 400px) { .cl-btn { font-size: .9rem; gap: 7px; padding: 12px 8px; } .cl-sw { width: 24px; height: 24px; } }
  `);

  const modeTag = h('div.cl-mode');
  const wordTxt = h('div.cl-word-txt');
  const card = h('div.cl-card', modeTag, wordTxt);
  const legend = h('div.cl-legend',
    h('span', h('i'), 'Solid → 🎨 ink'),
    h('span', h('i.d'), 'Dashed → 💬 word'));
  const btnGrid = h('div.cl-btns' + (nColors > 4 ? '.cl-3' : ''));
  api.stage.append(h('div.cl-wrap', card, legend, btnGrid));

  let order = palette.slice();
  let buttons = [];
  function buildButtons() {
    btnGrid.replaceChildren();
    buttons = order.map((col, i) => {
      const b = h('button.choice.cl-btn', { type: 'button', onpointerdown: (e) => { e.preventDefault(); answer(i, e); } },
        h('span.cl-sw', { style: { background: col.c } }), col.n, h('span.cl-key', String(i + 1)));
      btnGrid.append(b);
      return b;
    });
  }
  buildButtons();

  let score = 0, correct = 0, wrong = 0, n = 0, rtSum = 0, wordN = 0, wordOk = 0;
  let trial = null, locked = true;
  api.setScore(0);

  const keyMap = {};
  for (let i = 1; i <= 6; i++) keyMap[String(i)] = () => answer(i - 1);
  api.keys(keyMap);

  function next() {
    if (api.ended) return;
    const mode = Math.random() < wordRate ? 'word' : 'ink';
    const word = pick(palette);
    let ink = Math.random() < congruentRate ? word : pick(palette.filter((c) => c !== word));
    // Don't repeat the exact same card twice in a row.
    if (trial && trial.word === word && trial.ink === ink && trial.mode === mode) ink = pick(palette.filter((c) => c !== word));
    trial = { mode, word, ink, t0: performance.now(), answer: mode === 'ink' ? ink : word };
    if (shuffleButtons) { order = shuffle(palette); buildButtons(); }
    else buttons.forEach((b) => b.classList.remove('right', 'wrong'));
    card.classList.toggle('cl-word', mode === 'word');
    modeTag.textContent = mode === 'ink' ? '🎨 INK colour' : '💬 WORD meaning';
    wordTxt.textContent = word.n;
    wordTxt.style.color = ink.c;
    card.classList.remove('cl-pop'); void card.offsetWidth; card.classList.add('cl-pop');
    locked = false;
  }

  function answer(i, e) {
    if (locked || api.ended || !trial || i >= buttons.length) return;
    locked = true;
    n++;
    const rt = (performance.now() - trial.t0) / 1000;
    const chosen = order[i];
    const ok = chosen === trial.answer;
    const b = buttons[i];
    const r = b.getBoundingClientRect();
    if (trial.mode === 'word') wordN++;
    if (ok) {
      correct++; rtSum += rt;
      if (trial.mode === 'word') wordOk++;
      const bonus = Math.round(5 * clamp((1.5 - rt) / 1.0, 0, 1));
      score += 10 + bonus;
      b.classList.add('right');
      api.good(r.left + r.width / 2, r.top);
    } else {
      wrong++;
      score = Math.max(0, score - 5);
      b.classList.add('wrong');
      buttons[order.indexOf(trial.answer)].classList.add('right');
      api.bad(r.left + r.width / 2, r.top);
    }
    api.setScore(score);
    api.after(ok ? 220 : 650, next);
  }

  api.timer(45, () => {
    locked = true;
    api.end({
      score,
      stats: {
        Correct: `${correct} / ${n}`,
        Accuracy: n ? Math.round((100 * correct) / n) + '%' : '–',
        'Word-frame accuracy': wordN ? Math.round((100 * wordOk) / wordN) + '%' : '–',
        'Avg time': correct ? (rtSum / correct).toFixed(2) + 's' : '–',
      },
    });
  });

  window.__cortexDebug = { get answerIndex() { return trial && !locked ? order.indexOf(trial.answer) : -1; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  next();
}
