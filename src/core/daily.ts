import { createRng, hashString } from './rng';
import type { GameId } from './types';

export const DAILY_LENGTH = 3;

/** The day's training set: up to 3 distinct games, same for everyone on that date. */
export function dailyPlan(date: string, available: readonly GameId[]): { gameId: GameId; seed: number }[] {
  const rng = createRng(hashString(`daily:${date}`));
  return rng
    .shuffle(available)
    .slice(0, Math.min(DAILY_LENGTH, available.length))
    .map((gameId) => ({ gameId, seed: hashString(`${date}:${gameId}`) }));
}

/** Random seed for Quick Play. */
export function freshSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) return crypto.getRandomValues(new Uint32Array(1))[0];
  return (Math.random() * 2 ** 32) >>> 0;
}
