// Vowel Vanish: rebuild words whose vowels have been removed.
import { pick, shuffle, clamp } from '../core/util.js';

const RAW = {
  animal: 'RABBIT MONKEY TIGER ZEBRA DONKEY BADGER BEAVER CAMEL COYOTE DOLPHIN EAGLE FALCON GIRAFFE GORILLA HAMSTER HORSE JAGUAR KANGAROO KOALA LEOPARD LIZARD LOBSTER OCTOPUS PANDA PARROT PELICAN PENGUIN PIGEON SALMON SPIDER TURTLE WALRUS WEASEL BUFFALO CHEETAH LLAMA MOOSE OTTER SQUIRREL TORTOISE ANTELOPE ELEPHANT BUTTERFLY',
  fruit: 'BANANA APPLE ORANGE LEMON MANGO PAPAYA CHERRY GRAPE MELON PEACH APRICOT COCONUT PINEAPPLE AVOCADO BLUEBERRY KIWI LIME PEAR PLUM OLIVE',
  vegetable: 'CARROT POTATO TOMATO ONION GARLIC CABBAGE CELERY PEPPER PUMPKIN LETTUCE SPINACH RADISH BROCCOLI TURNIP PARSNIP CUCUMBER',
  food: 'BREAD BUTTER CHEESE PASTA PIZZA NOODLE MUFFIN PANCAKE BURGER SANDWICH COOKIE YOGURT OMELETTE SAUSAGE HONEY CEREAL WAFFLE',
  country: 'CANADA MEXICO BRAZIL FRANCE SPAIN ITALY GERMANY JAPAN CHINA INDIA KENYA EGYPT NORWAY SWEDEN POLAND GREECE TURKEY IRELAND PORTUGAL AUSTRIA NIGERIA MOROCCO ICELAND VIETNAM PERU CHILE CUBA',
  job: 'DOCTOR NURSE TEACHER PILOT FARMER BAKER BARBER DENTIST PLUMBER LAWYER SAILOR SOLDIER PAINTER WRITER SINGER DANCER CHEF JUDGE BUTCHER ENGINEER ACTOR AUTHOR TAILOR CASHIER',
  sport: 'TENNIS SOCCER HOCKEY BOXING ROWING RUGBY GOLF CRICKET KARATE SKIING SURFING CYCLING ARCHERY FENCING SAILING JUDO CURLING BASEBALL BOWLING',
  instrument: 'PIANO GUITAR VIOLIN CELLO FLUTE TRUMPET DRUM HARP BANJO TUBA OBOE CLARINET TROMBONE UKULELE ORGAN',
  'household object': 'TABLE CHAIR PILLOW BLANKET LAMP MIRROR CURTAIN KETTLE TOASTER SPOON FORK KNIFE BUCKET LADDER CANDLE CARPET TEAPOT SOFA OVEN FRIDGE BASKET HAMMER TOWEL WINDOW',
  nature: 'RIVER OCEAN FOREST MOUNTAIN VALLEY DESERT ISLAND VOLCANO CANYON MEADOW CLOUD THUNDER RAINBOW GLACIER LAGOON PEBBLE FLOWER SUNSET PLANET TORNADO',
  'body part': 'ELBOW FINGER SHOULDER KNEE ANKLE STOMACH EYEBROW THUMB MUSCLE NOSTRIL',
  colour: 'PURPLE YELLOW SILVER MAROON VIOLET INDIGO CRIMSON TURQUOISE MAGENTA BEIGE',
  clothing: 'JACKET SWEATER TROUSERS SCARF GLOVE SANDAL BLOUSE JEANS COAT BELT HOODIE PAJAMAS APRON KIMONO',
  vehicle: 'BICYCLE TRACTOR SUBMARINE AIRPLANE ROCKET SCOOTER TRUCK CANOE KAYAK FERRY TRAIN TAXI YACHT',
};
const VOWELS = 'AEIOU';
export const skel = (w) => w.replace(/[AEIOU]/g, '');
export const WORDS = [];
for (const [cat, list] of Object.entries(RAW)) {
  for (const w of list.split(/\s+/)) {
    if (w.length < 4 || w.length > 9 || !/[AEIOU]/.test(w)) continue;
    if (WORDS.some((x) => x.w === w)) continue;
    WORDS.push({ w, cat, sk: skel(w), nv: w.replace(/[^AEIOU]/g, '').length });
  }
}

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** 3 near-miss distractors: real words from the list whose skeleton differs from the target's. */
export function distractors(word) {
  const cands = WORDS.filter((x) => x.w !== word.w && x.sk !== word.sk)
    .map((x) => ({ x, d: lev(x.sk, word.sk) + Math.abs(x.w.length - word.w.length) * 0.3 + (x.sk[0] === word.sk[0] ? -0.4 : 0) + Math.random() * 0.8 }))
    .sort((a, b) => a.d - b.d);
  return cands.slice(0, 3).map((c) => c.x);
}

