// Exact Change: build the customer's change from the till, ideally with the fewest coins.
// Twist: some coin types are out of stock each round, so the usual greedy answer may not work.
import { rand, pick, shuffle } from '../core/util.js';

const COINS = [
  { v: 1, label: '1¢', size: 40, metal: 'cu' },
  { v: 2, label: '2¢', size: 44, metal: 'cu' },
  { v: 5, label: '5¢', size: 48, metal: 'cu' },
  { v: 10, label: '10¢', size: 46, metal: 'au' },
  { v: 20, label: '20¢', size: 50, metal: 'au' },
  { v: 50, label: '50¢', size: 54, metal: 'au' },
  { v: 100, label: '€1', size: 54, metal: 'bi1' },
  { v: 200, label: '€2', size: 58, metal: 'bi2' },
];
const euro = (c) => `€${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

/** Minimal coin count (and one optimal multiset) for `amount` using `values`. null if impossible. */
export function minCoins(amount, values) {
  const dp = new Array(amount + 1).fill(Infinity), from = new Array(amount + 1).fill(0);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of values) if (c <= a && dp[a - c] + 1 < dp[a]) { dp[a] = dp[a - c] + 1; from[a] = c; }
  }
  if (!isFinite(dp[amount])) return null;
  const coins = [];
  for (let a = amount; a > 0; a -= from[a]) coins.push(from[a]);
  return { count: dp[amount], coins: coins.sort((x, y) => y - x) };
}

export default function start(api) {
  const { h, level } = api;
  let score = 0, rounds = 0, exact = 0, fewest = 0;
  let cur = null, tray = [], locked = true;

  api.css(`
    .cc2-wrap { width: min(520px, 100%); flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; justify-content: center; }
    .cc2-ticket { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
    .cc2-price { padding: 10px 16px; border-radius: 14px; background: var(--panel-solid); border: 1px solid var(--line); text-align: center; }
    .cc2-price small, .cc2-note small { display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 700; }
    .cc2-price b { font-size: clamp(1.6rem, 6.5vw, 2.2rem); font-variant-numeric: tabular-nums; }
    .cc2-note {
      padding: 10px 18px; border-radius: 8px; text-align: center; color: #12351f;
      background: repeating-linear-gradient(135deg, #a7e3b8 0 6px, #95d9a8 6px 12px); border: 2px solid #4f9a68;
      box-shadow: inset 0 0 0 4px rgba(255,255,255,.35);
    }
    .cc2-note.n10 { background: repeating-linear-gradient(135deg, #f6b8b8 0 6px, #eea6a6 6px 12px); border-color: #b25a5a; color: #3d1212; }
    .cc2-note.n20 { background: repeating-linear-gradient(135deg, #b7c8f5 0 6px, #a6b9ee 6px 12px); border-color: #5a6fb2; color: #121c3d; }
    .cc2-note small { color: inherit; opacity: .75; }
    .cc2-note b { font-size: clamp(1.5rem, 6vw, 2rem); }
    .cc2-arrow { font-size: 1.4rem; color: var(--muted); font-weight: 800; }
    .cc2-tray {
      min-height: 112px; border-radius: 18px; border: 2px dashed color-mix(in srgb, var(--c) 50%, var(--line));
      background: color-mix(in srgb, var(--c) 7%, transparent); padding: 10px 12px 8px; display: flex; flex-direction: column; gap: 6px;
    }
    .cc2-tray.ok { border-color: var(--good); border-style: solid; background: color-mix(in srgb, var(--good) 14%, transparent); }
    .cc2-tray.no { border-color: var(--bad); border-style: solid; background: color-mix(in srgb, var(--bad) 12%, transparent); }
    .cc2-tray-head { display: flex; justify-content: space-between; font-weight: 700; color: var(--muted); font-size: .9rem; }
    .cc2-tray-head b { color: var(--text); font-variant-numeric: tabular-nums; font-size: 1.05rem; }
    .cc2-tray-coins { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 52px; --k: .8; }
    .cc2-empty { color: var(--muted); font-size: .9rem; margin: auto; }
    .cc2-answer { font-size: .9rem; font-weight: 700; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; --k: .62; }
    .cc2-till { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 6px; justify-items: center; align-items: center; padding: 6px 0; --k: 1.12; }
    .cc2-coin {
      --sz: calc(var(--s) * var(--k, 1) * 1px); width: var(--sz); height: var(--sz); border-radius: 50%; padding: 0; position: relative;
      display: grid; place-items: center; font-weight: 800; font-size: calc(var(--sz) * .3); cursor: pointer; flex: none;
      border: 2px solid rgba(0,0,0,.28); color: #3b2508; box-shadow: 0 3px 0 rgba(0,0,0,.25), inset 0 0 0 3px rgba(255,255,255,.28);
      transition: transform .08s;
    }
    .cc2-coin:active { transform: scale(.92); }
    .cc2-coin.cu { background: radial-gradient(circle at 35% 30%, #f3c095, #c57a3e 60%, #a35f2a); }
    .cc2-coin.au { background: radial-gradient(circle at 35% 30%, #fff1a8, #e2bb45 60%, #b8902a); }
    .cc2-coin.bi1 { background: radial-gradient(circle, #e9e9ef 0 30%, #b9bcc6 52%, #e2bb45 54%, #c9a23a 100%); }
    .cc2-coin.bi2 { background: radial-gradient(circle, #f3d36a 0 30%, #d4ad3c 52%, #d2d4dc 54%, #a9adb8 100%); }
    .cc2-coin.out { background: color-mix(in srgb, var(--muted) 22%, var(--panel-solid)) !important; color: var(--muted); border: 2px dashed color-mix(in srgb, var(--muted) 60%, transparent); cursor: not-allowed; box-shadow: none; }
    .cc2-coin.out::after {
      content: ""; position: absolute; inset: -4px; border-radius: 50%;
      background: linear-gradient(45deg, transparent 46%, var(--bad) 46% 54%, transparent 54%), linear-gradient(-45deg, transparent 46%, var(--bad) 46% 54%, transparent 54%); opacity: .8;
    }
    .cc2-slot { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 76px; justify-content: center; }
    .cc2-slot small { font-size: .66rem; font-weight: 800; color: var(--bad); letter-spacing: .04em; text-transform: uppercase; }
    .cc2-slot kbd { font-size: .62rem; color: var(--muted); font-family: inherit; }
    @media (hover: none) { .cc2-slot kbd { display: none; } }
    .cc2-tray-coins .cc2-coin { animation: pop .2s ease-out; }
    .cc2-btns { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; }
    .cc2-btns .btn { padding: 14px; font-size: 1.05rem; }
    @media (max-height: 740px) { .cc2-till { --k: .95; gap: 6px; } .cc2-slot { min-height: 64px; } .cc2-tray { min-height: 96px; } }
  `);

  const priceEl = h('b'), noteEl = h('div.cc2-note'), sumEl = h('b', '€0.00');
  const trayCoins = h('div.cc2-tray-coins'), answerEl = h('div.cc2-answer');
  const trayEl = h('div.cc2-tray', h('div.cc2-tray-head', h('span', 'Your change'), sumEl), trayCoins, answerEl);
  const till = h('div.cc2-till');
  const giveBtn = h('button.btn.primary', { type: 'button', onclick: give }, 'Give change ⏎');
  const clearBtn = h('button.btn', { type: 'button', onclick: () => { if (!locked) { tray = []; renderTray(); } } }, 'Clear');
  api.stage.append(h('div.cc2-wrap',
    h('div.cc2-ticket', noteEl, h('span.cc2-arrow', '−'), h('div.cc2-price', h('small', 'Price'), priceEl), h('span.cc2-arrow', '= ?')),
    trayEl, till, h('div.cc2-btns', clearBtn, giveBtn)));

  const coinEl = (c, attrs = {}) => {
    const el = h('button.cc2-coin.' + c.metal, Object.assign({ type: 'button' }, attrs), c.label);
    el.style.setProperty('--s', c.size);
    return el;
  };

  function newRound() {
    rounds++;
    const maxChange = [99, 199, 299, 399, 499][level - 1];
    let change, out, best;
    for (let tries = 0; tries < 200; tries++) {
      change = rand(level === 1 ? 6 : 15, maxChange);
      const full = minCoins(change, COINS.map((c) => c.v));
      const nOut = level === 1 ? 1 : level === 2 ? rand(1, 2) : 2;
      // prefer knocking out coins the obvious (full-till) answer uses, so the twist bites
      const used = [...new Set(full.coins)];
      const others = COINS.map((c) => c.v).filter((v) => !used.includes(v));
      out = shuffle(used).slice(0, nOut);
      if (out.length < nOut) out.push(...shuffle(others).slice(0, nOut - out.length));
      best = minCoins(change, COINS.map((c) => c.v).filter((v) => !out.includes(v)));
      if (best && best.count <= 8) break;
    }
    const note = pick([5, 10, 20].filter((n) => n * 100 > change + 10));
    cur = { change, out, best, note };
    priceEl.textContent = euro(note * 100 - change);
    noteEl.className = 'cc2-note n' + note;
    noteEl.innerHTML = '';
    noteEl.append(h('small', 'Paid'), h('b', '€' + note));
    till.innerHTML = '';
    COINS.forEach((c, i) => {
      const isOut = out.includes(c.v);
      const el = coinEl(c, {
        'aria-label': c.label + (isOut ? ' (out of stock)' : ''),
        'aria-disabled': isOut ? 'true' : null,
        onclick: () => add(i),
      });
      if (isOut) el.classList.add('out');
      till.append(h('div.cc2-slot', el, isOut ? h('small', 'sold out') : h('kbd', String(i + 1))));
    });
    tray = [];
    trayEl.classList.remove('ok', 'no');
    answerEl.innerHTML = '';
    renderTray();
    locked = false;
    api.setInfo(`Round ${rounds}`);
  }

  function add(i) {
    if (locked) return;
    const c = COINS[i];
    if (cur.out.includes(c.v)) { api.sfx.bad(); return; }
    if (tray.length >= 20) return;
    tray.push(c.v);
    api.sfx.tick();
    renderTray();
  }

  function renderTray() {
    trayCoins.innerHTML = '';
    const sorted = tray.map((v, idx) => ({ v, idx })).sort((a, b) => b.v - a.v);
    if (!sorted.length) trayCoins.append(h('span.cc2-empty', 'Tap coins below to build the change'));
    for (const { v, idx } of sorted) {
      const c = COINS.find((x) => x.v === v);
      trayCoins.append(coinEl(c, { 'aria-label': 'remove ' + c.label, onclick: () => { if (locked) return; tray.splice(idx, 1); renderTray(); } }));
    }
    sumEl.textContent = euro(tray.reduce((a, b) => a + b, 0));
  }

  function give() {
    if (locked || !tray.length) return;
    locked = true;
    const total = tray.reduce((a, b) => a + b, 0);
    const r = trayEl.getBoundingClientRect();
    if (total === cur.change) {
      exact++;
      const min = tray.length === cur.best.count;
      if (min) fewest++;
      const pts = 10 + (min ? 5 : 0);
      score += pts;
      trayEl.classList.add('ok');
      api.good(r.left + r.width / 2, r.top + r.height / 2);
      api.banner(min ? `+${pts} · fewest coins!` : `+${pts} · ${cur.best.count} coins possible`, 1000);
      if (!min) showAnswer('Fewest:');
      api.after(min ? 900 : 1600, newRound);
    } else {
      trayEl.classList.add('no');
      api.bad(r.left + r.width / 2, r.top + r.height / 2);
      showAnswer(`Change was ${euro(cur.change)}:`);
      api.after(2000, newRound);
    }
    api.setScore(score);
  }

  function showAnswer(label) {
    answerEl.innerHTML = '';
    answerEl.append(h('span', label));
    for (const v of cur.best.coins) answerEl.append(coinEl(COINS.find((c) => c.v === v), { tabindex: -1, disabled: true }));
  }

  api.keys({
    Enter: give,
    Backspace: () => { if (!locked && tray.length) { tray.pop(); renderTray(); } },
    Escape: () => { if (!locked) { tray = []; renderTray(); } },
    ...Object.fromEntries(COINS.map((_, i) => [String(i + 1), () => add(i)])),
  });

  api.setScore(0);
  api.timer(75, () => api.end({ score, stats: { Rounds: String(rounds - (locked ? 0 : 1)), Exact: String(exact), 'Fewest coins': String(fewest) } }));
  newRound();
}
