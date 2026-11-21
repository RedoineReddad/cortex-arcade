// Chain Reaction: 20 sums where each answer feeds the next problem.
import { rand, pick } from '../core/util.js';

export default function start(api) {
  const { h, level } = api;
  const TOTAL = 20;
  let a = rand(2, 9);
  let n = 0, correct = 0;
  let problem;

  api.css(`
    .cc-chain { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; min-height:30px; max-width:520px; }
    .cc-link { padding:3px 10px; border-radius:99px; background:color-mix(in srgb,var(--c) 15%,transparent); font-weight:700; font-size:.9rem; }
    .cc-link.bad { background:color-mix(in srgb,var(--bad) 25%,transparent); text-decoration:line-through; }
    .cc-carry { color:var(--c); }
  `);

  const chain = h('div.cc-chain');
  const prompt = h('div.g-prompt');
  const sub = h('div.g-sub', 'The answer becomes the next starting number');
  api.stage.append(chain, prompt, sub);
  api.keypad({ maxLen: 3, onSubmit: answer });
  const sw = api.stopwatch();
  api.setScore(0);

  function make() {
    const maxB = [9, 12, 15, 20, 25][level - 1];
    const ops = ['+', '−'];
    if (a <= 12 && level >= 1) ops.push('×');
    const divs = [];
    for (let d = 2; d <= 9; d++) if (a % d === 0 && a / d >= 1) divs.push(d);
    if (level >= 2 && divs.length) ops.push('÷');
    let op = pick(ops), b, res;
    for (let tries = 0; tries < 30; tries++) {
      if (op === '+') { b = rand(1, maxB); res = a + b; }
      else if (op === '−') { b = rand(1, Math.max(1, Math.min(a, maxB))); res = a - b; }
      else if (op === '×') { b = rand(2, Math.min(9, Math.max(2, Math.floor(99 / Math.max(a, 1))))); res = a * b; }
      else { b = pick(divs); res = a / b; }
      if (res >= 0 && res <= 99 && !(op === '×' && a < 2)) break;
      op = pick(['+', '−']);
    }
    // keep chains from collapsing to 0/1 forever
    if (res <= 1 && op !== '+') { op = '+'; b = rand(3, maxB); res = a + b; }
    problem = { a, op, b, res };
    prompt.innerHTML = '';
    prompt.append(h('span.cc-carry', String(a)), ` ${op} ${b} = ?`);
    api.setInfo(`${n + 1} / ${TOTAL}`);
    api.setProgress(n / TOTAL);
  }

  function answer(v) {
    const ok = Number(v) === problem.res;
    if (ok) { correct++; api.good(); } else { api.bad(); api.banner(`${problem.a} ${problem.op} ${problem.b} = ${problem.res}`, 1000); }
    chain.append(h('span.cc-link' + (ok ? '' : '.bad'), ok ? String(problem.res) : v));
    if (chain.children.length > 8) chain.firstChild.remove();
    a = problem.res;
    n++;
    api.setScore(correct);
    if (n >= TOTAL) {
      sw.stop();
      const t = sw.elapsed;
      const speed = Math.round(Math.max(0, 120 - t * 1.2) * (correct / TOTAL)); // integer, as scores must be
      api.end({
        score: correct * 5 + speed,
        stats: { Correct: `${correct} / ${TOTAL}`, Time: t.toFixed(1) + 's', 'Per answer': (t / TOTAL).toFixed(2) + 's' },
      });
    } else make();
  }

  make();
}
