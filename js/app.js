// Cortex Arcade: app shell (router, library, game runner, daily check, stats).
import { h, todayKey, seeded, clamp } from './core/util.js';
import { createApi } from './core/api.js';
import { sfx, isMuted, setMuted } from './core/audio.js';
import * as store from './core/storage.js';
import { GAMES, CATEGORIES, byId } from './games/catalog.js';

const app = document.getElementById('app');
let current = null; // running game api
let filter = 'all';

// ─── Helpers ────────────────────────────────────────────────────────────────
const ratingOf = (g, score) => clamp(Math.round((100 * score) / g.par), 0, 120);
const brainAge = (avg) => clamp(Math.round(80 - avg * 0.6), 20, 80);
const catColor = (c) => CATEGORIES[c].color;

function stars(r) {
  const n = r >= 100 ? 3 : r >= 65 ? 2 : r >= 30 ? 1 : 0;
  return h('div.stars', [0, 1, 2].map((i) => h('span' + (i < n ? '.on' : ''), '★')));
}

function abortCurrent() {
  if (current) { current._abort(); current = null; }
}

function topbar(title, back = '#/') {
  return h('header.topbar',
    h('a.back', { href: back, 'aria-label': 'Back' }, '‹'),
    h('h1.tb-title', title),
    muteBtn());
}

function muteBtn() {
  const b = h('button.icon-btn', { type: 'button', title: 'Sound', 'aria-label': 'Toggle sound' }, isMuted() ? '🔇' : '🔊');
  b.onclick = () => { setMuted(!isMuted()); b.textContent = isMuted() ? '🔇' : '🔊'; if (!isMuted()) sfx.good(); };
  return b;
}

// ─── Daily check ───────────────────────────────────────────────────────────
function dailyGames(day = todayKey()) {
  const rnd = seeded(day.split('-').join('') * 7);
  const pickFrom = (cats) => {
    const pool = GAMES.filter((g) => cats.includes(g.cat));
    return pool[Math.floor(rnd() * pool.length)].id;
  };
  return [pickFrom(['math', 'speed']), pickFrom(['memory']), pickFrom(['attention', 'spatial', 'logic'])];
}

// ─── Views ──────────────────────────────────────────────────────────────────
function viewHome() {
  const daily = store.getDaily();
  const ids = dailyGames();
  const st = store.streak();
  const plays = store.allPlays().length;

  const dailyCard = h('section.daily-card',
    h('div.daily-left',
      h('div.eyebrow', 'Daily Brain Check · ' + new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })),
      daily
        ? h('div', h('div.daily-age', h('span', daily.age), h('small', 'brain age')), h('p.muted', 'Done for today. Come back tomorrow to see your trend.'))
        : h('div', h('h2', 'Three games, about five minutes.'), h('p.muted', 'Your results give an estimated "brain age". Lower is better.')),
      h('div.daily-games', ids.map((id) => h('span.chip', { style: { '--c': catColor(byId[id].cat) } }, byId[id].icon + ' ' + byId[id].title))),
      h('a.btn.primary', { href: '#/daily' }, daily ? 'Retake' : 'Start daily check')),
    h('div.daily-right',
      h('div.stat', h('b', st), h('span', 'day streak')),
      h('div.stat', h('b', plays), h('span', 'games played')),
      h('a.btn.ghost', { href: '#/stats' }, 'Your stats →')));

  const chips = h('nav.filters',
    [['all', { name: 'All 25', color: '#94a3b8', icon: '✨' }], ...Object.entries(CATEGORIES)].map(([k, c]) =>
      h('button.chip' + (filter === k ? '.active' : ''), {
        type: 'button', style: { '--c': c.color },
        onclick: () => { filter = k; render(); },
      }, c.icon + ' ' + c.name)));

  const grid = h('section.grid',
    GAMES.filter((g) => filter === 'all' || g.cat === filter).map((g) => {
      const b = store.best(g.id);
      const r = store.lastRating(g.id);
      return h('a.card', { href: '#/play/' + g.id, style: { '--c': catColor(g.cat) } },
        h('div.card-icon', g.icon),
        h('div.card-body',
          h('div.card-cat', CATEGORIES[g.cat].name + (g.three ? ' · 3D' : '')),
          h('h3', g.title),
          h('p', g.blurb)),
        h('div.card-foot', b != null ? h('span', 'Best ' + b) : h('span.new', 'New'), r != null ? stars(r) : null));
    }));

  app.replaceChildren(
    h('header.hero',
      h('div.logo', h('span.logo-mark', '🧠'), h('span', 'Cortex', h('em', 'Arcade'))),
      h('div.hero-actions', h('a.icon-btn', { href: '#/stats', title: 'Stats' }, '📊'), muteBtn())),
    dailyCard, chips, grid,
    h('footer.foot', 'Inspired by classic daily brain-training games. Results are for fun, not a medical assessment.'));
}