export default function start(api) {
  const { h, level } = api;
  let score = 0, solved = 0, mistakes = 0, word, filled, t0, locked = false, mode = 'blank', announced = false, missesHere = 0;
  const used = new Set();

  api.css(`
    .vv-wrap { display:flex; flex-direction:column; align-items:center; gap:clamp(14px,3vh,26px); width:100%; max-width:720px; }
    .vv-hint { padding:5px 14px; border-radius:99px; background:color-mix(in srgb,var(--c) 16%,transparent); color:var(--c); font-weight:700; letter-spacing:.04em; text-transform:uppercase; font-size:.85rem; }
    .vv-word { display:flex; gap:clamp(3px,1vw,8px); justify-content:center; flex-wrap:nowrap; }
    .vv-tile { width:clamp(30px,9.4vw,58px); height:clamp(42px,12vw,70px); display:grid; place-items:center; border-radius:12px;
      font-size:clamp(1.3rem,6vw,2.3rem); font-weight:800; background:var(--panel-solid); border:2px solid var(--line); }
    .vv-tile.blank { background:var(--bg2); border-style:dashed; color:var(--c); }
    .vv-tile.cur { border-color:var(--c); border-style:solid; box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 30%,transparent); animation:vv-blink 1s infinite alternate; }
    .vv-tile.got { border-style:solid; border-color:color-mix(in srgb,var(--good) 60%,var(--line)); color:var(--text); animation:vv-pop .25s; }
    .vv-tile.err { border-color:var(--bad); background:color-mix(in srgb,var(--bad) 22%,var(--bg2)); animation:none; }
    .vv-skel { font-size:clamp(2.2rem,11vw,3.8rem); font-weight:900; letter-spacing:.18em; padding-left:.18em; text-align:center; }
    .vv-vowels { display:grid; grid-template-columns:repeat(5,1fr); gap:clamp(6px,1.6vw,12px); width:min(520px,100%); }
    .vv-v { height:clamp(58px,9vh,76px); border-radius:16px; border:2px solid var(--line); background:var(--panel-solid); font-size:1.8rem; font-weight:800; cursor:pointer; }
    .vv-v:hover { border-color:var(--c); }
    .vv-v:active { transform:scale(.94); }
    .vv-opts .choice { font-size:clamp(1.05rem,4.4vw,1.35rem); letter-spacing:.06em; }
    .vv-msg { min-height:1.3em; color:var(--muted); font-size:.95rem; }
    @keyframes vv-blink { to { box-shadow:0 0 0 6px color-mix(in srgb,var(--c) 12%,transparent); } }
    @keyframes vv-pop { from { transform:scale(1.25); } }
  `);

  const hint = h('div.vv-hint');
  const board = h('div');
  const msg = h('div.vv-msg');
  const controls = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } });
  api.stage.append(h('div.vv-wrap', hint, board, msg, controls));
  api.setScore(0);
  const timer = api.timer(60, finish);

  const vowelPad = h('div.vv-vowels', [...VOWELS].map((v) => h('button.vv-v', { type: 'button', onpointerdown: (e) => { e.preventDefault(); press(v, e); } }, v)));

  function chooseWord() {
    const maxLen = [6, 7, 8, 9, 9][level - 1], minLen = level >= 4 ? 5 : 4;
    let pool = WORDS.filter((x) => !used.has(x.w) && x.w.length <= maxLen && x.w.length >= minLen);
    if (!pool.length) { used.clear(); pool = WORDS; }
    const w = pick(pool);
    used.add(w.w);
    return w;
  }

  function next() {
    locked = false; missesHere = 0;
    const late = timer.left < 20;
    mode = level >= 3 || late ? 'skel' : 'blank';
    if (mode === 'skel' && !announced && level < 3) { announced = true; api.banner('No more gaps!', 1100); }
    word = chooseWord();
    hint.textContent = word.cat;
    msg.textContent = '';
    t0 = performance.now();
    if (mode === 'blank') {
      filled = 0;
      board.className = 'vv-word';
      board.replaceChildren(...[...word.w].map((c) => VOWELS.includes(c) ? h('div.vv-tile.blank', ' ') : h('div.vv-tile', c)));
      controls.replaceChildren(vowelPad);
      mark();
      api.setInfo('Fill the vowels');
    } else {
      board.className = 'vv-skel';
      board.textContent = word.sk;
      const opts = shuffle([word, ...distractors(word)]);
      word.opts = opts;
      controls.replaceChildren(h('div.choices.vv-opts', opts.map((o, i) => h('button.choice', { type: 'button', onclick: (e) => choose(i, e) }, o.w))));
      api.setInfo('Pick the word');
    }
  }

  const blanks = () => [...board.children].filter((t) => t.classList.contains('blank'));
  function mark() { blanks().forEach((t, i) => t.classList.toggle('cur', i === filled)); }

  function bonus() {
    const dt = (performance.now() - t0) / 1000;
    const allowance = mode === 'blank' ? 1.2 + 0.7 * word.nv : 2.5;
    return Math.round(5 * clamp(1 - (dt - allowance) / 5, 0, 1));
  }

  function press(v, e) {
    if (mode !== 'blank' || locked || api.ended) return;
    const tiles = blanks();
    const tile = tiles[filled];
    const vowelsOf = word.w.replace(/[^AEIOU]/g, '');
    const x = e && e.clientX ? e.clientX : undefined, y = e && e.clientY ? e.clientY : undefined;
    if (v === vowelsOf[filled]) {
      tile.textContent = v; tile.classList.remove('err', 'cur'); tile.classList.add('got');
      filled++; missesHere = 0;
      api.sfx.note(filled);
      if (filled === vowelsOf.length) win(x, y); else mark();
    } else {
      mistakes++; missesHere++;
      score = Math.max(0, score - 3); api.setScore(score);
      api.bad(x, y);
      tile.classList.remove('err'); void tile.offsetWidth; tile.classList.add('err');
      if (missesHere >= 3) { // help out after three misses on the same gap
        msg.textContent = 'It was ' + vowelsOf[filled];
        api.after(10, () => press(vowelsOf[filled]));
      }
    }
  }

  function win(x, y) {
    locked = true;
    const b = bonus();
    score += 10 + b; solved++;
    api.setScore(score);
    api.good(x, y);
    msg.textContent = b ? `+${10 + b}  (speed +${b})` : '+10';
    api.after(650, next);
  }

  function choose(i, e) {
    if (mode !== 'skel' || locked || api.ended) return;
    const btns = controls.querySelectorAll('.choice');
    const x = e && e.clientX ? e.clientX : undefined, y = e && e.clientY ? e.clientY : undefined;
    if (word.opts[i] === word) {
      btns[i].classList.add('right');
      board.textContent = word.w;
      win(x, y);
    } else {
      locked = true; mistakes++;
      score = Math.max(0, score - 3); api.setScore(score);
      btns[i].classList.add('wrong');
      btns[word.opts.indexOf(word)].classList.add('right');
      board.textContent = word.w;
      msg.textContent = `${word.opts[i].w} → ${word.opts[i].sk}`;
      api.bad(x, y);
      api.after(1300, next);
    }
  }

  function finish() {
    api.end({ score, stats: { Words: String(solved), 'Wrong picks': String(mistakes) } });
  }

  const km = {};
  for (const v of VOWELS) km[v.toLowerCase()] = () => press(v);
  for (let i = 1; i <= 4; i++) km[i] = () => choose(i - 1);
  api.keys(km);
  window.__cortexDebug = {
    get mode() { return mode; },
    get word() { return word && word.w; },
    get filled() { return filled; },
    get answerIndex() { return word && word.opts ? word.opts.indexOf(word) : -1; },
  };
  api.onCleanup(() => { delete window.__cortexDebug; });
  next();
}
