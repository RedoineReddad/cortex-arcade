# Writing a Cortex Arcade mini game

Each game is one ES module at `js/games/<id>.js`, with metadata in `js/games/catalog.js`
(title, category, blurb, twist, how-to, `par`). The shell handles the intro screen, the 3-2-1
countdown, the results screen, storage, and difficulty adaptation.

```js
// js/games/my-game.js
import { rand, pick, shuffle, sample, clamp, randf } from '../core/util.js';

export default function start(api) {
  const { h, level } = api;        // level: 1..5, adapted from recent ratings
  api.css(`.mg-thing { ... }`);    // game-scoped CSS, auto-removed. Prefix classes with a short game prefix.
  api.stage.append(h('div.g-prompt', 'Hello'));
  const t = api.timer(60, () => api.end({ score, stats: { Correct: n } }));
  // ...
  // optionally return a cleanup function
}
```

## Rules

* No external assets and no network. Draw with DOM, SVG, `<canvas>` or three.js (`await api.three()`).
* **Everything** async must go through the api (`api.after`, `api.every`, `api.loop`, `api.on`, `api.keys`)
  so it is torn down automatically when the game ends or the player quits. Guard async continuations
  with `if (api.ended) return;`.
* The score is always **higher = better**, an integer ≥ 0. A solid adult player should reach roughly the
  `par` value in the catalog (rating = 100·score/par). Pass extra info in `stats` (label → string).
* Games should last about 45–120 s. Use `api.setProgress(f)` for round-based games and `api.setInfo(text)` for
  short status like "Round 3/10".
* Support mouse, touch (pointer events) and, where sensible, keyboard. The stage has a 420×~780 phone
  layout at minimum; use `min()`/`clamp()`/percentages so it also looks good on a 1100px desktop stage.
* Use the CSS variable `--c` (category colour), `--good`, `--bad`, `--panel-solid`, `--line`, `--text`, `--muted`, `--bg2`.
  The app supports light and dark mode, so don't hard-code white/black text on backgrounds.
* Interactive elements should be `<button>`s, or carry `data-hit` / class `tap`, so the smoke test can click them.

## API reference (`js/core/api.js`)

| member | description |
|---|---|
| `stage` | the game's root element (flex column, centred, `position: relative`, `overflow: hidden`) |
| `level` | adaptive difficulty 1–5 |
| `h(sel, attrs, ...children)` | element builder: `h('button.choice', {onclick}, 'Yes')`, works for SVG tags too |
| `css(text)` | inject scoped CSS |
| `timer(sec, onDone)` | HUD countdown → `{left, add(s), stop()}` |
| `stopwatch()` | HUD stopwatch → `{elapsed, stop()}` |
| `setScore(v)` / `setInfo(txt)` / `setProgress(0..1)` | HUD |
| `good(x?, y?)` / `bad(x?, y?)` | sound + ✓/✗ flash at client coords (or centre); `bad` shakes the stage; `good` returns the current streak |
| `banner(text, ms, cls)` | big centred transient message |
| `keypad({maxLen, negative, onSubmit(v), onChange(v), autoSubmit(v)->bool, parent, hideDisplay})` | on-screen + physical numeric keypad |
| `after(ms, fn)`, `every(ms, fn)`, `clear(id)` | managed timers |
| `loop(fn(dt, elapsed))` | managed rAF loop; return `false` to stop. Returns `{stop}` |
| `on(target, event, fn)` | managed event listener |
| `keys({ArrowLeft: fn, a: fn})` | managed keyboard shortcuts |
| `onCleanup(fn)` | run on teardown (dispose three.js renderers here) |
| `three()` | `Promise<THREE>`, lazy-loaded vendored three.js r170 |
| `sfx.good/bad/tick/go/end/note(i)` | synth sounds |
| `end({score, stats})` | finish the game |
| `ended` | true after end/quit |

Shared CSS classes: `.g-prompt` (big text), `.g-sub` (muted caption), `.choices` + `.choice` (answer
button grid; add `.right` / `.wrong` for feedback), keypad styles.

## Testing

```
node tests/smoke.mjs <id>[,<id2>] [seconds]   # random monkey input, fails on console errors
SHOTS=1 node tests/smoke.mjs <id> 8           # also writes tests/shots/<id>-a.png / -b.png
node tests/serve.mjs 8080                     # serve the app locally
```
