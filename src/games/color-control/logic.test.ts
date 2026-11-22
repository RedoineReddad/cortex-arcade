import { describe, expect, it } from 'vitest';
import {
  COLORS,
  DEFAULT_CONFIG,
  answerFor,
  comboMultiplier,
  createInitialState,
  generateTrial,
  nextWindow,
  pointsFor,
  reduce,
  switchChance,
  timeLeftMs,
  toResult,
  windowLeft,
  type ColorControlState,
  type StroopColor,
  type Trial,
} from './logic';

const other = (c: StroopColor): StroopColor => COLORS.find((x) => x !== c)!;

function startedAt(seed: number, now = 0, cfg = {}) {
  return reduce(createInitialState(seed, cfg), { type: 'start', now });
}

/** Answer the current trial `delay` ms after it becomes answerable. */
function answer(s: ColorControlState, correct: boolean, delay = 400) {
  const t = s.trial!;
  return reduce(s, { type: 'respond', color: correct ? t.answer : other(t.answer), now: t.shownAt + delay });
}

describe('trial generation', () => {
  it('ink never matches the word, the answer follows the rule, and pairs never repeat back-to-back', () => {
    let prev: Trial | null = null;
    let rng = 123;
    for (let i = 0; i < 2000; i++) {
      const g: { trial: Trial; rngState: number } = generateTrial(rng, prev, i * 1000, 2000);
      const t = g.trial;
      expect(t.ink).not.toBe(t.word);
      expect(t.answer).toBe(t.rule === 'ink' ? t.ink : t.word);
      expect(t.index).toBe(i);
      if (prev) {
        expect(t.word === prev.word && t.ink === prev.ink).toBe(false);
        expect(t.switched).toBe(t.rule !== prev.rule);
      }
      prev = t;
      rng = g.rngState;
    }
  });

  it('first trial is always INK and not a switch', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { trial } = generateTrial(seed, null, 0, 3000);
      expect(trial.rule).toBe('ink');
      expect(trial.switched).toBe(false);
    }
  });

  it('is deterministic from rng state', () => {
    expect(generateTrial(99, null, 0, 3000)).toEqual(generateTrial(99, null, 0, 3000));
  });

  it('switch chance ramps up and caps', () => {
    expect(switchChance(0)).toBeCloseTo(0.2);
    expect(switchChance(10)).toBeGreaterThan(switchChance(5));
    expect(switchChance(10_000)).toBe(DEFAULT_CONFIG.maxSwitchChance);
  });

  it('both rules show up over a long run', () => {
    let prev: Trial | null = null;
    let rng = 5;
    const rules = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const g: { trial: Trial; rngState: number } = generateTrial(rng, prev, 0, 2000);
      rules.add(g.trial.rule);
      prev = g.trial;
      rng = g.rngState;
    }
    expect(rules).toEqual(new Set(['ink', 'word']));
  });

  it('answerFor', () => {
    expect(answerFor('red', 'blue', 'ink')).toBe('blue');
    expect(answerFor('red', 'blue', 'word')).toBe('red');
  });
});

describe('speed and scoring', () => {
  it('window shrinks on correct, relaxes on miss, and stays clamped', () => {
    expect(nextWindow(3000, true)).toBe(2820);
    expect(nextWindow(2000, false)).toBe(2160);
    expect(nextWindow(3000, false)).toBe(3000);
    expect(nextWindow(900, true)).toBe(900);
  });

  it('points reward answering early in the window and streaks', () => {
    expect(pointsFor(0, 2000, 1)).toBe(200);
    expect(pointsFor(1000, 2000, 1)).toBe(150);
    expect(pointsFor(5000, 2000, 1)).toBe(100);
    expect(pointsFor(0, 2000, 6)).toBe(300);
    expect(comboMultiplier(100)).toBe(2);
  });
});

