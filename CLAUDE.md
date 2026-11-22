# Cortex Arcade — Phaser 4 + React edition

Mobile-first brain-training mini-games (Lumosity-style). React + TypeScript + Vite shell,
**Phaser 4** for gameplay, **Vitest** for pure logic tests.

```bash
npm run dev        # Vite dev server
npm test           # Vitest (pure logic only, no browser)
npm run typecheck  # tsc -b
npm run build      # typecheck + production bundle
```

## Architecture: three strict layers

```
src/
  App.tsx, main.tsx, index.css   ── Layer 1: App shell (React)
  ui/                            ── screens + components (React only)
  bridge/gameBus.ts              ── typed event bridge React <-> Phaser (no Phaser import)
  core/                          ── shared pure TS: rng, store, scoring, brain age, progress
  audio/sfx.ts                   ── tiny WebAudio synth (no assets)
  phaser/                        ── the ONE Phaser.Game + shared scene helpers
    PhaserHost.tsx               ── mounts the singleton game into the DOM
    game.ts                      ── creates the singleton, registers scenes, directs scene switching
    BaseGameScene.ts, fx.ts, layout.ts, theme.ts
  games/
    registry.ts                  ── game metadata (pure, safe for React to import)
    scenes.ts                    ── sceneKey -> Scene class map (Phaser side only)
    <game-id>/
      meta.ts                    ── id, title, description, sceneKey (pure)
      logic.ts                   ── Layer 2: pure game logic   (ZERO Phaser imports)
      logic.test.ts              ── Vitest unit tests for logic.ts
      Scene.ts                   ── Layer 3: thin Phaser 4 scene
```

### Layer 1 — App shell (`src/App.tsx`, `src/ui/`)
- Navigation, Quick Play menu, Daily Training (chains up to 3 games), Results / Brain Age, settings.
- Persists progress via `src/core/progress.ts` (localStorage, versioned, defensive parsing).
- Never imports `phaser` or any `Scene.ts`. Talks to games only through `gameBus`.

### Layer 2 — Pure logic (`src/games/<id>/logic.ts`)
- **No `phaser` imports, no DOM, no `Date.now()` / `Math.random()` / timers.**
  Time is passed in as `now` (ms) and randomness comes from a seeded `Rng` (`src/core/rng.ts`),
  so every round is reproducible and testable.
- Shape: `createInitialState(config, seed)` + `reduce(state, action) -> { state, events }`.
  Events (`correct`, `wrong`, `combo`, `timeout`, `finished`, ...) are what scenes animate.
- Owns problem generation, difficulty scaling, timing rules, scoring and `toResult()`.
- Every `logic.ts` has a `logic.test.ts` covering generators, edge cases and scoring.

### Layer 3 — Phaser scenes (`src/games/<id>/Scene.ts`)
- Extend `BaseGameScene`. Hold a `Store` of the logic state, dispatch actions on input / ticks,
  render state, and play juice for logic events. **No game rules in scenes.**
- On finish: `gameBus.emit('game:complete', result)`. Never navigate the React app directly.
- Layout is responsive: read sizes from `this.scale` and the `layout.ts` helpers; re-layout on
  `resize`. The canvas is HiDPI (device pixels), so use `u(n)` to convert CSS px to game px.

### The single Phaser.Game
- Created once, lazily, by `getGame()` in `src/phaser/game.ts`. **Never destroy / recreate it**
  between mini-games (StrictMode double-mount is handled by the module-level singleton).
- `<PhaserHost />` is always mounted; it re-parents the canvas, toggles visibility and
  sleeps the game loop while the shell is showing menus.
- Switching games = `gameBus.emit('game:start', { gameId, seed })`. The director in `game.ts`
  stops the running game scene and starts the requested scene key. `game:stop` returns to idle.

## Phaser 4 rules (read `node_modules/phaser/skills/*/SKILL.md` before writing Phaser code)
- Import as `import * as Phaser from 'phaser'`.
- Filters, not FX: `obj.enableFilters(); obj.filters.internal.addGlow(...)`;
  cameras have `camera.filters.internal/external` without enabling.
- Tint: `setTint(c).setTintMode(Phaser.TintModes.FILL)` — `setTintFill` no longer exists.
- Masks: `filters.internal.addMask(go)` — no `BitmapMask` / `GeometryMask` (WebGL).
- Geometry: `Phaser.Math.Vector2`, never `Geom.Point`. `Math.TAU` is 2π; `Math.PI2` is gone.
- No pipelines (`PostFXPipeline`, `setPipeline`) — v4 uses RenderNodes.
- Use native `Gradient` game objects (`this.add.gradient(...)`) for backgrounds.
- `DynamicTexture` / `RenderTexture` need an explicit `.render()`.
- `roundPixels` defaults to false in v4.

## Adding a mini-game
1. `src/games/<id>/meta.ts` + `logic.ts` + `logic.test.ts` (get tests green first).
2. `src/games/<id>/Scene.ts` extending `BaseGameScene`.
3. Register meta in `src/games/registry.ts` and the scene in `src/games/scenes.ts`.
4. `logic.ts` must export `toResult(state): GameResult` with a `performance` in 0..1 for Brain Age.