function viewIntro(g, { onStart, back = '#/', step } = {}) {
  const b = store.best(g.id);
  const lvl = store.levelFor(g.id);
  app.replaceChildren(
    topbar(step || CATEGORIES[g.cat].name, back),
    h('section.intro', { style: { '--c': catColor(g.cat) } },
      h('div.intro-icon', g.icon),
      h('h2', g.title),
      h('p.lead', g.blurb),
      h('div.twist', h('b', '🌀 Twist'), h('span', g.twist)),
      h('ol.howto', g.howto.map((x) => h('li', x))),
      h('div.intro-meta',
        h('span', 'Level ' + lvl + '/5'),
        h('span', b != null ? 'Best ' + b : 'First play'),
        g.three ? h('span', '3D') : null),
      h('button.btn.primary.big', { type: 'button', onclick: onStart, autofocus: true }, 'Start')));
  app.querySelector('.btn.big').focus();
}

async function runGame(g, { back = '#/', step, onDone } = {}) {
  abortCurrent();
  const hud = {
    timeWrap: h('div.hud-time', { hidden: true }),
    time: h('span'),
    scoreWrap: h('div.hud-score', { hidden: true }),
    score: h('span', '0'),
    info: h('div.hud-info', { hidden: true }),
    progress: h('div.hud-progress-bar'),
  };
  hud.timeWrap.append('⏱ ', hud.time);
  hud.scoreWrap.append('★ ', hud.score);
  const stage = h('main.stage', { style: { '--c': catColor(g.cat) } });
  const quit = h('a.back', { href: back, 'aria-label': 'Quit' }, '✕');
  app.replaceChildren(
    h('header.hud', quit, h('div.hud-title', g.icon + ' ' + g.title), hud.info, hud.timeWrap, hud.scoreWrap),
    h('div.hud-progress', hud.progress),
    stage);

  // Load code while the countdown runs.
  const modP = import(`./games/${g.id}.js`);
  const cd = h('div.countdown');
  stage.append(cd);
  for (const n of ['3', '2', '1']) {
    cd.textContent = n; sfx.tick();
    cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop');
    await new Promise((r) => setTimeout(r, 600));
    if (!stage.isConnected) return;
  }
  cd.remove();
  let mod;
  try { mod = await modP; } catch (e) {
    console.error(e);
    stage.append(h('div.error', 'Could not load this game. ', h('a', { href: back }, 'Back')));
    return;
  }
  if (!stage.isConnected) return;
  sfx.go();
  const level = store.levelFor(g.id);
  const api = createApi({
    stage, hud, level,
    onEnd: (res) => {
      current = null;
      const score = Math.max(0, Math.round(res.score || 0));
      const rating = res.rating != null ? clamp(Math.round(res.rating), 0, 120) : ratingOf(g, score);
      const prevBest = store.best(g.id);
      store.recordPlay(g.id, score, rating);
      const result = { score, rating, stats: res.stats || {}, record: prevBest == null || score > prevBest, prevBest };
      if (onDone) onDone(result); else viewResult(g, result, back);
    },
  });
  current = api;
  window.__cortex = { api, game: g }; // handy for tests / debugging
  try {
    const cleanup = await mod.default(api);
    if (typeof cleanup === 'function') api.onCleanup(cleanup);
  } catch (e) {
    console.error(e);
    stage.append(h('div.error', 'This game crashed: ' + e.message));
  }
}

