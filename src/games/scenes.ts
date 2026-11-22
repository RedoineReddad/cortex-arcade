/** Phaser-side registry: every mini-game Scene class. Imported only by src/phaser/game.ts. */
import { ColorControlScene } from './color-control/Scene';
import { SpeedMathScene } from './speed-math/Scene';

export const GAME_SCENES = [SpeedMathScene, ColorControlScene];
