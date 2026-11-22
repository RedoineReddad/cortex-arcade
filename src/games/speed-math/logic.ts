/**
 * Speed Math ("Calculations x20") — pure logic. NO Phaser imports.
 *
 * 20 rapid-fire problems (+, −, ×) that get harder every 5 problems.
 * The answer auto-submits once the player has typed as many digits as the answer has,
 * so a correct answer is "just type it". Wrong answers cost a time penalty and break the combo.
 */
import { normalise } from '../../core/brainAge';
import { createRng, type Rng } from '../../core/rng';
import type { Step } from '../../core/store';
import type { GameResult } from '../../core/types';

export type Op = '+' | '−' | '×';

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
  /** Display text, e.g. "12 × 7". */
  text: string;
  tier: number;
}

export interface SpeedMathConfig {
  problemCount: number;
  /** Added to the clock for each wrong answer. */
  penaltyMs: number;
  /** Hard cap on clock time (elapsed + penalties). */
  timeLimitMs: number;
  /** Answers at or under this get the full speed bonus. */
  fastMs: number;
  /** Answers at or over this get no speed bonus. */
  slowMs: number;
  basePoints: number;
  maxSpeedBonus: number;
  /** Combo multiplier step per consecutive correct answer (after the first). */
  comboStep: number;
  comboCap: number;
  maxInputLength: number;
}

export const DEFAULT_CONFIG: SpeedMathConfig = {
  problemCount: 20,
  penaltyMs: 3000,
  timeLimitMs: 180_000,
  fastMs: 1500,
  slowMs: 6000,
  basePoints: 100,
  maxSpeedBonus: 100,
  comboStep: 0.1,
  comboCap: 10,
  maxInputLength: 4,
};

export const COMBO_MILESTONES = [5, 10, 15, 20] as const;

export interface Attempt {
  problem: Problem;
  given: number;
  correct: boolean;
  reactionMs: number;
  points: number;
}

export type Phase = 'ready' | 'playing' | 'finished';

export interface SpeedMathState {
  config: SpeedMathConfig;
  phase: Phase;
  problems: Problem[];
  index: number;
  input: string;
  startedAt: number | null;
  problemShownAt: number | null;
  finishedAt: number | null;
  finishReason: 'complete' | 'timeout' | null;
  attempts: Attempt[];
  streak: number;
  bestStreak: number;
  score: number;
  penaltyMs: number;
}

export type SpeedMathAction =
  | { type: 'start'; now: number }
  | { type: 'digit'; digit: number; now: number }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'submit'; now: number }
  | { type: 'tick'; now: number };

export type SpeedMathEvent =
  | { type: 'started' }
  | { type: 'input'; value: string }
  | { type: 'rejected' }
  | { type: 'correct'; points: number; streak: number; reactionMs: number }
  | { type: 'wrong'; expected: number; given: number; penaltyMs: number; lostStreak: number }
  | { type: 'combo'; streak: number; milestone: boolean; multiplier: number }
  | { type: 'next'; index: number; problem: Problem }
  | { type: 'finished'; reason: 'complete' | 'timeout' };

// ---------------------------------------------------------------------------
// Problem generation
// ---------------------------------------------------------------------------

/** Difficulty tier for a problem index: 0..3, one step every quarter of the round. */
export function tierFor(index: number, problemCount = DEFAULT_CONFIG.problemCount): number {
  const per = Math.max(1, Math.ceil(problemCount / 4));
  return Math.min(3, Math.floor(index / per));
}

function makeProblem(a: number, b: number, op: Op, tier: number): Problem {
  const answer = op === '+' ? a + b : op === '−' ? a - b : a * b;
  return { a, b, op, answer, text: `${a} ${op} ${b}`, tier };
}

