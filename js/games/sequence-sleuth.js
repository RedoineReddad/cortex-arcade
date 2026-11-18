// Pattern Sleuth: what comes next? Some sequences are two series woven together.
import { rand, pick, shuffle, clamp } from '../core/util.js';

/* ---------- sequence generators (pure, exported for testing) ---------- */
// Each returns { terms: number[] (shown), answer, wrong: number[] (plausible mistakes), rule, inter? }

function arith(len, level) {
  const k = level >= 3 && Math.random() < 0.3 ? -rand(2, 9) : rand(2, level >= 2 ? 12 : 9);
  const a = k < 0 ? rand(-k * (len + 1), -k * (len + 1) + 30) : rand(1, 20);
  const s = Array.from({ length: len + 1 }, (_, i) => a + i * k);
  const ans = s[len];
  return { terms: s.slice(0, len), answer: ans, wrong: [ans + 1, ans - 1, ans + k, ans + 2, ans - 2, ans + 10], rule: (k > 0 ? '+' : '−') + Math.abs(k) + ' each time' };
}
function geometric(len) {
  const r = pick([2, 2, 3]);
  const a = r === 2 ? rand(1, 6) : rand(1, 3);
  const n = r === 3 ? Math.min(len, 5) : len;
  const s = Array.from({ length: n + 1 }, (_, i) => a * r ** i);
  const ans = s[n], last = s[n - 1];
  return { terms: s.slice(0, n), answer: ans, wrong: [last + (last - s[n - 2]), last * (r + 1), last * r + r, ans - a, last * 2 + last], rule: '×' + r + ' each time' };
}
function alternating(len) {
  const p = rand(2, 9);
  let q = Math.random() < 0.55 ? -rand(1, 6) : rand(1, 9);
  if (q === p) q += 1;
  let x = rand(8, 25) + Math.max(0, -(p + q)) * 4;
  const s = [x];
  for (let i = 0; i < len; i++) { x += i % 2 === 0 ? p : q; s.push(x); }
  const ans = s[len];
  const step = (len - 1) % 2 === 0 ? p : q; // the step that produces the answer
  const other = step === p ? q : p;
  const last = s[len - 1];
  return { terms: s.slice(0, len), answer: ans, wrong: [last + other, ans + 1, last - step, ans - 1, last + p + q], rule: `alternately ${sgn(p)}, ${sgn(q)}` };
}
function squares(len) {
  const st = rand(1, 5), off = Math.random() < 0.35 ? pick([-1, 1, 2]) : 0;
  const s = Array.from({ length: len + 1 }, (_, i) => (st + i) ** 2 + off);
  const ans = s[len], last = s[len - 1];
  return { terms: s.slice(0, len), answer: ans, wrong: [last + (last - s[len - 2]), ans + 1, ans - 2, last * 2, ans + 2 * (st + len)], rule: 'square numbers' + (off ? ` ${sgn(off)}` : '') };
}
function triangular(len) {
  const st = rand(1, 4);
  const T = (n) => (n * (n + 1)) / 2;
  const s = Array.from({ length: len + 1 }, (_, i) => T(st + i));
  const ans = s[len], last = s[len - 1];
  return { terms: s.slice(0, len), answer: ans, wrong: [last + (last - s[len - 2]), ans + 1, ans - 1, ans + st + len + 1, last * 2], rule: 'differences +1 each time (triangular)' };
}
function fib(len) {
  let a = rand(1, 5), b = rand(a, a + 5);
  const s = [a, b];
  while (s.length < len + 1) s.push(s[s.length - 1] + s[s.length - 2]);
  const ans = s[len], last = s[len - 1], prev = s[len - 2];
  return { terms: s.slice(0, len), answer: ans, wrong: [last + (last - prev), last * 2, ans + 1, ans - 1, last + prev - s[len - 3]], rule: 'add the previous two' };
}
function growing(len, level) {
  const d0 = rand(1, 4), inc = level >= 3 ? pick([1, 2, 2, 3]) : 1;
  let x = rand(1, 20);
  const s = [x];
  for (let i = 0; i < len; i++) { x += d0 + i * inc; s.push(x); }
  const ans = s[len], last = s[len - 1], lastD = last - s[len - 2];
  return { terms: s.slice(0, len), answer: ans, wrong: [last + lastD, ans + 1, ans - 1, ans + inc, last + lastD + 2 * inc], rule: `gaps grow by ${inc}` };
}
function interleaved(len, level) {
  // Seq A at even positions, seq B at odd positions. The answer is position `len`.
  const mk = (kind) => {
    if (kind === 'mul') { const a = rand(1, 3), r = 2; return { at: (i) => a * r ** i, desc: '×2' }; }
    const k = (Math.random() < 0.4 ? -1 : 1) * rand(1, level >= 3 ? 9 : 5);
    const a = k < 0 ? rand(-k * 5 + 1, -k * 5 + 20) : rand(1, 20);
    return { at: (i) => a + k * i, desc: sgn(k) };
  };
  const A = mk(level >= 4 && Math.random() < 0.3 ? 'mul' : 'add');
  let B = mk('add');
  for (let t = 0; t < 10 && B.at(0) === A.at(0); t++) B = mk('add');
  const s = Array.from({ length: len + 1 }, (_, i) => (i % 2 === 0 ? A : B).at(Math.floor(i / 2)));
  const ans = s[len];
  const mine = len % 2 === 0 ? A : B, other = len % 2 === 0 ? B : A;
  const j = Math.floor(len / 2);
  const otherNext = other.at(Math.floor((len + 1) / 2));
  return {
    terms: s.slice(0, len), answer: ans, inter: true,
    wrong: [otherNext, s[len - 1] + (mine.at(j) - mine.at(j - 1)), s[len - 1] + (s[len - 1] - s[len - 2]), ans + 1, ans - 1, other.at(j) + (mine.at(j) - mine.at(j - 1))],
    rule: `two series: ${A.desc} and ${B.desc}`,
  };
}
function sgn(k) { return (k >= 0 ? '+' : '−') + Math.abs(k); }

