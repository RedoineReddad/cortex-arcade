// Triangle Twist: collapse a number triangle row by row; type only the bottom value.
// Twist: blue rows add neighbours, red rows subtract them (left − right).
import { rand, shuffle } from '../core/util.js';

export default function start(api) {
  const { h, level } = api;
  let score = 0, correct = 0, wrong = 0, round = 0;
  let cur = null, locked = false;

  api.css(`
    .tt-wrap { display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%; flex: 1; min-height: 0; justify-content: center; }
    .tt-board { display: flex; flex-direction: column; align-items: center; gap: var(--tt-g); --tt-s: clamp(56px, 19vw, 86px); --tt-g: clamp(8px, 2.4vw, 14px); }
    .tt-board.w4 { --tt-s: clamp(52px, 16vw, 80px); }
    .tt-row { display: flex; gap: var(--tt-g); position: relative; }
    .tt-cell {
      width: var(--tt-s); height: var(--tt-s); border-radius: 14px; display: grid; place-items: center; position: relative;
      font-size: calc(var(--tt-s) * .42); font-weight: 800; font-variant-numeric: tabular-nums;
      background: var(--panel-solid); border: 2px solid var(--line);
    }
    .tt-row.top .tt-cell { background: color-mix(in srgb, var(--c) 16%, var(--panel-solid)); border-color: color-mix(in srgb, var(--c) 55%, transparent); }
    .tt-row.add .tt-cell { border: 3px dashed #3b82f6; background: color-mix(in srgb, #3b82f6 12%, var(--panel-solid)); }
    .tt-row.sub .tt-cell { border: 3px dashed #ef4444; background: color-mix(in srgb, #ef4444 12%, var(--panel-solid)); }
    .tt-row.add .tt-cell::after, .tt-row.sub .tt-cell::after {
      position: absolute; top: 2px; right: 6px; font-size: calc(var(--tt-s) * .24); font-weight: 900; opacity: .75;
    }
    .tt-row.add .tt-cell::after { content: "+"; color: #3b82f6; }
    .tt-row.sub .tt-cell::after { content: "−"; color: #ef4444; }
    .tt-cell.long { font-size: calc(var(--tt-s) * .32); }
    .tt-cell.filled { border-style: solid; animation: pop .3s ease-out; }
    .tt-cell.final { box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 25%, transparent); }
    .tt-cell.final.typing { color: var(--c); }
    .tt-cell.ok { border: 3px solid var(--good) !important; background: color-mix(in srgb, var(--good) 28%, var(--panel-solid)) !important; }
    .tt-cell.no { border: 3px solid var(--bad) !important; background: color-mix(in srgb, var(--bad) 28%, var(--panel-solid)) !important; }
    .tt-you { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); font-size: .8rem; color: var(--bad); white-space: nowrap; font-weight: 700; }
    .tt-legend { display: flex; gap: 14px; font-size: .9rem; color: var(--muted); flex-wrap: wrap; justify-content: center; }
    .tt-legend b { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
    .tt-kp .keypad { width: min(300px, 100%); }
    .tt-kp { width: min(300px, 100%); }
    @media (max-height: 760px) { .tt-kp .kp-key { height: 42px; } .tt-kp .kp-wide { height: 34px; } }
  `);

  const board = h('div.tt-board');
  const legend = h('div.tt-legend',
    h('span', h('b', { style: { background: '#3b82f6' } }), 'blue: add'),
    h('span', h('b', { style: { background: '#ef4444' } }), 'red: left − right'));
  const kpWrap = h('div.tt-kp');
  api.stage.append(h('div.tt-wrap', board, legend), kpWrap);

  const kp = api.keypad({
    parent: kpWrap, maxLen: 3, negative: true, hideDisplay: true, // answers never exceed 3 digits (max 8 × 15 = 120)
    onChange: (v) => {
      if (!cur || locked) return;
      cur.finalEl.textContent = v ? v.replace('-', '−') : '?';
      cur.finalEl.classList.toggle('long', v.length >= 4);
      cur.finalEl.classList.toggle('typing', !!v);
    },
    onSubmit: answer,
  });

  function make() {
    round++;
    const width = level >= 3 ? 4 : 3;
    const maxN = [9, 12, 9, 12, 15][level - 1];
    const minN = level >= 5 ? 2 : 1;
    const nRows = width - 1;
    // at least one blue and one red row so the twist always matters
    let ops = Array.from({ length: nRows }, () => (Math.random() < 0.5 ? 'add' : 'sub'));
    if (!ops.includes('add') || !ops.includes('sub')) { ops[0] = 'add'; ops[1] = 'sub'; ops = shuffle(ops); }
    const rows = [Array.from({ length: width }, () => rand(minN, maxN))];
    for (const op of ops) {
      const p = rows[rows.length - 1];
      rows.push(p.slice(1).map((r, i) => (op === 'add' ? p[i] + r : p[i] - r)));
    }
    board.innerHTML = '';
    board.classList.toggle('w4', width === 4);
    const cells = rows.map((row, ri) => {
      const rowEl = h('div.tt-row.' + (ri === 0 ? 'top' : ops[ri - 1]));
      const els = row.map((v) => h('div.tt-cell', ri === 0 ? String(v) : ''));
      rowEl.append(...els);
      board.append(rowEl);
      return els;
    });
    const finalEl = cells[cells.length - 1][0];
    finalEl.classList.add('final');
    finalEl.textContent = '?';
    cur = { rows, cells, finalEl, answer: rows[rows.length - 1][0] };
    locked = false;
    kp.clear(); // drop anything typed while the last answer was being shown
    api.setInfo(`✓ ${correct}  ✗ ${wrong}`);
  }

  function answer(v) {
    if (!cur || locked) return;
    locked = true;
    const ok = Number(v) === cur.answer;
    const { rows, cells, finalEl } = cur;
    // reveal intermediate rows
    rows.forEach((row, ri) => {
      if (ri === 0) return;
      row.forEach((val, ci) => {
        const c = cells[ri][ci];
        c.textContent = String(val).replace('-', '−');
        c.classList.toggle('long', String(val).length >= 4);
        c.classList.add('filled');
      });
    });
    finalEl.classList.remove('typing');
    finalEl.classList.add(ok ? 'ok' : 'no');
    const r = finalEl.getBoundingClientRect();
    if (ok) { correct++; score += 10; api.good(r.left + r.width / 2, r.top); }
    else {
      wrong++; score = Math.max(0, score - 3); api.bad(r.left + r.width / 2, r.top);
      finalEl.append(h('span.tt-you', `you: ${v.replace('-', '−')}`));
    }
    api.setScore(score);
    api.setInfo(`✓ ${correct}  ✗ ${wrong}`);
    api.after(ok ? 900 : 1800, make);
  }

  api.setScore(0);
  api.timer(60, () => api.end({ score, stats: { Correct: String(correct), Wrong: String(wrong), Accuracy: correct + wrong ? Math.round((100 * correct) / (correct + wrong)) + '%' : '–' } }));
  make();
}