function viewResult(g, res, back = '#/') {
  const idx = GAMES.indexOf(g);
  const next = GAMES[(idx + 1) % GAMES.length];
  app.replaceChildren(
    topbar('Results', back),
    h('section.result', { style: { '--c': catColor(g.cat) } },
      h('div.intro-icon', g.icon),
      h('h2', g.title),
      h('div.big-score', res.score),
      stars(res.rating),
      res.record ? h('div.record', res.prevBest == null ? '🎉 First score logged!' : '🏆 New personal best!') : h('div.muted', 'Best: ' + Math.max(res.prevBest, res.score)),
      h('div.rating-bar', h('div', { style: { width: Math.min(100, res.rating) + '%' } })),
      h('div.muted.small', 'Rating ' + res.rating + ' / 100'),
      Object.keys(res.stats).length ? h('dl.stats', Object.entries(res.stats).flatMap(([k, v]) => [h('dt', k), h('dd', v)])) : null,
      h('div.row',
        h('button.btn.primary', { type: 'button', onclick: () => runGame(g, { back }) }, 'Play again'),
        h('a.btn.ghost', { href: '#/play/' + next.id }, 'Next: ' + next.icon + ' ' + next.title),
        h('a.btn.ghost', { href: '#/' }, 'Library'))));
}

function viewDaily() {
  const ids = dailyGames();
  const results = [];
  const step = (i) => {
    if (i >= ids.length) return finish();
    const g = byId[ids[i]];
    viewIntro(g, {
      step: `Daily check · ${i + 1} of ${ids.length}`,
      onStart: () => runGame(g, { step, onDone: (r) => { results.push({ g, ...r }); between(i); } }),
    });
  };
  const between = (i) => {
    const r = results[i];
    app.replaceChildren(
      topbar(`Daily check · ${i + 1} of ${ids.length}`),
      h('section.result', { style: { '--c': catColor(r.g.cat) } },
        h('div.intro-icon', r.g.icon), h('h2', r.g.title), h('div.big-score', r.score), stars(r.rating),
        h('button.btn.primary.big', { type: 'button', onclick: () => step(i + 1) }, i + 1 < ids.length ? 'Next game →' : 'See my brain age')));
  };
  const finish = () => {
    const avg = results.reduce((a, r) => a + r.rating, 0) / results.length;
    const age = brainAge(avg);
    store.setDaily(todayKey(), { age, games: results.map((r) => ({ g: r.g.id, s: r.score, r: r.rating })) });
    sfx.end();
    const verdict = age <= 25 ? 'Razor sharp. Outstanding!' : age <= 35 ? 'Excellent. Your brain is in great shape.' : age <= 50 ? 'Solid work. Keep training daily.' : 'A gentle start. Daily practice brings this down fast.';
    app.replaceChildren(
      topbar('Daily check complete'),
      h('section.result.brain',
        h('div.eyebrow', 'Your brain age today'),
        h('div.age-ring', h('span', age)),
        h('p.lead', verdict),
        h('div.daily-breakdown', results.map((r) => h('div.bd', { style: { '--c': catColor(r.g.cat) } },
          h('span', r.g.icon), h('b', r.g.title), h('span', r.score + ' pts'), stars(r.rating)))),
        h('div.row', h('a.btn.primary', { href: '#/stats' }, 'View progress'), h('a.btn.ghost', { href: '#/' }, 'Free play'))));
  };
  step(0);
}

