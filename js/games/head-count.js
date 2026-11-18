// Full House: people and cats come and go. At the end you're asked about ONE of them.
import { rand, pick, randf } from '../core/util.js';

const PEOPLE = ['🚶', '🚶‍♀️', '🚶‍♂️'];
const CAT = '🐈';
const CAP = { p: 9, c: 6 };

export default function start(api) {
  const { h, level } = api;
  const ROUNDS = 5;
  let round = 0, score = 0, correct = 0;

  api.css(`
    .hc-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; }
    .hc-scene {
      position:relative; width:min(100%, 680px); height:clamp(220px, 36dvh, 330px); border-radius:20px; overflow:hidden;
      background:linear-gradient(180deg, color-mix(in srgb,#38bdf8 22%,var(--bg2)), var(--bg2) 75%);
      border:1px solid var(--line);
    }
    .hc-ground { position:absolute; left:0; right:0; bottom:0; height:16%; background:color-mix(in srgb,#22c55e 35%,var(--bg2)); border-top:3px solid color-mix(in srgb,#16a34a 60%,var(--bg2)); }
    .hc-path { position:absolute; left:0; right:0; bottom:5%; height:5%; background:color-mix(in srgb,#a16207 30%,var(--bg2)); border-radius:4px; }
    .hc-house { position:absolute; left:50%; bottom:15%; width:min(42%, 220px); aspect-ratio:1/1.05; transform:translateX(-50%); }
    .hc-roof { position:absolute; left:-10%; right:-10%; top:0; height:42%; background:#dc5a3c; clip-path:polygon(50% 0, 100% 100%, 0 100%); }
    .hc-chimney { position:absolute; right:14%; top:8%; width:11%; height:22%; background:#9a3412; }
    .hc-body { position:absolute; left:0; right:0; bottom:0; height:60%; overflow:hidden; border-radius:0 0 4px 4px; background:#3b2a20; }
    .hc-inside {
      position:absolute; inset:6% 6% 0; display:flex; flex-wrap:wrap; align-content:flex-end; justify-content:center;
      gap:0 2px; font-size:clamp(1rem, 4.2vw, 1.5rem); line-height:1.2; padding-bottom:4%;
    }
    .hc-wall {
      position:absolute; inset:0; background:#f6d9a8; transition:transform .55s cubic-bezier(.5,0,.3,1);
      background-image:repeating-linear-gradient(0deg, transparent 0 14px, rgba(120,80,40,.12) 14px 16px);
    }
    .hc-house.open .hc-wall { transform:translateY(102%); }
    .hc-win { position:absolute; top:16%; width:24%; height:30%; background:#93c5fd; border:4px solid #fff7ed; border-radius:4px; }
    .hc-win.l { left:9%; } .hc-win.r { right:9%; }
    .hc-door {
      position:absolute; left:50%; bottom:0; width:26%; height:62%; transform:translateX(-50%); transform-origin:left center;
      background:#8b4513; border-radius:40% 40% 0 0 / 22% 22% 0 0; border:3px solid #5b2d0c; border-bottom:0;
      transition:filter .15s;
    }
    .hc-door::after { content:''; position:absolute; right:16%; top:52%; width:12%; aspect-ratio:1; border-radius:50%; background:#fbbf24; }
    .hc-door.open { filter:brightness(.35); }
    .hc-walker {
      position:absolute; bottom:12%; font-size:clamp(1.7rem, 6vw, 2.4rem); line-height:1; z-index:5;
      transform:translateX(-50%); pointer-events:none; will-change:left;
    }
    .hc-walker span { display:inline-block; animation:hcBob .32s ease-in-out infinite alternate; }
    .hc-walker.r span { transform:scaleX(-1); animation-name:hcBobR; }
    .hc-walker.cat { font-size:clamp(1.3rem, 4.6vw, 1.9rem); }
    @keyframes hcBob { to { transform:translateY(-4px); } }
    @keyframes hcBobR { from { transform:scaleX(-1); } to { transform:scaleX(-1) translateY(-4px); } }
    .hc-cap { min-height:1.6em; font-size:1.2rem; font-weight:800; text-align:center; }
    .hc-cap b { color:var(--c); }
    .hc-q { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; min-height:150px; }
    .hc-qtext { font-size:1.35rem; font-weight:800; text-align:center; }
    .hc-qtext b { color:var(--c); font-size:1.5rem; }
    .choices.hc-choices { grid-template-columns:repeat(5, 1fr); width:min(420px,100%); gap:8px; }
    .hc-choices .choice { padding:12px 0; font-size:1.4rem; }
  `);

  const inside = h('div.hc-inside');
  const door = h('div.hc-door');
  const house = h('div.hc-house',
    h('div.hc-chimney'), h('div.hc-roof'),
    h('div.hc-body', inside, h('div.hc-wall', h('div.hc-win.l'), h('div.hc-win.r'), door)));
  const scene = h('div.hc-scene', h('div.hc-ground'), h('div.hc-path'), house);
  const cap = h('div.hc-cap');
  const q = h('div.hc-q');
  api.stage.append(h('div.hc-wrap', scene, cap, q));
  api.setScore(0);

  let count = { p: 0, c: 0 }, pending = { p: 0, c: 0 };
  let walkers = [], schedule = [], phase = 'idle', phaseT = 0, onKey = null, doorTimer = 0;

  const km = {};
  for (let d = 0; d <= 9; d++) km[String(d)] = () => onKey && onKey(d);
  api.keys(km);

  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const describe = () => `${count.p === 1 ? '1 person' : count.p + ' people'} · ${plural(count.c, 'cat')}`;
  function fillInside() {
    inside.innerHTML = '';
    for (let i = 0; i < count.p; i++) inside.append(h('span', '🧍'));
    for (let i = 0; i < count.c; i++) inside.append(h('span', CAT));
  }

  function newRound() {
    if (api.ended) return;
    if (round >= ROUNDS) return finish();
    round++;
    api.setInfo(`Round ${round}/${ROUNDS}`);
    api.setProgress((round - 1) / ROUNDS);
    q.innerHTML = '';
    count = { p: rand(1, 3 + Math.min(level, 3)), c: rand(level >= 2 ? 1 : 0, 2) };
    pending = { p: 0, c: 0 };
    fillInside();
    house.classList.add('open');
    cap.innerHTML = '';
    cap.append('Inside: ', h('b', describe()));
    // build the event schedule
    const events = 5 + level + round;
    const gap = Math.max(480, 1450 - level * 140 - round * 70);
    const simul = level >= 2 ? 0.08 * level + 0.03 * round : 0;
    let t = 0;
    schedule = [];
    for (let i = 0; i < events; i++) {
      schedule.push({ t, type: Math.random() < 0.35 ? 'c' : 'p', dir: Math.random() < 0.5 ? 'in' : 'out', side: pick(['l', 'r']) });
      if (Math.random() < simul) {
        schedule.push({ t: t + randf(0, 0.15), type: Math.random() < 0.4 ? 'c' : 'p', dir: Math.random() < 0.5 ? 'in' : 'out', side: pick(['l', 'r']) });
      }
      t += (gap * randf(0.75, 1.3)) / 1000;
    }
    schedule.sort((a, b) => a.t - b.t);
    api.after(2600, () => {
      house.classList.remove('open');
      cap.textContent = 'Keep count…';
      api.after(700, () => { phase = 'events'; phaseT = 0; });
    });
  }

  function spawn(ev) {
    const W = scene.clientWidth;
    let { type, dir } = ev;
    // never go negative, never overflow
    if (dir === 'out' && count[type] === 0) dir = 'in';
    if (dir === 'in' && count[type] + pending[type] >= CAP[type]) dir = 'out';
    if (dir === 'out' && count[type] === 0) return;
    const speed = W * (0.3 + 0.05 * level + 0.03 * round) * randf(0.9, 1.15);
    const doorX = W / 2;
    const edgeX = ev.side === 'l' ? -30 : W + 30;
    const glyph = type === 'p' ? pick(PEOPLE) : CAT;
    let x, target;
    if (dir === 'in') { pending[type]++; x = edgeX; target = doorX; }
    else { count[type]--; x = doorX; target = edgeX; openDoor(); }
    const facingRight = target > x;
    const el = h('div.hc-walker' + (facingRight ? '.r' : '') + (type === 'c' ? '.cat' : ''), h('span', glyph));
    el.style.left = x + 'px';
    scene.append(el);
    walkers.push({ el, x, target, speed, type, dir });
  }

  function openDoor() { door.classList.add('open'); doorTimer = 0.35; }

  api.loop((dt) => {
    if (doorTimer > 0) { doorTimer -= dt; if (doorTimer <= 0) door.classList.remove('open'); }
    if (phase !== 'events') return;
    phaseT += dt;
    while (schedule.length && schedule[0].t <= phaseT) spawn(schedule.shift());
    walkers = walkers.filter((w) => {
      const step = w.speed * dt;
      const d = w.target - w.x;
      if (Math.abs(d) <= step) {
        w.el.remove();
        if (w.dir === 'in') { pending[w.type]--; count[w.type]++; openDoor(); api.sfx.tick(); }
        return false;
      }
      w.x += Math.sign(d) * step;
      w.el.style.left = w.x + 'px';
      return true;
    });
    if (!schedule.length && !walkers.length) {
      phase = 'idle';
      api.after(500, ask);
    }
  });

  function ask() {
    if (api.ended) return;
    const type = Math.random() < 0.5 ? 'p' : 'c';
    const answer = count[type];
    cap.textContent = '';
    const btns = [];
    const grid = h('div.choices.hc-choices');
    for (let d = 0; d <= 9; d++) {
      const b = h('button.choice', { type: 'button', onclick: () => onKey && onKey(d) }, String(d));
      btns.push(b);
      grid.append(b);
    }
    q.innerHTML = '';
    q.append(h('div.hc-qtext', 'How many ', h('b', type === 'p' ? 'PEOPLE' : 'CATS'), ' are inside?'), grid);
    onKey = (d) => {
      onKey = null;
      const ok = d === answer;
      const r = btns[d].getBoundingClientRect();
      btns[d].classList.add(ok ? 'right' : 'wrong');
      btns[answer].classList.add('right');
      if (ok) { score += 20; correct++; api.setScore(score); api.good(r.left + r.width / 2, r.top + r.height / 2); }
      else api.bad(r.left + r.width / 2, r.top + r.height / 2);
      fillInside();
      house.classList.add('open');
      cap.innerHTML = '';
      cap.append(ok ? 'Correct! ' : `It was ${answer}. `, 'Inside: ', h('b', describe()));
      api.after(2300, newRound);
    };
  }

  function finish() {
    api.setProgress(1);
    api.end({ score, stats: { Correct: `${correct} / ${ROUNDS}` } });
  }

  window.__cortexDebug = { get count() { return count; }, get phase() { return phase; }, get asking() { return !!onKey; } };
  api.onCleanup(() => { delete window.__cortexDebug; });
  newRound();
}