describe('state machine', () => {
  it('start creates the first trial at the start time', () => {
    const step = startedAt(1, 1000);
    expect(step.state.phase).toBe('playing');
    expect(step.state.trial?.shownAt).toBe(1000);
    expect(step.events.map((e) => e.type)).toEqual(['started', 'trial']);
    expect(timeLeftMs(step.state, 11_000)).toBe(35_000);
  });

  it('correct answers build a streak, speed up, and queue the next trial after the gap', () => {
    let s = startedAt(2).state;
    const first = s.trial!;
    const step = answer(s, true, 500);
    s = step.state;
    expect(step.events.map((e) => e.type)).toEqual(['correct', 'speed', 'trial']);
    expect(s.streak).toBe(1);
    expect(s.windowMs).toBeLessThan(DEFAULT_CONFIG.startWindowMs);
    expect(s.trial!.shownAt).toBe(first.shownAt + 500 + DEFAULT_CONFIG.gapMs);
    expect(s.trial!.windowMs).toBe(s.windowMs);
    expect(s.score).toBe(pointsFor(500, first.windowMs, 1));
  });

  it('wrong answers reset the streak and use a longer gap', () => {
    let s = startedAt(3).state;
    s = answer(s, true).state;
    s = answer(s, true).state;
    const t = s.trial!;
    const step = answer(s, false, 300);
    expect(step.events[0]).toMatchObject({ type: 'wrong', expected: t.answer, lostStreak: 2 });
    expect(step.state.streak).toBe(0);
    expect(step.state.bestStreak).toBe(2);
    expect(step.state.trial!.shownAt).toBe(t.shownAt + 300 + DEFAULT_CONFIG.missGapMs);
  });

  it('responses during the inter-trial gap are ignored as early', () => {
    let s = startedAt(4).state;
    s = answer(s, true, 200).state;
    const step = reduce(s, { type: 'respond', color: s.trial!.answer, now: s.trial!.shownAt - 10 });
    expect(step.state).toBe(s);
    expect(step.events).toEqual([{ type: 'early' }]);
  });

  it('tick past the window times out (timed from the deadline, not the late tick)', () => {
    const s = startedAt(5).state;
    const t = s.trial!;
    expect(reduce(s, { type: 'tick', now: t.shownAt + t.windowMs - 1 }).events).toEqual([]);
    const step = reduce(s, { type: 'tick', now: t.shownAt + t.windowMs + 400 });
    expect(step.events[0]).toMatchObject({ type: 'timeout', expected: t.answer });
    expect(step.state.trial!.shownAt).toBe(t.shownAt + t.windowMs + DEFAULT_CONFIG.missGapMs);
    expect(step.state.responses[0]).toMatchObject({ timedOut: true, given: null, reactionMs: t.windowMs });
  });

  it('a late tap (after the deadline, before a tick) counts as a timeout, not a hit', () => {
    const s = startedAt(6).state;
    const t = s.trial!;
    const step = reduce(s, { type: 'respond', color: t.answer, now: t.shownAt + t.windowMs + 5 });
    expect(step.events[0].type).toBe('timeout');
    expect(step.state.score).toBe(0);
  });

  it('windowLeft goes 1 -> 0 across the window', () => {
    const s = startedAt(7).state;
    const t = s.trial!;
    expect(windowLeft(s, t.shownAt)).toBe(1);
    expect(windowLeft(s, t.shownAt + t.windowMs / 2)).toBeCloseTo(0.5);
    expect(windowLeft(s, t.shownAt + t.windowMs * 2)).toBe(0);
  });

  it('finishes when the duration elapses and ignores further input', () => {
    let s = startedAt(8, 0, { durationMs: 5000 }).state;
    s = answer(s, true).state;
    const step = reduce(s, { type: 'tick', now: 6000 });
    expect(step.state.phase).toBe('finished');
    expect(step.state.finishedAt).toBe(5000);
    expect(step.events).toEqual([{ type: 'finished' }]);
    expect(reduce(step.state, { type: 'respond', color: 'red', now: 6100 }).state).toBe(step.state);
    // A respond arriving after the end also finishes rather than scoring.
    const late = reduce(s, { type: 'respond', color: s.trial!.answer, now: 5001 });
    expect(late.state.phase).toBe('finished');
    expect(late.state.score).toBe(s.score);
  });

  it('a full perfect run reaches the minimum window and a high performance', () => {
    let s = startedAt(9).state;
    while (s.phase === 'playing') {
      const t = s.trial!;
      const now = t.shownAt + 350;
      s = now - s.startedAt! >= s.config.durationMs ? reduce(s, { type: 'tick', now }).state : answer(s, true, 350).state;
    }
    const r = toResult(s);
    expect(r.accuracy).toBe(1);
    expect(r.avgReactionMs).toBe(350);
    expect(r.correct).toBeGreaterThan(40);
    expect(s.windowMs).toBe(DEFAULT_CONFIG.minWindowMs);
    expect(r.performance).toBe(1);
    expect(r.durationMs).toBe(DEFAULT_CONFIG.durationMs);
    expect(r.extra.find((x) => x.label === 'Fastest window')?.value).toBe('0.90s');
  });

  it('empty result is safe', () => {
    const r = toResult(createInitialState(1));
    expect(r).toMatchObject({ accuracy: 0, avgReactionMs: 0, correct: 0, total: 0, performance: 0, score: 0 });
    expect(r.extra.find((x) => x.label === 'Rule switches')?.value).toBe('—');
  });

  it('timeouts are excluded from average reaction time', () => {
    let s = startedAt(10).state;
    s = answer(s, true, 600).state;
    const t = s.trial!;
    s = reduce(s, { type: 'tick', now: t.shownAt + t.windowMs }).state;
    const r = toResult(s);
    expect(r.total).toBe(2);
    expect(r.correct).toBe(1);
    expect(r.avgReactionMs).toBe(600);
    expect(r.accuracy).toBe(0.5);
  });
});
