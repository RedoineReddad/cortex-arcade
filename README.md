# 🧠 Cortex Arcade

**▶ Play it: https://redoinereddad.github.io/cortex-arcade/**

**25 brain-training mini games that run in the browser.** Inspired by the daily-check format of
Dr Kawashima's *Brain Training* and the skill-area approach of Lumosity. Every game takes a known
cognitive-training idea (Stroop, n-back, Trail Making, multiple-object tracking, mental rotation,
digit-symbol coding and so on) and adds **an original twist**.

* **No build step, no framework, no network calls.** Vanilla ES modules, and each game is lazy-loaded on demand.
* **Drill-book design:** white graph-paper sheets on a grey desk by day, a chalkboard at night. The teacher's red pen marks your scores. Colours are documented and contrast-checked in [docs/DESIGN.md](docs/DESIGN.md). Type is Atkinson Hyperlegible, with Kalam for the pen; both are self-hosted.
* **three.js** (r170, bundled with the app and loaded only when needed) runs the two 3D spatial games.
* **Daily Brain Check:** three games picked for the day give an estimated *brain age* (20–80, lower is better).
* **Adaptive difficulty:** each game has 5 levels, adjusted from your recent ratings.
* **Progress:** a skill-profile radar across 6 areas, a brain-age trend, personal bests and a day streak, all stored locally.
* Works with mouse, touch and keyboard, on phone and desktop, in light and dark mode, and offline (service worker).

## Run it

Any static file server works:

```bash
npm start
```

That runs `node tests/serve.mjs 8080`; then open http://localhost:8080. `python3 -m http.server 8080` works too.
Opening `index.html` straight from disk won't work, because ES modules need http(s). To deploy, push the
folder to GitHub Pages, Netlify, Cloudflare Pages or any static host.

## The games

### ➗ Calculation

| Game | What you do | The twist |
|---|---|---|
| 🔗 **Chain Reaction** | 20 quick sums, solved as fast as you can. | Every answer becomes the first number of the next problem, so one slip changes the whole chain. |
| 🌧️ **Rainfall Sums** | Pop falling equations before they hit the ground. | Mirror drops (⇄) want their answer typed backwards: 12 becomes 21. |
| 🔺 **Triangle Twist** | Collapse a number triangle down to one value. | Blue rows add neighbours and red rows subtract them (left − right). |
| 🪙 **Exact Change** | Hand back the right change, using the fewest coins. | The till is out of some coins, so the obvious way to make change won't always work. |
| 🫧 **Bubble Rank** | Pop drifting expressions from smallest to largest. | When the arrow flips (⬇), pop from largest to smallest instead. |

### 🧠 Memory

| Game | What you do | The twist |
|---|---|---|
| 🔲 **Spin Grid** | Memorise the lit tiles, then find them again. | Before you answer, the board turns, so you have to track where the tiles moved to. |
| 📚 **Word Vault** | Memorise a list of words, then pick them out. | The decoys are close cousins of the real words (pear for apple), so a vague memory isn't enough. |
| 🎹 **Backwards Echo** | Repeat the melody of lit pads. | Orange rounds must be played back in reverse order. |
| 🃏 **Shifty Pairs** | Classic pairs, with cards that won't stay still. | Every miss makes two face-down cards swap places. Watch them move. |
| 🏠 **Full House** | People come and go. How many are inside now? | Cats sneak in and out too, and you won't know whether you'll be asked about people or cats until the end. |

### 🎯 Attention

| Game | What you do | The twist |
|---|---|---|
| 🎨 **Color Clash** | A colour word printed in a different ink colour. | The frame tells you which to answer: solid means the ink colour, dashed means the word. |
| 🐦 **Flock Focus** | Which way is the lead bird pointing? | At dusk (orange sky), ignore the birds and answer which way the whole flock is drifting. |
| 🪐 **Orbit Tracker** | Keep your eyes on the marked orbs as they swirl. | Orbs vanish while they cross the fog bands, so you have to keep tracking them blind. |
| ⏪ **Shape Back** | Does this card match the one before? | The cue keeps changing what counts as a match: SHAPE on some cards, COLOUR on others. |
| 🚦 **Signal Sprint** | Tap the green signals fast and leave the red ones alone. | When the screen turns purple the rule flips: tap red and leave green alone. |

