import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { createStore } from '../../core/store';
import {
  DEFAULT_CONFIG,
  clockMs,
  comboMultiplier,
  createInitialState,
  currentProblem,
  generateProblem,
  generateProblems,
  pointsFor,
  reduce,
  speedBonus,
  tierFor,
  toResult,
  type SpeedMathAction,
  type SpeedMathEvent,
  type SpeedMathState,
} from './logic';

/** Type a whole number as digit actions at a given time. */
function typeNumber(state: SpeedMathState, n: number, now: number) {
  let s = state;
  const events: SpeedMathEvent[] = [];
  for (const ch of String(n)) {
    const step = reduce(s, { type: 'digit', digit: Number(ch), now });
    s = step.state;
    events.push(...step.events);
  }
  return { state: s, events };
}

function started(seed = 1, now = 0) {
  return reduce(createInitialState(seed), { type: 'start', now }).state;
}

/** A wrong answer with the same digit count as the right one, so it auto-submits. */
function wrongFor(answer: number) {
  const len = String(answer).length;
  return answer === 10 ** len - 1 ? answer - 1 : answer + 1 >= 10 ** len ? answer - 1 : answer + 1;
}

describe('problem generation', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(generateProblems(42)).toEqual(generateProblems(42));
    expect(generateProblems(42).map((p) => p.text)).not.toEqual(generateProblems(43).map((p) => p.text));
  });

  it('produces 20 problems by default with rising tiers', () => {
    const ps = generateProblems(7);
    expect(ps).toHaveLength(20);
    expect(ps.map((p) => p.tier)).toEqual([...Array(5).fill(0), ...Array(5).fill(1), ...Array(5).fill(2), ...Array(5).fill(3)]);
    expect(tierFor(0)).toBe(0);
    expect(tierFor(19)).toBe(3);
    expect(tierFor(500)).toBe(3);
  });

  it('never yields negative, trivial or inconsistent problems across many seeds', () => {
    for (let seed = 0; seed < 300; seed++) {
      const rng = createRng(seed);
      for (let tier = 0; tier < 4; tier++) {
        const p = generateProblem(rng, tier);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.a).toBeGreaterThan(0);
        expect(p.b).toBeGreaterThan(0);
        if (p.op === '−') expect(p.a).toBeGreaterThan(p.b);
        if (p.op === '×') expect(Math.min(p.a, p.b)).toBeGreaterThanOrEqual(2);
        const expected = p.op === '+' ? p.a + p.b : p.op === '−' ? p.a - p.b : p.a * p.b;
        expect(p.answer).toBe(expected);
        expect(p.text).toBe(`${p.a} ${p.op} ${p.b}`);
        expect(String(p.answer).length).toBeLessThanOrEqual(DEFAULT_CONFIG.maxInputLength);
      }
    }
  });

  it('tier 0 has no multiplication', () => {
    for (let seed = 0; seed < 200; seed++) expect(generateProblem(createRng(seed), 0).op).not.toBe('×');
  });

  it('never repeats the same problem twice in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ps = generateProblems(seed);
      for (let i = 1; i < ps.length; i++) expect(ps[i].text).not.toBe(ps[i - 1].text);
    }
  });
});

describe('scoring', () => {
  it('speed bonus is full when fast, zero when slow, linear between', () => {
    expect(speedBonus(0)).toBe(100);
    expect(speedBonus(DEFAULT_CONFIG.fastMs)).toBe(100);
    expect(speedBonus(DEFAULT_CONFIG.slowMs)).toBe(0);
    expect(speedBonus(60_000)).toBe(0);
    expect(speedBonus((DEFAULT_CONFIG.fastMs + DEFAULT_CONFIG.slowMs) / 2)).toBe(50);
  });

  it('combo multiplier starts at 1 and caps', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1.1);
    expect(comboMultiplier(11)).toBe(2);
    expect(comboMultiplier(50)).toBe(2);
  });

  it('points combine base, speed and combo', () => {
    expect(pointsFor(1000, 1)).toBe(200);
    expect(pointsFor(10_000, 1)).toBe(100);
    expect(pointsFor(1000, 3)).toBe(240);
  });
});

