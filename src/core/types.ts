/** Shared types between the React shell, the bridge and the game layers. Pure TS. */

export type GameId = 'speed-math' | 'color-control';

export type SkillArea = 'calculation' | 'attention' | 'memory' | 'speed' | 'flexibility';

export interface GameMeta {
  id: GameId;
  title: string;
  /** Short subtitle shown on cards, e.g. "Calculations x20". */
  tagline: string;
  description: string;
  howTo: string[];
  skill: SkillArea;
  /** Phaser scene key. Must match the key the Scene class registers. */
  sceneKey: string;
  /** Accent colour (CSS hex) used by the shell and the scene. */
  accent: string;
  emoji: string;
}

/** A labelled extra stat a game wants on the Results screen. */
export interface ResultStat {
  label: string;
  value: string;
}

/** What every mini-game reports back when a round finishes. */
export interface GameResult {
  gameId: GameId;
  score: number;
  /** 0..1 */
  accuracy: number;
  /** Mean reaction time over answered trials, ms. 0 if none answered. */
  avgReactionMs: number;
  correct: number;
  total: number;
  /** Normalised 0..1 performance used for Brain Age. */
  performance: number;
  durationMs: number;
  extra: ResultStat[];
}
