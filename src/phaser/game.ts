/**
 * The ONE Phaser.Game. Created lazily, never destroyed. Scene switching is driven by gameBus.
 */
import * as Phaser from 'phaser';
import { gameBus } from '../bridge/gameBus';
import { GAME_SCENES } from '../games/scenes';
import { GAME_METAS, getMeta } from '../games/registry';
import { DPR_KEY } from './layout';
import { THEME } from './theme';

export const IDLE_KEY = 'idle';

class IdleScene extends Phaser.Scene {
  constructor() {
    super(IDLE_KEY);
  }
}

let game: Phaser.Game | null = null;
let ready = false;
let pendingStart: Parameters<typeof startGame>[0] | null = null;
const gameKeys = new Set(GAME_METAS.map((m) => m.sceneKey));

// Capped at 2: beyond that the extra fill-rate costs more than the sharpness gains on phones.
const currentDpr = () => Math.min(2, Math.max(1, Math.round((window.devicePixelRatio || 1) * 100) / 100));

function stopGameScenes(g: Phaser.Game) {
  for (const s of g.scene.getScenes(false)) {
    const key = s.sys.settings.key;
    if (gameKeys.has(key) && (s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping())) g.scene.stop(key);
  }
}

function startGame(payload: { gameId: Parameters<typeof getMeta>[0]; seed: number }) {
  if (!game || !ready) {
    pendingStart = payload;
    return;
  }
  const meta = getMeta(payload.gameId);
  game.loop.wake();
  stopGameScenes(game);
  game.scene.stop(IDLE_KEY);
  game.scene.start(meta.sceneKey, { seed: payload.seed });
}

function stopToIdle() {
  pendingStart = null;
  if (!game || !ready) return;
  stopGameScenes(game);
  if (!game.scene.isActive(IDLE_KEY)) game.scene.start(IDLE_KEY);
}

/** Get (creating on first call) the singleton game, rendering into `parent`. */
export function getGame(parent: HTMLElement): Phaser.Game {
  if (game) return game;
  const dpr = currentDpr();
  const rect = parent.getBoundingClientRect();
  const w = Math.max(1, rect.width || window.innerWidth);
  const h = Math.max(1, rect.height || window.innerHeight);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: THEME.bgBottom,
    antialias: true,
    scale: {
      // We own sizing (HiDPI): canvas = CSS size * dpr, displayed at 1/dpr zoom.
      mode: Phaser.Scale.NONE,
      width: Math.round(w * dpr),
      height: Math.round(h * dpr),
      zoom: 1 / dpr,
    },
    input: { activePointers: 3 },
    banner: false,
    scene: [IdleScene, ...GAME_SCENES],
    callbacks: {
      preBoot: (g) => g.registry.set(DPR_KEY, dpr),
      postBoot: () => {
        ready = true;
        gameBus.emit('host:ready');
        if (pendingStart) {
          const p = pendingStart;
          pendingStart = null;
          startGame(p);
        }
      },
    },
  });
  if (import.meta.env.DEV) (window as unknown as { __game?: Phaser.Game }).__game = game;
  gameBus.on('game:start', startGame);
  gameBus.on('game:stop', stopToIdle);
  return game;
}

/** Resize to the host element's CSS size (called by PhaserHost's ResizeObserver). */
export function resizeGame(cssW: number, cssH: number) {
  if (!game || cssW < 1 || cssH < 1) return;
  const dpr = currentDpr();
  if (game.registry.get(DPR_KEY) !== dpr) {
    game.registry.set(DPR_KEY, dpr);
    game.scale.setZoom(1 / dpr);
  }
  game.scale.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
}

/** Sleep the RAF loop while menus are showing; wake when a game is on screen. */
export function setGameAwake(awake: boolean) {
  if (!game) return;
  if (awake) game.loop.wake();
  else game.loop.sleep();
}
