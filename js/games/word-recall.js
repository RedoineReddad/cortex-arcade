// Word Vault: study a list, then pick it out of a board full of close cousins.
import { shuffle, sample } from '../core/util.js';

// (word, close cousin) — every word appears once in the whole list.
const PAIRS = `apple pear|violin cello|river stream|cat dog|chair stool|cup mug|shoe boot|knife fork|car truck|rose tulip|lion tiger|trumpet trombone|shirt blouse|hammer wrench|lemon lime|crow raven|frog toad|sofa couch|jacket coat|pen pencil
plate bowl|ocean sea|hill mountain|rabbit hare|horse donkey|piano organ|guitar banjo|carrot parsnip|onion garlic|bread toast|cake pie|cookie biscuit|spoon ladle|pan pot|bus tram|train subway|boat ship|plane jet|moon planet|star comet
sun lamp|candle torch|rain snow|cloud fog|lake pond|forest jungle|desert beach|road path|bridge tunnel|door gate|window mirror|wall fence|roof attic|bed cot|pillow cushion|blanket quilt|towel napkin|soap shampoo|brush comb|sock glove
hat cap|ring necklace|watch clock|phone radio|book magazine|letter postcard|map globe|bag basket|box crate|bottle jar|kettle teapot|sheep goat|cow bull|pig boar|duck goose|eagle hawk|owl bat|shark whale|salmon trout|crab lobster
bee wasp|ant beetle|spider scorpion|snake lizard|mouse rat|squirrel chipmunk|wolf fox|bear panda|deer moose|monkey gorilla|grape cherry|peach plum|banana mango|orange tangerine|potato yam|tomato pepper|pea bean|corn wheat|rice pasta|cheese butter
milk cream|tea coffee|juice soda|salt sugar|drum tambourine|flute clarinet|harp lyre|sword dagger|shield helmet|arrow spear|castle palace|church chapel|tent cabin|barn shed|kitchen pantry|garden orchard|tree bush|leaf petal|grass moss|stone pebble`
  .split(/[|\n]/).map((s) => s.trim().split(' '));

