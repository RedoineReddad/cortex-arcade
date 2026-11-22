import type { GameResult } from './types';

export const BRAIN_AGE_BEST = 20;
export const BRAIN_AGE_WORST = 80;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Brain Age from normalised performances (0..1). Lower is better, 20..80.
 * Uses a slight ease so mid performances land in the 40s rather than exactly 50.
 */
export function brainAgeFromPerformances(performances: readonly number[]): number {
  if (performances.length === 0) return BRAIN_AGE_WORST;
  const mean = performances.reduce((a, p) => a + clamp01(p), 0) / performances.length;
  const eased = 1 - Math.pow(1 - mean, 1.3);
  return Math.round(BRAIN_AGE_WORST - eased * (BRAIN_AGE_WORST - BRAIN_AGE_BEST));
}

export function brainAge(results: readonly GameResult[]): number {
  return brainAgeFromPerformances(results.map((r) => r.performance));
}

/** Map a raw value against a "par" range to 0..1. `higherIsBetter` decides the direction. */
export function normalise(value: number, worst: number, best: number): number {
  if (best === worst) return value >= best ? 1 : 0;
  return clamp01((value - worst) / (best - worst));
}
