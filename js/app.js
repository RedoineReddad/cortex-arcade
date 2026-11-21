// Cortex Arcade: app shell (router, contents page, worksheets, game runner, daily drill, progress).
import { h, todayKey, seeded, clamp } from './core/util.js';
import { createApi } from './core/api.js';
import { sfx, isMuted, setMuted } from './core/audio.js';
import * as store from './core/storage.js';
import { GAMES, CATEGORIES, byId } from './games/catalog.js';

const app = document.getElementById('app');
let current = null; // running game api

// ─── Helpers ────────────────────────────────────────────────────────────────
const ratingOf = (g, score) => clamp(Math.round((100 * score) / g.par), 0, 120);
const brainAge = (avg) => clamp(Math.round(80 - avg * 0.6), 20, 80);
const catVars = (c) => ({ '--c-l': CATEGORIES[c].color, '--c-d': CATEGORIES[c].dark });
const subj = (g) => catVars(g.cat);
// Move focus to the main action only for mouse/trackpad users; on touch it would pop the keyboard or scroll.
const focusMain = (el) => { if (el && matchMedia('(pointer: fine)').matches) el.focus(); };

function verdict(r) {
  if (r >= 100) return 'Excellent!';
  if (r >= 75) return 'Very good';
  if (r >= 50) return 'Good work';
  if (r >= 25) return 'Keep practising';
  return 'Try again tomorrow';
}

const svgIcon = (d, label) => h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  d.map((p) => h('path', { d: p })));
const ICON = {
  back: ['M15 18l-6-6 6-6'],
  soundOn: ['M4 9v6h4l5 4V5L8 9H4z', 'M16.5 8.5a5 5 0 010 7', 'M19 6a8.5 8.5 0 010 12'],
  soundOff: ['M4 9v6h4l5 4V5L8 9H4z', 'M17 9l5 6', 'M22 9l-5 6'],
};