export function makePuzzle(level, n) {
  const len = level >= 3 ? pick([5, 6]) : 5;
  const pInter = clamp(0.12 + 0.08 * (level - 1) + 0.03 * n, 0, 0.55);
  let p;
  if (Math.random() < pInter) p = interleaved(level >= 3 ? 6 : pick([5, 6, 6]), level);
  else {
    const pool = [arith, arith, geometric, alternating];
    if (level >= 2) pool.push(squares, growing, fib);
    if (level >= 3) pool.push(triangular, alternating, growing);
    if (level >= 4) pool.push(fib, squares);
    p = pick(pool)(len, level);
  }
  // build 4 distinct choices
  const set = new Set([p.answer]);
  for (const w of shuffle(p.wrong)) if (set.size < 4 && Number.isInteger(w) && w >= 0 && !p.terms.includes(w)) set.add(w);
  let d = 1;
  while (set.size < 4) { const w = p.answer + (Math.random() < 0.5 ? -d : d) * rand(1, 3); if (w >= 0 && w !== p.answer && !p.terms.includes(w)) set.add(w); d++; }
  p.choices = shuffle([...set].slice(0, 4));
  if (!p.choices.includes(p.answer)) p.choices[rand(0, 3)] = p.answer;
  return p;
}

/* ---------- game ---------- */
export default function start(api) {
  const { h, level } = api;
  let score = 0, correct = 0, wrong = 0, n = 0, puzzle, t0 = 0, locked = false, fastest = Infinity;

  api.css(`
    .ps-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(14px,3vh,28px); width:100%; max-width:720px; }
    .ps-seq { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(6px,1.4vw,12px); }
    .ps-term { min-width:clamp(52px,13vw,84px); padding:clamp(10px,2vh,16px) 10px; border-radius:16px; text-align:center;
      background:var(--panel-solid); border:2px solid var(--line); font-size:clamp(1.35rem,5.4vw,2.2rem); font-weight:800;
      font-variant-numeric:tabular-nums; animation:ps-in .35s both; }
    .ps-term.alt { border-color:color-mix(in srgb,var(--c) 45%,var(--line)); background:color-mix(in srgb,var(--c) 10%,var(--panel-solid)); }
    .ps-term.q { border-style:dashed; border-color:var(--c); color:var(--c); }
    .ps-term.q.solved { border-style:solid; color:var(--text); background:color-mix(in srgb,var(--good) 20%,var(--panel-solid)); border-color:var(--good); }
    .ps-term.q.missed { border-style:solid; color:var(--text); background:color-mix(in srgb,var(--bad) 18%,var(--panel-solid)); border-color:var(--bad); }
    .ps-rule { min-height:1.4em; color:var(--muted); font-size:.95rem; text-align:center; }
    .ps-wrap .choice { font-variant-numeric:tabular-nums; position:relative; }
    .ps-wrap .choice kbd { position:absolute; top:6px; left:9px; font:600 .7rem system-ui; color:var(--muted); }
    @keyframes ps-in { from { opacity:0; transform:translateY(8px) scale(.94); } }
  `);

  const seq = h('div.ps-seq');
  const rule = h('div.ps-rule');
  const choices = h('div.choices');
  api.stage.append(h('div.ps-wrap', h('div.g-sub', 'What comes next?'), seq, rule, choices));
  api.setScore(0);
  api.timer(60, finish);

  function show() {
    locked = false;
    puzzle = makePuzzle(level, n);
    seq.replaceChildren(...puzzle.terms.map((t, i) => h('div.ps-term' + (puzzle.inter && level <= 2 && i % 2 === 1 ? '.alt' : ''), { style: { animationDelay: i * 40 + 'ms' } }, String(t).replace('-', '−'))),
      h('div.ps-term.q', { style: { animationDelay: puzzle.terms.length * 40 + 'ms' } }, '?'));
    if (puzzle.inter && level <= 2 && puzzle.terms.length % 2 === 1) seq.lastChild.classList.add('alt');
    rule.textContent = '';
    choices.replaceChildren(...puzzle.choices.map((c, i) => h('button.choice', { type: 'button', onclick: (e) => answer(i, e) }, h('kbd', String(i + 1)), String(c).replace('-', '−'))));
    t0 = performance.now();
    api.setInfo(puzzle.inter && level <= 2 ? 'Two series!' : `#${n + 1}`);
  }

  function answer(i, e) {
    if (locked || api.ended) return;
    locked = true;
    const v = puzzle.choices[i];
    const btn = choices.children[i];
    const q = seq.lastChild;
    const dt = (performance.now() - t0) / 1000;
    const x = e && e.clientX ? e.clientX : undefined, y = e && e.clientY ? e.clientY : undefined;
    q.textContent = String(puzzle.answer).replace('-', '−');
    if (v === puzzle.answer) {
      correct++;
      fastest = Math.min(fastest, dt);
      const bonus = Math.round(5 * clamp((11 - dt) / 8, 0, 1));
      score += 10 + bonus;
      btn.classList.add('right'); q.classList.add('solved');
      api.good(x, y);
      rule.textContent = bonus ? `+${10 + bonus} (speed +${bonus})` : '+10';
    } else {
      wrong++;
      score = Math.max(0, score - 5);
      btn.classList.add('wrong'); q.classList.add('missed');
      [...choices.children][puzzle.choices.indexOf(puzzle.answer)].classList.add('right');
      api.bad(x, y);
      rule.textContent = 'Rule: ' + puzzle.rule;
    }
    api.setScore(score);
    n++;
    api.after(v === puzzle.answer ? 550 : 1500, show);
  }

  function finish() {
    api.end({ score, stats: { Correct: String(correct), Wrong: String(wrong), Accuracy: correct + wrong ? Math.round((100 * correct) / (correct + wrong)) + '%' : '—', Fastest: fastest < Infinity ? fastest.toFixed(1) + 's' : '—' } });
  }

  api.keys({ 1: () => answer(0), 2: () => answer(1), 3: () => answer(2), 4: () => answer(3) });
  window.__cortexDebug = { get answerIndex() { return puzzle && puzzle.choices.indexOf(puzzle.answer); }, get puzzle() { return puzzle; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  show();
}
