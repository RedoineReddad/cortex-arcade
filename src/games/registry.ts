/** Game metadata only — pure, safe for the React shell to import (no Phaser). */
import type { GameId, GameMeta } from '../core/types';
import { colorControlMeta } from './color-control/meta';
import { speedMathMeta } from './speed-math/meta';

export const GAME_METAS: readonly GameMeta[] = [speedMathMeta, colorControlMeta];

export function getMeta(id: GameId): GameMeta {
  const m = GAME_METAS.find((g) => g.id === id);
  if (!m) throw new Error(`Unknown game id: ${id}`);
  return m;
}