### ⚡ Speed

| Game | What you do | The twist |
|---|---|---|
| 🔢 **Trail Mix** | Connect the dots alternating numbers and letters. | Halfway through, the dots you haven't reached yet jump to new places. |
| 🔣 **Glyph Cipher** | Decode glyphs into digits using the key. | Every so often the key flips face-down and you have to decode from memory. Answers given while it is hidden score double. |
| ⏰ **Time Warp** | How much time passed between two clocks? | Some clocks are reflected in a mirror and you have to flip them back in your head. |

### 🧊 Spatial

| Game | What you do | The twist |
|---|---|---|
| 🧊 **Cube Stack 3D** | Count every cube in a rotating 3D stack. | Cubes can't float, so hidden cubes under the visible ones count too. Later stacks ask about one colour only, and each column is a single colour. |
| 🔄 **Twin Twist 3D** | Are two 3D shapes the same, or mirror images? | The shapes keep tumbling, and you can drag one to turn it, but the clock is still running. |
| 🧭 **Blind Walk** | Follow the directions in your head and tap where you end up. | Some steps are turns relative to where the walker is facing ("turn left"), not compass directions. |
| 🔦 **Laser Mirrors** | Predict where the laser exits the mirror maze. | The mirrors only show for a few seconds, so you have to trace the beam from memory. |

### 🧩 Logic & Language

| Game | What you do | The twist |
|---|---|---|
| ⚖️ **Balance Bench** | Read the scales and work out which object is heaviest. | Some scales balance groups (two cherries = one apple), so you have to do the sums as well as the comparisons. |
| 🔍 **Pattern Sleuth** | What comes next in the sequence? | Some sequences are two series woven together, so look at every other term. |
| 🔤 **Vowel Vanish** | Words with their vowels removed. Rebuild them. | At higher levels the gaps aren't marked, so you have to work out where the vowels went. |

## Project layout

```
index.html              entry point + import map for three.js
css/style.css           design system (light/dark) and shared game classes
js/app.js               router, library, intro/results, daily check, stats
js/core/api.js          game runtime: timers, HUD, keypad, feedback, auto-cleanup
js/core/storage.js      plays, bests, adaptive levels, streak (localStorage)
js/core/audio.js        tiny WebAudio synth (no sound files)
js/games/catalog.js     metadata for every game
js/games/<id>.js        one module per game
vendor/                 three.js r170 (MIT)
fonts/                  Atkinson Hyperlegible + Kalam (OFL)
sw.js                   offline cache
tests/smoke.mjs         Playwright smoke test (random input on every game)
docs/GAME_API.md        how to write a new game
```

## Tests

```bash
node tests/smoke.mjs
```

That runs every game with random input and fails on console errors. Other forms:
`node tests/smoke.mjs trail-mix 20` runs one game for 20 s, and `SHOTS=1 node tests/smoke.mjs` also saves
screenshots to `tests/shots/`, and `SCHEME=dark` runs the dark theme. You need Playwright with Chromium installed.

For hands-on checks (keyboard focus, the skip link, tap sizes, playing a game through the real UI), drive the running app with
[Playwright CLI](https://www.npmjs.com/package/@playwright/cli): `npx playwright-cli open http://localhost:8080/`, then `snapshot`,
`click`, `press` and `eval`.

## Disclaimer

This is for fun. The "brain age" is a playful score, not a medical or psychometric assessment.
*Brain Training* and *Lumosity* are trademarks of their respective owners. This project is not
affiliated with them and uses none of their assets.
