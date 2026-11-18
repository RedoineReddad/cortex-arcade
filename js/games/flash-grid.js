// Spin Grid: memorise lit tiles, watch the board rotate, then tap where the tiles are NOW.
import { sample, pick, clamp } from '../core/util.js';

export default function start(api) {
  const { h, level } = api;
  const TRIALS = 12;
  let tiles = clamp(2 + level, 3, 9); // level 1 → 3 tiles
  let trial = 0, score = 0, perfect = 0, maxTiles = 0;

  api.css(`
    .fg-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; }
    .fg-status { font-size:1.15rem; font-weight:800; min-height:1.6em; text-align:center; }
    .fg-status.go { color:var(--c); }
    .fg-frame { position:relative; width:min(400px, 92%, 52dvh); aspect-ratio:1; }
    .fg-board {
      position:absolute; inset:0; display:grid; gap:6px; padding:10px; border-radius:20px;
      background:var(--bg2); border:2px solid var(--line); box-shadow:var(--shadow);
      transform-origin:50% 50%;
    }
    .fg-board.spin { transition:transform .8s cubic-bezier(.55,.05,.35,1); }
    .fg-tile {
      border-radius:12px; border:2px solid var(--line); background:var(--panel-solid);
      cursor:pointer; padding:0; transition:background .15s, border-color .15s, transform .08s;
    }
    .fg-board.input .fg-tile:hover { border-color:var(--c); }
    .fg-tile:active { transform:scale(.94); }
    .fg-tile.lit { background:var(--c); border-color:var(--c); box-shadow:0 0 18px color-mix(in srgb,var(--c) 60%,transparent); }
    .fg-tile.hit { background:var(--good); border-color:var(--good); }
    .fg-tile.wrong { background:var(--bad); border-color:var(--bad); }
    .fg-tile.missed { border:3px dashed var(--good); background:color-mix(in srgb,var(--good) 32%,var(--panel-solid)); }
    .fg-mark {
      position:absolute; width:14px; height:14px; border-radius:50%; background:var(--c);
      box-shadow:0 0 0 3px var(--panel-solid); pointer-events:none;
    }
    .fg-mark.c0 { left:-6px; top:-6px; } .fg-mark.c1 { right:-6px; top:-6px; }
    .fg-mark.c2 { right:-6px; bottom:-6px; } .fg-mark.c3 { left:-6px; bottom:-6px; }
    .fg-dots { display:flex; gap:6px; min-height:12px; }
    .fg-dot { width:10px; height:10px; border-radius:50%; background:var(--line); }
    .fg-dot.on { background:var(--good); }
    .fg-spin { font-size:.95rem; color:var(--muted); min-height:1.3em; }
  `);

  const status = h('div.fg-status', '');
  const board = h('div.fg-board');
  const frame = h('div.fg-frame', board);
  const dots = h('div.fg-dots');
  const spinTxt = h('div.fg-spin');
  api.stage.append(h('div.fg-wrap', status, frame, dots, spinTxt));
  api.setScore(0);

  let n = 3, targets = new Set(), found = new Set(), accepting = false, cells = [];
  const sizeFor = (t) => (t <= 3 ? 3 : t <= 5 ? 4 : t <= 7 ? 5 : 6);

  function build(size) {
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    cells = [];
    for (let i = 0; i < size * size; i++) {
      const b = h('button.fg-tile', { type: 'button', 'aria-label': 'tile', onpointerdown: (e) => { e.preventDefault(); tap(i, e); } });
      cells.push(b);
      board.append(b);
    }
  }

  // clockwise quarter-turns: (r,c) → (c, n-1-r)
  const rotIdx = (i, q) => {
    let r = Math.floor(i / n), c = i % n;
    for (let k = 0; k < ((q % 4) + 4) % 4; k++) [r, c] = [c, n - 1 - r];
    return r * n + c;
  };

  function next() {
    if (api.ended) return;
    if (trial >= TRIALS) return finish();
    trial++;
    api.setInfo(`Trial ${trial}/${TRIALS}`);
    api.setProgress((trial - 1) / TRIALS);
    n = sizeFor(tiles);
    maxTiles = Math.max(maxTiles, tiles);
    build(n);
    board.classList.remove('spin', 'input');
    board.style.transform = 'rotate(0deg)';
    accepting = false;
    found = new Set();
    targets = new Set(sample([...Array(n * n).keys()], tiles));
    const corner = Math.floor(Math.random() * 4);
    frame.querySelectorAll('.fg-mark').forEach((m) => m.remove());
    const mark = h('div.fg-mark.c' + corner);
    board.append(mark);
    dots.innerHTML = '';
    for (let i = 0; i < tiles; i++) dots.append(h('div.fg-dot'));
    spinTxt.textContent = '';
    status.className = 'fg-status';
    status.textContent = `Memorise ${tiles} tiles`;
    api.after(450, () => {
      targets.forEach((i) => cells[i].classList.add('lit'));
      api.after(1100 + tiles * 60, () => {
        targets.forEach((i) => cells[i].classList.remove('lit'));
        status.textContent = 'Watch the turn…';
        const q = pick(level >= 3 ? [1, 2, 3, -1] : [1, 2, -1]); // -1 = 90° anticlockwise
        const deg = q * 90;
        api.after(300, () => {
          board.classList.add('spin');
          board.style.transform = `rotate(${deg}deg)`;
          api.after(900, () => {
            // re-render un-rotated, with targets mapped to their new homes
            const quarter = ((q % 4) + 4) % 4;
            targets = new Set([...targets].map((i) => rotIdx(i, quarter)));
            board.classList.remove('spin');
            board.style.transform = 'none';
            mark.className = 'fg-mark c' + ((corner + quarter) % 4);
            spinTxt.textContent = q === -1 ? '↺ 90°' : `↻ ${deg}°`;
            status.className = 'fg-status go';
            status.textContent = 'Tap where they are now';
            board.classList.add('input');
            accepting = true;
          });
        });
      });
    });
  }

  function tap(i, e) {
    if (!accepting || api.ended || found.has(i)) return;
    if (targets.has(i)) {
      found.add(i);
      cells[i].classList.add('hit');
      api.sfx.note(found.size);
      dots.children[found.size - 1]?.classList.add('on');
      if (found.size === targets.size) {
        accepting = false;
        const pts = tiles * 2;
        score += pts; perfect++;
        api.setScore(score);
        api.good(e.clientX, e.clientY);
        status.textContent = `Perfect! +${pts}`;
        tiles = Math.min(9, tiles + 1);
        api.after(900, next);
      }
    } else {
      accepting = false;
      cells[i].classList.add('wrong');
      targets.forEach((t) => { if (!found.has(t)) cells[t].classList.add('missed'); });
      score += found.size;
      api.setScore(score);
      api.bad(e.clientX, e.clientY);
      status.textContent = found.size ? `${found.size}/${targets.size} found · +${found.size}` : 'Missed!';
      tiles = Math.max(2, tiles - 1);
      api.after(1500, next);
    }
  }

  function finish() {
    api.setProgress(1);
    api.end({ score, stats: { Perfect: `${perfect} / ${TRIALS}`, 'Most tiles': String(maxTiles) } });
  }

  window.__cortexDebug = { get targets() { return [...targets]; }, get accepting() { return accepting; }, cells: () => cells };
  api.onCleanup(() => { delete window.__cortexDebug; });
  next();
}