/** A score marked by the teacher: red pen numerals with a hand-drawn loop around them. */
function graded(text, { animate = true, size } = {}) {
  return h('span.graded' + (animate ? '.animate' : ''), size ? { style: { fontSize: size } } : null,
    h('span.mark', String(text)),
    h('svg', { viewBox: '0 0 200 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      h('path', { pathLength: '1', d: 'M112 9C48 3 6 26 9 55c3 30 62 41 114 37 52-4 75-28 68-55C184 11 134 2 78 12' })));
}

function abortCurrent() {
  if (current) { current._abort(); current = null; }
}

function backLink(href = '#/', label = 'Contents') {
  return h('a.back', { href }, svgIcon(ICON.back), label);
}

function topbar(title, back = '#/', backLabel) {
  return h('header.topbar', backLink(back, backLabel), h('p.tb-title', title || ''), muteBtn());
}

function muteBtn() {
  const b = h('button.icon-btn', { type: 'button' });
  const paint = () => {
    b.replaceChildren(svgIcon(isMuted() ? ICON.soundOff : ICON.soundOn));
    b.setAttribute('aria-label', isMuted() ? 'Turn sound on' : 'Turn sound off');
    b.title = b.getAttribute('aria-label');
  };
  b.onclick = () => { setMuted(!isMuted()); paint(); if (!isMuted()) sfx.good(); };
  paint();
  return b;
}

const longDate = (d = new Date()) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

// ─── Daily drill ───────────────────────────────────────────────────────────
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

  const masthead = h('header.masthead',
    h('div',
      h('h1.title', { translate: 'no' }, h('span', 'Cortex'), h('span', 'Arcade')),
      h('p.tagline', 'A daily drill book for your brain. 25 exercises, a few minutes a day.')),
    h('div.mast-side',
      st > 0 ? h('div.streak', st === 1 ? 'Day 1 of your streak' : `${st}-day streak`) : null,
      h('div.mast-links', h('a.text-btn', { href: '#/stats' }, 'Progress'), muteBtn())));

  const drill = h('section.drill.graph', { 'aria-labelledby': 'drill-h' },
    h('div.drill-head', h('h2#drill-h', "Today's drill"), h('span.drill-date', longDate())),
    daily
      ? h('div.drill-done',
          h('div', graded(daily.age, { animate: false, size: '3.4rem' }), h('div.graded-cap', 'brain age')),
          h('p', 'Done for today. Come back tomorrow and see whether your number drops.'))
      : h('p.drill-intro', 'Three short exercises, about five minutes in all. Your results give a brain age: lower is better.'),
    h('ol.drill-list', ids.map((id) => {
      const g = byId[id];
      return h('li', { style: subj(g) }, h('span', h('b', g.title), ' ', h('span.subj', CATEGORIES[g.cat].name)));
    })),
    h('div.drill-actions',
      h('a.btn.primary', { href: '#/daily' }, daily ? 'Take it again' : "Start today's drill")));

  const subjects = h('div.subjects', Object.entries(CATEGORIES).map(([k, c]) => {
    const games = GAMES.filter((g) => g.cat === k);
    return h('section.subject', { style: catVars(k) },
      h('h3', c.name, h('small', `${games.length} exercises`)),
      h('ul.toc', games.map((g) => {
        const b = store.best(g.id);
        return h('li', h('a', { href: '#/play/' + g.id, style: subj(g) },
          h('span.toc-title', g.title, g.three ? h('span.tag3d', '3D') : null, h('span.lead-dots')),
          b != null ? h('span.toc-best', { title: 'Your best' }, b) : h('span.toc-best.none', 'Not tried'),
          h('span.toc-blurb', g.blurb)));
      })));
  }));

  app.replaceChildren(
    masthead,
    h('main#main', drill, h('section.contents.graph', { 'aria-labelledby': 'contents-h' }, h('h2#contents-h', 'Contents'), subjects)),
    h('footer.foot', 'Inspired by daily brain-training drills. Your scores stay on this device. Brain age is a game score, not a medical assessment.'));
}

function viewIntro(g, { onStart, back = '#/', step } = {}) {
  const b = store.best(g.id);
  const lvl = store.levelFor(g.id);
  app.replaceChildren(
    topbar(step || '', back),
    h('main#main.sheet.graph', { style: subj(g) },
      h('p.sheet-subject', CATEGORIES[g.cat].name + (g.three ? ', in 3D' : '')),
      h('h2', g.title),
      h('p.lead', g.blurb),
      h('ol.howto', g.howto.map((x) => h('li', x))),
      h('p.margin-note', h('b', 'The twist:'), ' ', g.twist),
      h('div.meta',
        h('span', 'Level ', h('b', lvl), ' of 5'),
        h('span', b != null ? ['Your best ', h('b', b)] : 'First attempt')),
      h('button.btn.primary.big', { type: 'button', onclick: onStart }, 'Start')));
  focusMain(app.querySelector('.btn.big'));
}

async function runGame(g, { back = '#/', step, onDone } = {}) {
  abortCurrent();
  const hud = {
    timeWrap: h('div.hud-time', { hidden: true, 'aria-label': 'Time' }),
    time: h('span'),
    scoreWrap: h('div.hud-score', { hidden: true, 'aria-label': 'Score' }),
    score: h('span', '0'),
    info: h('div.hud-info', { hidden: true }),
    progress: h('div.hud-progress-bar'),
  };
  hud.timeWrap.append(hud.time);
  hud.scoreWrap.append(hud.score);
  const stage = h('main#main.stage', { style: subj(g) });
  app.replaceChildren(
    h('header.hud', { style: subj(g) }, backLink(back, 'Quit'), h('div.hud-title', g.title, h('small', CATEGORIES[g.cat].name)), hud.info, hud.timeWrap, hud.scoreWrap),
    h('div.hud-progress', { style: subj(g) }, hud.progress),
    stage);

  // Load code while the countdown runs.
  const modP = import(`./games/${g.id}.js`);
  const cd = h('div.countdown', { 'aria-live': 'polite' });
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
    stage.append(h('div.error', "This exercise didn't load. Check your connection and go back to try again. ", h('a', { href: back }, 'Back to contents')));
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
    stage.append(h('div.error', 'This exercise stopped with an error: ' + e.message));
  }
}

function scoreBlock(res) {
  return h('div',
    h('div.result-score', graded(res.score), h('p.verdict', verdict(res.rating))),
    h('div.rating-line', h('span', 'Rating ' + res.rating), h('div.rating-bar', h('div', { style: { width: Math.min(100, res.rating) + '%' } }))));
}

function viewResult(g, res, back = '#/') {
  const idx = GAMES.indexOf(g);
  const next = GAMES[(idx + 1) % GAMES.length];
  const bestLine = res.record
    ? (res.prevBest == null ? 'First score recorded.' : `New personal best. Previous best was ${res.prevBest}.`)
    : `Your best is ${Math.max(res.prevBest, res.score)}.`;
  app.replaceChildren(
    topbar('', back),
    h('main#main.sheet.graph', { style: subj(g) },
      h('p.sheet-subject', CATEGORIES[g.cat].name),
      h('h2', g.title),
      scoreBlock(res),
      h('p' + (res.record ? '.record' : '.muted'), bestLine),
      Object.keys(res.stats).length ? h('dl.stats', Object.entries(res.stats).flatMap(([k, v]) => [h('dt', k), h('dd', v)])) : null,
      h('div.actions',
        h('button.btn.primary', { type: 'button', onclick: () => runGame(g, { back }) }, 'Play again'),
        h('a.btn.ghost', { href: '#/play/' + next.id }, 'Next: ' + next.title))));
  focusMain(app.querySelector('.btn.primary'));
}

function viewDaily() {
  const ids = dailyGames();
  const results = [];
  const label = (i) => `Today's drill, exercise ${i + 1} of ${ids.length}`;
  const step = (i) => {
    if (i >= ids.length) return finish();
    const g = byId[ids[i]];
    viewIntro(g, {
      step: label(i),
      onStart: () => runGame(g, { onDone: (r) => { results.push({ g, ...r }); between(i); } }),
    });
  };
  const between = (i) => {
    const r = results[i];
    const last = i + 1 >= ids.length;
    app.replaceChildren(
      topbar(label(i)),
      h('main#main.sheet.graph', { style: subj(r.g) },
        h('p.sheet-subject', CATEGORIES[r.g.cat].name),
        h('h2', r.g.title),
        scoreBlock(r),
        h('div.actions', h('button.btn.primary.big', { type: 'button', onclick: () => step(i + 1) }, last ? 'See my brain age' : 'Next exercise'))));
    focusMain(app.querySelector('.btn.primary'));
  };
  const finish = () => {
    const avg = results.reduce((a, r) => a + r.rating, 0) / results.length;
    const age = brainAge(avg);
    store.setDaily(todayKey(), { age, games: results.map((r) => ({ g: r.g.id, s: r.score, r: r.rating })) });
    sfx.end();
    const note = age <= 25 ? 'Outstanding. Hard to beat.' : age <= 35 ? 'Excellent. Your brain is in great shape.' : age <= 50 ? 'Solid. Keep the daily habit.' : 'A gentle start. Daily practice brings this down fast.';
    app.replaceChildren(
      topbar("Today's drill"),
      h('main#main.sheet.graph',
        h('h2', 'Your brain age today'),
        h('div.brain-age', graded(age), h('p.verdict', note)),
        h('ol.breakdown', results.map((r) => h('li', { style: subj(r.g) },
          h('span', h('b', r.g.title), ' ', h('span.muted.small', CATEGORIES[r.g.cat].name)),
          h('span.pen', r.score)))),
        h('div.actions', h('a.btn.primary', { href: '#/stats' }, 'See my progress'), h('a.btn.ghost', { href: '#/' }, 'Back to contents'))));
  };
  step(0);
}

function radar(values) {
  // values: [{label, color, v(0-100)}]
  const n = values.length, R = 105, cx = 160, cy = 140;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    h('polygon.ring', { points: values.map((_, i) => pt(i, R * f).join(',')).join(' ') }));
  const axes = values.map((_, i) => { const [x, y] = pt(i, R); return h('line.axis', { x1: cx, y1: cy, x2: x, y2: y }); });
  const shape = h('polygon.shape', { points: values.map((d, i) => pt(i, (R * Math.max(4, d.v)) / 100).join(',')).join(' ') });
  const labels = values.map((d, i) => {
    const [x, y] = pt(i, R + 24);
    return h('text.lbl', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', style: d.vars }, `${d.label} ${d.n ? d.v : '–'}`);
  });
  return h('svg.radar', { viewBox: '0 0 320 285', role: 'img', 'aria-label': 'Skill profile: ' + values.map((d) => `${d.label} ${d.v}`).join(', ') }, rings, axes, shape, labels);
}

function viewStats() {
  const plays = store.allPlays();
  const catVals = Object.entries(CATEGORIES).map(([k, c]) => {
    const ps = plays.filter((p) => byId[p.g] && byId[p.g].cat === k).slice(-10);
    const v = ps.length ? ps.reduce((a, p) => a + Math.min(100, p.r), 0) / ps.length : 0;
    return { label: c.name.split(' ')[0], vars: catVars(k), v: Math.round(v), n: ps.length };
  });
  const daily = Object.entries(store.allDaily()).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  let spark = null;
  if (daily.length) {
    const W = 320, H = 110, P = 16;
    const xs = (i) => P + (daily.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (daily.length - 1));
    const ys = (a) => P + ((a - 20) / 60) * (H - 2 * P);
    spark = h('svg.spark', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Brain age by day: ' + daily.map(([d, x]) => `${d} ${x.age}`).join(', ') },
      h('line.axis', { x1: P, x2: W - P, y1: H - 2, y2: H - 2 }),
      h('polyline', { points: daily.map(([, d], i) => xs(i) + ',' + ys(d.age)).join(' ') }),
      daily.map(([, d], i) => h('g', h('circle', { cx: xs(i), cy: ys(d.age), r: 4 }),
        h('text', { x: xs(i), y: ys(d.age) - 10, 'text-anchor': 'middle' }, d.age))));
  }
  const st = store.streak();
  app.replaceChildren(
    topbar('Progress'),
    h('main#main.stats-page',
      h('div.sheet.graph', h('h3', 'Skill profile'), h('p.muted.small', 'Average rating over your last 10 games in each subject.'), radar(catVals)),
      h('div.sheet.graph',
        h('h3', 'Brain age'),
        h('p.muted.small', 'From your daily drills. Lower sits higher on the chart.'),
        spark || h('p', "No drills yet. Take today's drill to start your chart.", h('br'), h('a.text-btn', { href: '#/daily' }, "Start today's drill")),
        h('p.small', `${st}-day streak, ${plays.length} exercises played`)),
      h('div.sheet.wide', h('h3', 'Personal bests'),
        h('table.best-table',
          h('thead', h('tr', h('th', { 'aria-hidden': 'true' }), h('th', 'Exercise'), h('th.num', 'Best'), h('th.num', 'Played'))),
          h('tbody', GAMES.map((g) => {
            const ps = store.playsOf(g.id);
            return h('tr', { style: subj(g) },
              h('td.subjcell', { title: CATEGORIES[g.cat].name }),
              h('td', h('a', { href: '#/play/' + g.id }, g.title)),
              h('td.num', ps.length ? h('span.pen', Math.max(...ps.map((p) => p.s))) : h('span.muted', '–')),
              h('td.num.muted', ps.length ? ps.length + '×' : '–'));
          })))),
      h('div.danger-zone',
        h('button.text-btn', { type: 'button', onclick: () => { if (confirm('Erase all scores and history? This cannot be undone.')) { store.resetAll(); render(); } } }, 'Erase all scores'))));
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
// The skip link jumps to <main> without touching the hash router.
document.getElementById('skip').addEventListener('click', (e) => {
  const main = document.getElementById('main');
  if (!main) return;
  e.preventDefault();
  main.setAttribute('tabindex', '-1');
  main.focus();
});
render();

// Offline support (skipped on localhost so development always sees fresh files).
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
