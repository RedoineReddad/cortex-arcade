/**
 * Color Control (Stroop) — pure logic. NO Phaser imports.
 *
 * A colour word (RED, BLUE, GREEN, YELLOW) is drawn in a mismatched ink colour.
 * The rule banner says whether to answer the INK colour or the WORD's meaning.
 * Each trial has a response window that shrinks as you get answers right (escalating speed)
 * and relaxes slightly when you miss. The rule switches more often as the round goes on.
 */
import { normalise } from '../../core/brainAge';
import { createRng } from '../../core/rng';
import type { Step } from '../../core/store';
import type { GameResult } from '../../core/types';

export const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type StroopColor = (typeof COLORS)[number];
export type Rule = 'ink' | 'word';

export interface Trial {
  index: number;
  word: StroopColor;
  ink: StroopColor;
  rule: Rule;
  answer: StroopColor;
  /** True if the rule differs from the previous trial's rule. */
  switched: boolean;
  /** Time the trial becomes answerable (after the inter-trial gap). */
  shownAt: number;
  windowMs: number;
}

export interface ColorControlConfig {
  durationMs: number;
  startWindowMs: number;
  minWindowMs: number;
  /** Window multiplier after a correct answer (< 1 = faster). */
  speedUp: number;
  /** Window multiplier after a miss (> 1 = slower), capped at startWindowMs. */
  easeOff: number;
  /** Gap between trials (feedback time). */
  gapMs: number;
  /** Extra gap after a wrong answer or timeout. */
  missGapMs: number;
  /** Rule-switch probability at the start, growing per trial up to maxSwitchChance. */
  baseSwitchChance: number;
  switchChanceStep: number;
  maxSwitchChance: number;
  basePoints: number;
  maxSpeedBonus: number;
  comboStep: number;
  comboCap: number;
}

export const DEFAULT_CONFIG: ColorControlConfig = {
  durationMs: 45_000,
  startWindowMs: 3000,
  minWindowMs: 900,
  speedUp: 0.94,
  easeOff: 1.08,
  gapMs: 250,
  missGapMs: 550,
  baseSwitchChance: 0.2,
  switchChanceStep: 0.012,
  maxSwitchChance: 0.5,
  basePoints: 100,
  maxSpeedBonus: 100,
  comboStep: 0.1,
  comboCap: 10,
};

export interface Response {
  trial: Trial;
  given: StroopColor | null;
  correct: boolean;
  timedOut: boolean;
  /** ms from shownAt; for timeouts this equals the window. */
  reactionMs: number;
  points: number;
}

export type Phase = 'ready' | 'playing' | 'finished';

export interface ColorControlState {
  config: ColorControlConfig;
  phase: Phase;
  rngState: number;
  startedAt: number | null;
  finishedAt: number | null;
  trial: Trial | null;
  windowMs: number;
  responses: Response[];
  streak: number;
  bestStreak: number;
  score: number;
}

export type ColorControlAction =
  | { type: 'start'; now: number }
  | { type: 'respond'; color: StroopColor; now: number }
  | { type: 'tick'; now: number };

export type ColorControlEvent =
  | { type: 'started' }
  | { type: 'trial'; trial: Trial }
  | { type: 'early' }
  | { type: 'correct'; points: number; streak: number; reactionMs: number }
  | { type: 'wrong'; expected: StroopColor; given: StroopColor; lostStreak: number }
  | { type: 'timeout'; expected: StroopColor; lostStreak: number }
  | { type: 'speed'; windowMs: number; faster: boolean }
  | { type: 'combo'; streak: number; milestone: boolean }
  | { type: 'finished' };

// ---------------------------------------------------------------------------
// Trial generation
// ---------------------------------------------------------------------------

export function switchChance(index: number, config: ColorControlConfig = DEFAULT_CONFIG): number {
  return Math.min(config.maxSwitchChance, config.baseSwitchChance + index * config.switchChanceStep);
}

export function answerFor(word: StroopColor, ink: StroopColor, rule: Rule): StroopColor {
  return rule === 'ink' ? ink : word;
}

/**
 * Pure trial generator. Returns the trial and the next RNG state.
 * Ink always differs from the word, and the (word, ink) pair never repeats back-to-back.
 */