export default function start(api) {
  const { h, level } = api;
  const ROUNDS = 2;
  const N = [8, 9, 10, 12, 14][level - 1];
  const STUDY_PER_WORD = 3;
  let round = 0, score = 0, hitsT = 0, faT = 0, missT = 0;
  const used = new Set();

  api.css(`
    .wr-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; max-width:680px; }
    .wr-title { font-size:1.25rem; font-weight:800; text-align:center; }
    .wr-bar { width:min(420px,100%); height:10px; border-radius:99px; background:var(--line); overflow:hidden; }
    .wr-bar div { height:100%; width:100%; background:var(--c); border-radius:99px; }
    .wr-grid { display:grid; gap:8px; width:100%; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); }
    .wr-study { grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px; }
    .wr-word {
      padding:12px 6px; border-radius:14px; text-align:center; font-weight:700; font-size:1.15rem;
      background:var(--panel-solid); border:2px solid var(--line); overflow-wrap:anywhere;
    }
    .wr-study .wr-word { border-color:color-mix(in srgb,var(--c) 45%,var(--line)); animation:wrIn .35s ease-out backwards; }
    @keyframes wrIn { from { opacity:0; transform:translateY(8px) scale(.96); } }
    .wr-pick { cursor:pointer; font-size:1rem; padding:10px 4px; color:var(--text); transition:background .12s, border-color .12s, transform .08s; }
    .wr-pick:hover { border-color:var(--c); }
    .wr-pick:active { transform:scale(.96); }
    .wr-pick.on { background:color-mix(in srgb,var(--c) 28%,var(--panel-solid)); border-color:var(--c); }
    .wr-pick.hit { background:color-mix(in srgb,var(--good) 30%,var(--panel-solid)); border-color:var(--good); }
    .wr-pick.fa { background:color-mix(in srgb,var(--bad) 28%,var(--panel-solid)); border-color:var(--bad); text-decoration:line-through; }
    .wr-pick.miss { border:2px dashed var(--good); color:var(--good); }
    .wr-pick.rej { opacity:.45; }
    .wr-btn {
      padding:12px 34px; border-radius:99px; border:0; background:var(--c); color:#fff; font-size:1.1rem;
      font-weight:800; cursor:pointer; box-shadow:var(--shadow);
    }
    .wr-btn:active { transform:scale(.96); }
    .wr-count { color:var(--muted); font-weight:600; }
    .wr-sum { font-size:1.05rem; font-weight:700; text-align:center; }
    .wr-sum .g { color:var(--good); } .wr-sum .b { color:var(--bad); }
    @media (max-width:520px) {
      .wr-grid { grid-template-columns:repeat(3, 1fr); gap:6px; }
      .wr-study { grid-template-columns:repeat(2, 1fr); gap:8px; }
      .wr-pick { font-size:.92rem; padding:9px 2px; }
      .wr-word { font-size:1.05rem; padding:10px 4px; }
    }
  `);

  const wrap = h('div.wr-wrap');
  api.stage.append(wrap);
  api.setScore(0);
  let onEnter = null;
  api.keys({ Enter: () => onEnter && onEnter() });

  function study() {
    if (api.ended) return;
    round++;
    api.setInfo(`Round ${round}/${ROUNDS} · study`);
    api.setProgress((round - 1) / ROUNDS);
    const pairs = sample(PAIRS.filter((p) => !used.has(p[0])), N);
    pairs.forEach((p) => used.add(p[0]));
    // randomly decide which side of each pair is the studied word
    const items = pairs.map((p) => (Math.random() < 0.5 ? { word: p[0], cousin: p[1] } : { word: p[1], cousin: p[0] }));
    const total = N * STUDY_PER_WORD;
    const bar = h('div');
    const left = h('span.wr-count', `${total}s`);
    wrap.innerHTML = '';
    wrap.append(
      h('div.wr-title', `Memorise these ${N} words`),
      h('div.wr-bar', bar),
      h('div.wr-grid.wr-study', items.map((it, i) => h('div.wr-word', { style: { animationDelay: i * 40 + 'ms' } }, it.word))),
      h('button.wr-btn', { type: 'button', onclick: () => go() }, 'Ready'),
      left,
    );
    let done = false;
    const go = () => { if (done || api.ended) return; done = true; loop.stop(); onEnter = null; recall(items); };
    onEnter = go;
    const loop = api.loop((dt, el) => {
      const f = Math.max(0, 1 - el / total);
      bar.style.width = f * 100 + '%';
      left.textContent = `${Math.ceil(total - el)}s`;
      if (f <= 0) { go(); return false; }
    });
  }

  function recall(items) {
    api.setInfo(`Round ${round}/${ROUNDS} · recall`);
    const studied = new Set(items.map((i) => i.word));
    const words = shuffle(items.flatMap((i) => [i.word, i.cousin]));
    const chosen = new Set();
    const count = h('span.wr-count', `0 selected`);
    const btns = words.map((w) => h('button.wr-word.wr-pick', {
      type: 'button',
      onclick: (e) => {
        if (onEnter !== finish) return;
        chosen.has(w) ? chosen.delete(w) : chosen.add(w);
        e.currentTarget.classList.toggle('on', chosen.has(w));
        api.sfx.tick();
        count.textContent = `${chosen.size} selected`;
      },
    }, w));
    const done = h('button.wr-btn', { type: 'button', onclick: () => finish() }, 'Done');
    wrap.innerHTML = '';
    wrap.append(h('div.wr-title', `Tap the ${N} words you studied`), h('div.wr-grid', btns), done, count);

    function finish() {
      if (onEnter !== finish || api.ended) return;
      onEnter = null;
      let hits = 0, fa = 0, miss = 0;
      btns.forEach((b, i) => {
        const w = words[i], sel = chosen.has(w), real = studied.has(w);
        b.classList.remove('on');
        if (sel && real) { hits++; b.classList.add('hit'); }
        else if (sel && !real) { fa++; b.classList.add('fa'); }
        else if (!sel && real) { miss++; b.classList.add('miss'); }
        else b.classList.add('rej');
      });
      const pts = Math.max(0, hits * 10 - fa * 8);
      score += pts; hitsT += hits; faT += fa; missT += miss;
      api.setScore(score);
      if (hits >= N * 0.75 && fa <= 1) api.good(); else if (pts < N * 4) api.bad(); else api.sfx.tick();
      done.remove();
      count.replaceWith(h('div.wr-sum',
        h('span.g', `${hits} found`), ' · ', `${miss} missed`, ' · ', h('span.b', `${fa} wrong`), ` → +${pts}`));
      api.after(2400, () => {
        if (api.ended) return;
        if (round >= ROUNDS) {
          api.setProgress(1);
          api.end({ score, stats: { Found: `${hitsT} / ${N * ROUNDS}`, 'Wrong picks': String(faT), Missed: String(missT) } });
        } else study();
      });
    }
    onEnter = finish;
  }

  window.__cortexDebug = { pairs: PAIRS };
  api.onCleanup(() => { delete window.__cortexDebug; });
  study();
}
