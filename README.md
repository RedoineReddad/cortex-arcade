# 🧠 Cortex Arcade: Phaser 4 + React edition

A mobile-first brain-training mini-games app, rebuilt with **React + TypeScript + Vite** for the shell and **Phaser 4** for the games.
(The original vanilla-JS version with 25 games lives on `main`.)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: pure game logic, scoring, progress, bus
npm run build      # typecheck + production bundle in dist/ (relative paths, any static host)
```

## Games (milestone 1)

| Game | What you do |
|---|---|
| ➗ **Speed Math** (Calculations ×20) | 20 rapid-fire +, −, × problems that get harder every five. Use the on-screen keypad or your keyboard. The answer is checked as soon as you've typed enough digits. Wrong answers add +3s and break your combo. |
| 🎨 **Color Control** (Stroop) | Colour words in mismatched ink. The banner says whether to tap the **INK** colour or what the **WORD** says, and it switches more often as you go. The response window shrinks with every correct answer. Keys: R/B/G/Y or 1–4. |

**Quick Play** runs any game with a fresh seed. **Daily Training** chains up to 3 games, with the same seeded set for everyone on a given day, and ends with a **Brain Age** score (20–80, lower is better). Results show score, accuracy, average reaction time (ms) and per-game stats. Progress, personal bests, the daily streak and settings are kept in `localStorage`.

## Architecture

See [CLAUDE.md](CLAUDE.md) for the rules. In short:

1. **App shell** (`src/App.tsx`, `src/ui/`): React screens and navigation. It never imports Phaser.
2. **Pure logic** (`src/games/<id>/logic.ts`): deterministic reducers with seeded RNG and injected time, unit-tested in `logic.test.ts`.
3. **Thin Phaser 4 scenes** (`src/games/<id>/Scene.ts`): render the logic state and add juice (Blur-filter countdown, Glow pulses, Vignette hit flashes, `setTintMode(FILL)` button flashes, particles, shake, Gradient backgrounds).

There is a single `Phaser.Game`, created once inside `<PhaserHost />` and lazy-loaded so the menu paints immediately. It is never recreated. `src/bridge/gameBus.ts` (typed, Phaser-free) carries `game:start` / `game:stop` from React to Phaser and `game:complete` back.