describe('state machine', () => {
  it('ignores input before start and after finish', () => {
    const s0 = createInitialState(1);
    expect(reduce(s0, { type: 'digit', digit: 3, now: 0 }).state).toBe(s0);
    expect(reduce(s0, { type: 'submit', now: 0 }).state).toBe(s0);
    const s1 = reduce(s0, { type: 'start', now: 0 }).state;
    expect(reduce(s1, { type: 'start', now: 5 }).state).toBe(s1);
  });

  it('auto-submits a correct answer when digit count matches and advances', () => {
    let s = started(3, 1000);
    const p = currentProblem(s)!;
    const step = typeNumber(s, p.answer, 2000);
    s = step.state;
    const types = step.events.map((e) => e.type);
    expect(types).toContain('correct');
    expect(types).toContain('next');
    expect(s.index).toBe(1);
    expect(s.input).toBe('');
    expect(s.streak).toBe(1);
    expect(s.score).toBe(pointsFor(1000, 1));
    expect(s.attempts[0]).toMatchObject({ correct: true, reactionMs: 1000, given: p.answer });
  });

  it('wrong answer adds a time penalty, resets the streak and still advances', () => {
    let s = started(5, 0);
    s = typeNumber(s, currentProblem(s)!.answer, 500).state;
    s = typeNumber(s, currentProblem(s)!.answer, 1000).state;
    expect(s.streak).toBe(2);
    const p = currentProblem(s)!;
    const step = typeNumber(s, wrongFor(p.answer), 1500);
    const wrong = step.events.find((e) => e.type === 'wrong');
    expect(wrong).toMatchObject({ type: 'wrong', expected: p.answer, lostStreak: 2, penaltyMs: 3000 });
    expect(step.state.streak).toBe(0);
    expect(step.state.bestStreak).toBe(2);
    expect(step.state.penaltyMs).toBe(3000);
    expect(step.state.index).toBe(3);
    expect(clockMs(step.state, 1500)).toBe(4500);
  });

  it('backspace and clear edit the input without submitting', () => {
    let s = started(9, 0);
    // Find a problem whose answer has >= 2 digits so the first digit does not auto-submit.
    while (String(currentProblem(s)!.answer).length < 2) s = typeNumber(s, currentProblem(s)!.answer, 0).state;
    const idx = s.index;
    s = reduce(s, { type: 'digit', digit: 1, now: 10 }).state;
    expect(s.input).toBe('1');
    s = reduce(s, { type: 'backspace' }).state;
    expect(s.input).toBe('');
    expect(reduce(s, { type: 'backspace' }).state).toBe(s);
    s = reduce(s, { type: 'digit', digit: 4, now: 10 }).state;
    s = reduce(s, { type: 'clear' }).state;
    expect(s.input).toBe('');
    expect(s.index).toBe(idx);
  });

  it('manual submit of a short answer is graded (and empty submit is ignored)', () => {
    let s = started(11, 0);
    while (String(currentProblem(s)!.answer).length < 2) s = typeNumber(s, currentProblem(s)!.answer, 0).state;
    expect(reduce(s, { type: 'submit', now: 5 }).state).toBe(s);
    s = reduce(s, { type: 'digit', digit: 0, now: 5 }).state; // a lone "0" — always wrong here
    const step = reduce(s, { type: 'submit', now: 6 });
    expect(step.events.some((e) => e.type === 'wrong')).toBe(true);
  });

  it('rejects invalid digits', () => {
    const s = started(1, 0);
    expect(reduce(s, { type: 'digit', digit: 12, now: 0 }).events).toEqual([{ type: 'rejected' }]);
    expect(reduce(s, { type: 'digit', digit: -1, now: 0 }).events).toEqual([{ type: 'rejected' }]);
  });

  it('emits combo events from a streak of 3, with milestones at 5 and 10', () => {
    let s = started(21, 0);
    const combos: SpeedMathEvent[] = [];
    for (let i = 0; i < 10; i++) {
      const step = typeNumber(s, currentProblem(s)!.answer, (i + 1) * 1000);
      s = step.state;
      combos.push(...step.events.filter((e) => e.type === 'combo'));
    }
    expect(combos.map((c) => (c.type === 'combo' ? c.streak : 0))).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(combos.filter((c) => c.type === 'combo' && c.milestone).map((c) => (c.type === 'combo' ? c.streak : 0))).toEqual([5, 10]);
  });

  it('finishes after all problems with a perfect result', () => {
    const store = createStore(reduce, createInitialState(77));
    store.dispatch({ type: 'start', now: 0 });
    let t = 0;
    const seen: string[] = [];
    store.subscribe((_s, ev) => seen.push(...ev.map((e) => e.type)));
    while (store.getState().phase === 'playing') {
      t += 1000;
      for (const ch of String(currentProblem(store.getState())!.answer)) {
        store.dispatch({ type: 'digit', digit: Number(ch), now: t } as SpeedMathAction);
      }
    }
    const s = store.getState();
    expect(s.phase).toBe('finished');
    expect(s.finishReason).toBe('complete');
    expect(seen.filter((e) => e === 'finished')).toHaveLength(1);
    const r = toResult(s);
    expect(r).toMatchObject({ gameId: 'speed-math', correct: 20, total: 20, accuracy: 1, avgReactionMs: 1000 });
    expect(r.durationMs).toBe(20_000);
    expect(r.performance).toBeGreaterThan(0.9);
    expect(r.performance).toBeLessThanOrEqual(1);
    expect(r.extra.find((x) => x.label === 'Best combo')?.value).toBe('×20');
  });

  it('times out on tick once clock + penalties exceed the limit', () => {
    let s = reduce(createInitialState(1, { timeLimitMs: 10_000 }), { type: 'start', now: 0 }).state;
    s = typeNumber(s, wrongFor(currentProblem(s)!.answer), 1000).state; // +3s
    expect(reduce(s, { type: 'tick', now: 6000 }).state.phase).toBe('playing');
    const step = reduce(s, { type: 'tick', now: 7000 });
    expect(step.state.phase).toBe('finished');
    expect(step.state.finishReason).toBe('timeout');
    expect(step.events).toEqual([{ type: 'finished', reason: 'timeout' }]);
    const r = toResult(step.state);
    expect(r.total).toBe(20);
    expect(r.correct).toBe(0);
    expect(r.accuracy).toBe(0);
    expect(r.performance).toBe(0);
  });

  it('a slow, sloppy run scores lower performance than a fast clean one', () => {
    const run = (ms: number, wrongEvery: number) => {
      let s = started(5, 0);
      let t = 0;
      let i = 0;
      while (s.phase === 'playing') {
        t += ms;
        const a = currentProblem(s)!.answer;
        s = typeNumber(s, i % wrongEvery === wrongEvery - 1 ? wrongFor(a) : a, t).state;
        i++;
      }
      return toResult(s).performance;
    };
    expect(run(1200, 1000)).toBeGreaterThan(run(4000, 4));
  });
});