function radar(values) {
  // values: [{label, color, v(0-100)}]
  const n = values.length, R = 110, cx = 150, cy = 140;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    h('polygon.ring', { points: values.map((_, i) => pt(i, R * f).join(',')).join(' ') }));
  const axes = values.map((_, i) => { const [x, y] = pt(i, R); return h('line.axis', { x1: cx, y1: cy, x2: x, y2: y }); });
  const shape = h('polygon.shape', { points: values.map((d, i) => pt(i, (R * Math.max(4, d.v)) / 100).join(',')).join(' ') });
  const labels = values.map((d, i) => {
    const [x, y] = pt(i, R + 22);
    return h('text.lbl', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: d.color }, d.label);
  });
  const dots = values.map((d, i) => { const [x, y] = pt(i, (R * Math.max(4, d.v)) / 100); return h('circle', { cx: x, cy: y, r: 4, fill: d.color }); });
  return h('svg.radar', { viewBox: '0 0 300 285', role: 'img', 'aria-label': 'Skill profile' }, rings, axes, shape, dots, labels);
}

function viewStats() {
  const plays = store.allPlays();
  const catVals = Object.entries(CATEGORIES).map(([k, c]) => {
    const ps = plays.filter((p) => byId[p.g] && byId[p.g].cat === k).slice(-10);
    const v = ps.length ? ps.reduce((a, p) => a + Math.min(100, p.r), 0) / ps.length : 0;
    return { label: c.name.split(' ')[0], color: c.color, v: Math.round(v), n: ps.length };
  });
  const daily = Object.entries(store.allDaily()).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  let spark = null;
  if (daily.length) {
    const W = 300, H = 90, P = 12;
    const xs = (i) => P + (daily.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (daily.length - 1));
    const ys = (a) => P + ((a - 20) / 60) * (H - 2 * P);
    spark = h('svg.spark', { viewBox: `0 0 ${W} ${H}` },
      h('polyline', { points: daily.map(([, d], i) => xs(i) + ',' + ys(d.age)).join(' ') }),
      daily.map(([day, d], i) => h('g', h('circle', { cx: xs(i), cy: ys(d.age), r: 4 }),
        h('text', { x: xs(i), y: ys(d.age) - 8, 'text-anchor': 'middle' }, d.age))));
  }
  app.replaceChildren(
    topbar('Your progress'),
    h('section.stats-page',
      h('div.panel', h('h3', 'Skill profile'), h('p.muted.small', 'Average rating over your last 10 games in each area.'), radar(catVals),
        h('div.cat-legend', catVals.map((c) => h('span', { style: { '--c': c.color } }, `${c.label} ${c.v}`)))),
      h('div.panel', h('h3', 'Brain age trend'), spark || h('p.muted', 'Complete a daily check to start your trend.'),
        h('div.row.small', h('span', '🔥 ' + store.streak() + '-day streak'), h('span', '🎮 ' + plays.length + ' plays'))),
      h('div.panel.wide', h('h3', 'Personal bests'),
        h('table.best-table', h('tbody', GAMES.map((g) => {
          const ps = store.playsOf(g.id);
          return h('tr', { style: { '--c': catColor(g.cat) } },
            h('td', g.icon), h('td', h('a', { href: '#/play/' + g.id }, g.title)),
            h('td.num', ps.length ? Math.max(...ps.map((p) => p.s)) : '—'),
            h('td.num.muted', ps.length + '×'),
            h('td', ps.length ? stars(Math.max(...ps.map((p) => p.r))) : ''));
        })))),
      h('div.panel.wide.danger',
        h('button.btn.ghost', { type: 'button', onclick: () => { if (confirm('Erase all scores and history?')) { store.resetAll(); render(); } } }, 'Reset all data'))));
}

// ─── Router ────────────────────────────────────────────────────────────────
function render() {
  abortCurrent();
  const hash = location.hash || '#/';
  const [, route, arg] = hash.split('/');
  window.scrollTo(0, 0);
  document.body.dataset.view = route || 'home';
  if (route === 'play' && byId[arg]) {
    const g = byId[arg];
    viewIntro(g, { onStart: () => runGame(g) });
  } else if (route === 'daily') viewDaily();
  else if (route === 'stats') viewStats();
  else viewHome();
}
window.addEventListener('hashchange', render);
render();

// Decorative three.js background, loaded after first paint and only on capable devices.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const start = () => import('./bg.js').then((m) => m.startBackground(document.getElementById('bg'))).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 }); else setTimeout(start, 800);
}