/** Generate one problem for a tier. Subtraction never goes negative; no ×1 / ×0 / +0. */
export function generateProblem(rng: Rng, tier: number): Problem {
  const ops: Op[] = tier === 0 ? ['+', '−'] : ['+', '−', '×'];
  const op = rng.pick(ops);
  if (op === '×') {
    switch (tier) {
      case 1:
        return makeProblem(rng.int(2, 5), rng.int(2, 9), op, tier);
      case 2:
        return makeProblem(rng.int(2, 9), rng.int(3, 9), op, tier);
      default:
        return makeProblem(rng.int(3, 12), rng.int(4, 9), op, tier);
    }
  }
  let a: number;
  let b: number;
  switch (tier) {
    case 0:
      a = rng.int(2, 9);
      b = rng.int(1, 9);
      break;
    case 1:
      a = rng.int(10, 30);
      b = rng.int(2, 9);
      break;
    case 2:
      a = rng.int(12, 60);
      b = rng.int(10, 39);
      break;
    default:
      a = rng.int(25, 99);
      b = rng.int(11, 69);
  }
  if (op === '−') {
    if (b > a) [a, b] = [b, a];
    if (a === b) a += rng.int(1, 9);
  }
  return makeProblem(a, b, op, tier);
}

/** Deterministic problem list for a seed. Consecutive problems never repeat exactly. */
export function generateProblems(seed: number, count = DEFAULT_CONFIG.problemCount): Problem[] {
  const rng = createRng(seed);
  const out: Problem[] = [];
  for (let i = 0; i < count; i++) {
    const tier = tierFor(i, count);
    let p = generateProblem(rng, tier);
    for (let guard = 0; guard < 10 && out.length > 0 && out[out.length - 1].text === p.text; guard++) {
      p = generateProblem(rng, tier);
    }
    out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function comboMultiplier(streak: number, config: SpeedMathConfig = DEFAULT_CONFIG): number {
  const steps = Math.min(Math.max(streak - 1, 0), config.comboCap);
  return Math.round((1 + steps * config.comboStep) * 100) / 100;
}

export function speedBonus(reactionMs: number, config: SpeedMathConfig = DEFAULT_CONFIG): number {
  return Math.round(normalise(reactionMs, config.slowMs, config.fastMs) * config.maxSpeedBonus);
}

/** Points for a correct answer given its reaction time and the streak INCLUDING this answer. */
export function pointsFor(reactionMs: number, streak: number, config: SpeedMathConfig = DEFAULT_CONFIG): number {
  return Math.round((config.basePoints + speedBonus(reactionMs, config)) * comboMultiplier(streak, config));
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export function createInitialState(seed: number, config: Partial<SpeedMathConfig> = {}): SpeedMathState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return {
    config: cfg,
    phase: 'ready',
    problems: generateProblems(seed, cfg.problemCount),
    index: 0,
    input: '',
    startedAt: null,
    problemShownAt: null,
    finishedAt: null,
    finishReason: null,
    attempts: [],
    streak: 0,
    bestStreak: 0,
    score: 0,
    penaltyMs: 0,
  };
}

export function currentProblem(state: SpeedMathState): Problem | null {
  return state.phase === 'finished' ? null : (state.problems[state.index] ?? null);
}

/** Clock time used so far, including penalties. */
export function clockMs(state: SpeedMathState, now: number): number {
  if (state.startedAt === null) return 0;
  const end = state.finishedAt ?? now;
  return Math.max(0, end - state.startedAt) + state.penaltyMs;
}

const none = (state: SpeedMathState): Step<SpeedMathState, SpeedMathEvent> => ({ state, events: [] });

function finish(state: SpeedMathState, now: number, reason: 'complete' | 'timeout', events: SpeedMathEvent[]) {
  events.push({ type: 'finished', reason });
  return {
    state: { ...state, phase: 'finished' as const, finishedAt: now, finishReason: reason, input: '' },
    events,
  };
}

function submit(state: SpeedMathState, now: number): Step<SpeedMathState, SpeedMathEvent> {
  const problem = currentProblem(state);
  if (!problem || state.input.length === 0 || state.problemShownAt === null) return none(state);
  const given = Number(state.input);
  const reactionMs = Math.max(0, now - state.problemShownAt);
  const correct = given === problem.answer;
  const events: SpeedMathEvent[] = [];
  let { streak, bestStreak, score, penaltyMs } = state;
  let points = 0;

  if (correct) {
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    points = pointsFor(reactionMs, streak, state.config);
    score += points;
    events.push({ type: 'correct', points, streak, reactionMs });
    if (streak >= 3) {
      events.push({
        type: 'combo',
        streak,
        milestone: (COMBO_MILESTONES as readonly number[]).includes(streak),
        multiplier: comboMultiplier(streak, state.config),
      });
    }
  } else {
    penaltyMs += state.config.penaltyMs;
    events.push({ type: 'wrong', expected: problem.answer, given, penaltyMs: state.config.penaltyMs, lostStreak: streak });
    streak = 0;
  }

  const attempts = [...state.attempts, { problem, given, correct, reactionMs, points }];
  const index = state.index + 1;
  const next: SpeedMathState = { ...state, attempts, index, input: '', streak, bestStreak, score, penaltyMs, problemShownAt: now };

  if (index >= state.problems.length) return finish(next, now, 'complete', events);
  if (clockMs(next, now) >= state.config.timeLimitMs) return finish(next, now, 'timeout', events);
  events.push({ type: 'next', index, problem: state.problems[index] });
  return { state: next, events };
}

export function reduce(state: SpeedMathState, action: SpeedMathAction): Step<SpeedMathState, SpeedMathEvent> {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'ready') return none(state);
      return {
        state: { ...state, phase: 'playing', startedAt: action.now, problemShownAt: action.now },
        events: [{ type: 'started' }, { type: 'next', index: 0, problem: state.problems[0] }],
      };
    }
    case 'digit': {
      if (state.phase !== 'playing') return none(state);
      const d = Math.trunc(action.digit);
      if (d < 0 || d > 9 || state.input.length >= state.config.maxInputLength) {
        return { state, events: [{ type: 'rejected' }] };
      }
      // A leading zero is only meaningful if the answer is 0 — never the case here, but stay general.
      const input = state.input === '0' ? String(d) : state.input + String(d);
      const typed: SpeedMathState = { ...state, input };
      const problem = currentProblem(typed)!;
      const step = { state: typed, events: [{ type: 'input', value: input } as SpeedMathEvent] };
      if (input.length >= String(problem.answer).length) {
        const sub = submit(typed, action.now);
        return { state: sub.state, events: [...step.events, ...sub.events] };
      }
      return step;
    }
    case 'backspace': {
      if (state.phase !== 'playing' || state.input.length === 0) return none(state);
      const input = state.input.slice(0, -1);
      return { state: { ...state, input }, events: [{ type: 'input', value: input }] };
    }
    case 'clear': {
      if (state.phase !== 'playing' || state.input.length === 0) return none(state);
      return { state: { ...state, input: '' }, events: [{ type: 'input', value: '' }] };
    }
    case 'submit':
      if (state.phase !== 'playing') return none(state);
      return submit(state, action.now);
    case 'tick': {
      if (state.phase !== 'playing') return none(state);
      if (clockMs(state, action.now) >= state.config.timeLimitMs) return finish(state, action.now, 'timeout', []);
      return none(state);
    }
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function toResult(state: SpeedMathState): GameResult {
  const { attempts, config } = state;
  const correct = attempts.filter((a) => a.correct).length;
  const total = config.problemCount;
  const accuracy = total > 0 ? correct / total : 0;
  const avgReactionMs = attempts.length ? attempts.reduce((s, a) => s + a.reactionMs, 0) / attempts.length : 0;
  const durationMs = state.finishedAt !== null && state.startedAt !== null ? state.finishedAt - state.startedAt : 0;
  const clock = durationMs + state.penaltyMs;
  // Average clock time per problem, penalties included; 1.5s is excellent, 7s is slow.
  const perProblem = attempts.length ? clock / attempts.length : config.slowMs * 2;
  const performance = Math.round((0.6 * accuracy + 0.4 * normalise(perProblem, 7000, 1500) * accuracy) * 1000) / 1000;
  return {
    gameId: 'speed-math',
    score: state.score,
    accuracy,
    avgReactionMs: Math.round(avgReactionMs),
    correct,
    total,
    performance,
    durationMs,
    extra: [
      { label: 'Total time', value: formatSeconds(clock) },
      { label: 'Penalties', value: `+${formatSeconds(state.penaltyMs)}` },
      { label: 'Best combo', value: `×${state.bestStreak}` },
    ],
  };
}