export function generateTrial(
  rngState: number,
  prev: Pick<Trial, 'word' | 'ink' | 'rule' | 'index'> | null,
  shownAt: number,
  windowMs: number,
  config: ColorControlConfig = DEFAULT_CONFIG,
): { trial: Trial; rngState: number } {
  const rng = createRng(rngState);
  const index = prev ? prev.index + 1 : 0;
  const rule: Rule = prev === null ? 'ink' : rng.chance(switchChance(index, config)) ? (prev.rule === 'ink' ? 'word' : 'ink') : prev.rule;
  let word: StroopColor;
  let ink: StroopColor;
  do {
    word = rng.pick(COLORS);
    ink = rng.pick(COLORS.filter((c) => c !== word));
  } while (prev && word === prev.word && ink === prev.ink);
  return {
    trial: { index, word, ink, rule, answer: answerFor(word, ink, rule), switched: prev !== null && rule !== prev.rule, shownAt, windowMs },
    rngState: rng.state,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function comboMultiplier(streak: number, config: ColorControlConfig = DEFAULT_CONFIG): number {
  const steps = Math.min(Math.max(streak - 1, 0), config.comboCap);
  return Math.round((1 + steps * config.comboStep) * 100) / 100;
}

/** Points scale with how much of the window was left when answering. */
export function pointsFor(reactionMs: number, windowMs: number, streak: number, config: ColorControlConfig = DEFAULT_CONFIG): number {
  const left = windowMs > 0 ? Math.max(0, 1 - reactionMs / windowMs) : 0;
  return Math.round((config.basePoints + left * config.maxSpeedBonus) * comboMultiplier(streak, config));
}

export function nextWindow(windowMs: number, correct: boolean, config: ColorControlConfig = DEFAULT_CONFIG): number {
  const w = correct ? windowMs * config.speedUp : windowMs * config.easeOff;
  return Math.round(Math.min(config.startWindowMs, Math.max(config.minWindowMs, w)));
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export function createInitialState(seed: number, config: Partial<ColorControlConfig> = {}): ColorControlState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return {
    config: cfg,
    phase: 'ready',
    rngState: seed >>> 0,
    startedAt: null,
    finishedAt: null,
    trial: null,
    windowMs: cfg.startWindowMs,
    responses: [],
    streak: 0,
    bestStreak: 0,
    score: 0,
  };
}

export function timeLeftMs(state: ColorControlState, now: number): number {
  if (state.startedAt === null) return state.config.durationMs;
  return Math.max(0, state.config.durationMs - ((state.finishedAt ?? now) - state.startedAt));
}

/** Fraction (1..0) of the current trial's window that remains. */
export function windowLeft(state: ColorControlState, now: number): number {
  const t = state.trial;
  if (!t || now < t.shownAt) return 1;
  return Math.max(0, 1 - (now - t.shownAt) / t.windowMs);
}

const none = (state: ColorControlState): Step<ColorControlState, ColorControlEvent> => ({ state, events: [] });

function isOver(state: ColorControlState, now: number) {
  return state.startedAt !== null && now - state.startedAt >= state.config.durationMs;
}

function finish(state: ColorControlState, now: number, events: ColorControlEvent[]) {
  events.push({ type: 'finished' });
  const end = state.startedAt !== null ? Math.min(now, state.startedAt + state.config.durationMs) : now;
  return { state: { ...state, phase: 'finished' as const, finishedAt: end, trial: null }, events };
}

/** Resolve the current trial (answer or timeout) and queue the next one. */
function resolve(state: ColorControlState, given: StroopColor | null, now: number): Step<ColorControlState, ColorControlEvent> {
  const trial = state.trial!;
  const timedOut = given === null;
  const correct = !timedOut && given === trial.answer;
  const reactionMs = timedOut ? trial.windowMs : Math.max(0, now - trial.shownAt);
  const events: ColorControlEvent[] = [];
  let { streak, bestStreak, score } = state;
  let points = 0;

  if (correct) {
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    points = pointsFor(reactionMs, trial.windowMs, streak, state.config);
    score += points;
    events.push({ type: 'correct', points, streak, reactionMs });
    if (streak >= 3) events.push({ type: 'combo', streak, milestone: streak % 5 === 0 });
  } else if (timedOut) {
    events.push({ type: 'timeout', expected: trial.answer, lostStreak: streak });
    streak = 0;
  } else {
    events.push({ type: 'wrong', expected: trial.answer, given: given!, lostStreak: streak });
    streak = 0;
  }

  const windowMs = nextWindow(state.windowMs, correct, state.config);
  if (windowMs !== state.windowMs) events.push({ type: 'speed', windowMs, faster: windowMs < state.windowMs });

  // When a trial times out on a late tick, base the next trial on the deadline, not on the tick time.
  const resolvedAt = timedOut ? trial.shownAt + trial.windowMs : now;
  const gap = correct ? state.config.gapMs : state.config.missGapMs;
  const gen = generateTrial(state.rngState, trial, resolvedAt + gap, windowMs, state.config);
  events.push({ type: 'trial', trial: gen.trial });

  return {
    state: {
      ...state,
      rngState: gen.rngState,
      trial: gen.trial,
      windowMs,
      streak,
      bestStreak,
      score,
      responses: [...state.responses, { trial, given, correct, timedOut, reactionMs, points }],
    },
    events,
  };
}

export function reduce(state: ColorControlState, action: ColorControlAction): Step<ColorControlState, ColorControlEvent> {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'ready') return none(state);
      const gen = generateTrial(state.rngState, null, action.now, state.windowMs, state.config);
      return {
        state: { ...state, phase: 'playing', startedAt: action.now, trial: gen.trial, rngState: gen.rngState },
        events: [{ type: 'started' }, { type: 'trial', trial: gen.trial }],
      };
    }
    case 'respond': {
      if (state.phase !== 'playing' || !state.trial) return none(state);
      if (isOver(state, action.now)) return finish(state, action.now, []);
      if (action.now < state.trial.shownAt) return { state, events: [{ type: 'early' }] };
      if (action.now - state.trial.shownAt > state.trial.windowMs) {
        // Too late: the deadline already passed even if no tick has processed it yet.
        return resolve(state, null, action.now);
      }
      return resolve(state, action.color, action.now);
    }
    case 'tick': {
      if (state.phase !== 'playing' || !state.trial) return none(state);
      if (isOver(state, action.now)) return finish(state, action.now, []);
      if (action.now >= state.trial.shownAt + state.trial.windowMs) return resolve(state, null, action.now);
      return none(state);
    }
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export function toResult(state: ColorControlState): GameResult {
  const rs = state.responses;
  const correct = rs.filter((r) => r.correct).length;
  const total = rs.length;
  const answered = rs.filter((r) => !r.timedOut);
  const accuracy = total ? correct / total : 0;
  const avgReactionMs = answered.length ? answered.reduce((s, r) => s + r.reactionMs, 0) / answered.length : 0;
  const switchTrials = rs.filter((r) => r.trial.switched);
  const switchAcc = switchTrials.length ? switchTrials.filter((r) => r.correct).length / switchTrials.length : null;
  const durationMs = state.startedAt !== null && state.finishedAt !== null ? state.finishedAt - state.startedAt : 0;
  // 45s round: ~8 correct is weak, ~32 correct is excellent. Accuracy gates it.
  const performance = Math.round((0.5 * accuracy + 0.5 * normalise(correct, 8, 32) * accuracy) * 1000) / 1000;
  return {
    gameId: 'color-control',
    score: state.score,
    accuracy,
    avgReactionMs: Math.round(avgReactionMs),
    correct,
    total,
    performance,
    durationMs,
    extra: [
      { label: 'Rule switches', value: switchAcc === null ? '—' : `${Math.round(switchAcc * 100)}% right` },
      { label: 'Fastest window', value: `${(Math.min(...rs.map((r) => r.trial.windowMs), state.windowMs) / 1000).toFixed(2)}s` },
      { label: 'Best combo', value: `×${state.bestStreak}` },
      { label: 'Timeouts', value: String(rs.filter((r) => r.timedOut).length) },
    ],
  };
}
