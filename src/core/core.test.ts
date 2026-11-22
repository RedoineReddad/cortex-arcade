import { describe, expect, it, vi } from 'vitest';
import { createBus } from '../bridge/gameBus';
import { brainAgeFromPerformances, normalise } from './brainAge';
import {
  STORAGE_KEY,
  dailyStreak,
  emptyProgress,
  loadProgress,
  parseProgress,
  recordDaily,
  recordResult,
  saveProgress,
} from './progress';
import { createRng, hashString } from './rng';
import { createStore } from './store';
import type { GameResult } from './types';

const result = (over: Partial<GameResult> = {}): GameResult => ({
  gameId: 'speed-math',
  score: 1000,
  accuracy: 0.9,
  avgReactionMs: 1500,
  correct: 18,
  total: 20,
  performance: 0.7,
  durationMs: 30_000,
  extra: [],
  ...over,
});

describe('rng', () => {
  it('is deterministic and resumable from state', () => {
    const a = createRng(5);
    const b = createRng(5);
    const seqA = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(seqA);
    const c = createRng(5);
    c.next();
    const resumed = createRng(c.state);
    expect(resumed.next()).toBe(seqA[1]);
  });

  it('int stays in range and covers it', () => {
    const r = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const n = r.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect(seen.size).toBe(4);
    expect(() => r.int(5, 1)).toThrow();
    expect(() => r.pick([])).toThrow();
  });

  it('shuffle keeps elements', () => {
    expect(createRng(2).shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('hashString is stable', () => {
    expect(hashString('2026-11-22')).toBe(hashString('2026-11-22'));
    expect(hashString('2026-11-22')).not.toBe(hashString('2026-11-23'));
  });
});

describe('store', () => {
  it('notifies on change or events only', () => {
    const store = createStore((s: number, a: number) => (a === 0 ? { state: s, events: [] } : { state: s + a, events: ['added'] }), 0);
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    store.dispatch(0);
    expect(fn).not.toHaveBeenCalled();
    store.dispatch(2);
    expect(fn).toHaveBeenCalledWith(2, ['added']);
    unsub();
    store.dispatch(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(store.getState()).toBe(3);
  });
});

describe('gameBus', () => {
  it('routes typed events, supports once/off and isolates throwing handlers', () => {
    const bus = createBus();
    const got: number[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.on('game:start', () => {
      throw new Error('boom');
    });
    const off = bus.on('game:start', (p) => got.push(p.seed));
    bus.once('game:start', (p) => got.push(p.seed * 10));
    bus.emit('game:start', { gameId: 'speed-math', seed: 1 });
    bus.emit('game:start', { gameId: 'speed-math', seed: 2 });
    off();
    bus.emit('game:start', { gameId: 'speed-math', seed: 3 });
    expect(got).toEqual([1, 10, 2]);
    expect(err).toHaveBeenCalled();
    const stop = vi.fn();
    bus.on('game:stop', stop);
    bus.emit('game:stop');
    expect(stop).toHaveBeenCalledOnce();
    err.mockRestore();
  });
});

describe('brain age', () => {
  it('maps performance to 20..80 with lower being better', () => {
    expect(brainAgeFromPerformances([1, 1])).toBe(20);
    expect(brainAgeFromPerformances([0])).toBe(80);
    expect(brainAgeFromPerformances([])).toBe(80);
    expect(brainAgeFromPerformances([NaN, 2, -1])).toBeGreaterThanOrEqual(20);
    const mid = brainAgeFromPerformances([0.5]);
    expect(mid).toBeGreaterThan(20);
    expect(mid).toBeLessThan(50);
    expect(brainAgeFromPerformances([0.8])).toBeLessThan(brainAgeFromPerformances([0.6]));
  });

  it('normalise handles both directions and degenerate ranges', () => {
    expect(normalise(5, 0, 10)).toBe(0.5);
    expect(normalise(2000, 6000, 1500)).toBeCloseTo(0.889, 2);
    expect(normalise(-5, 0, 10)).toBe(0);
    expect(normalise(5, 5, 5)).toBe(1);
  });
});

describe('progress', () => {
  it('records bests immutably', () => {
    const p0 = emptyProgress();
    const a = recordResult(p0, result({ score: 1000, avgReactionMs: 1500 }), '2026-11-20');
    expect(a.newBestScore).toBe(true);
    expect(p0.games['speed-math']).toBeUndefined();
    const b = recordResult(a.progress, result({ score: 800, avgReactionMs: 1200, accuracy: 1 }), '2026-11-21');
    expect(b.newBestScore).toBe(false);
    expect(b.previousBest).toBe(1000);
    expect(b.progress.games['speed-math']).toMatchObject({
      plays: 2,
      bestScore: 1000,
      bestAccuracy: 1,
      bestReactionMs: 1200,
      lastPlayed: '2026-11-21',
      history: [1000, 800],
    });
  });

  it('survives corrupt storage and round-trips', () => {
    expect(parseProgress('{nope')).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ version: 99 }))).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ version: 1, games: { 'speed-math': { plays: 'x', history: [1, 'a', 2] } } })).games['speed-math'])
      .toMatchObject({ plays: 0, history: [1, 2] });
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const p = recordResult(emptyProgress(), result(), '2026-11-22').progress;
    saveProgress(storage, p);
    expect(mem.has(STORAGE_KEY)).toBe(true);
    expect(loadProgress(storage)).toEqual(p);
    expect(loadProgress(null)).toEqual(emptyProgress());
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
    expect(loadProgress(throwing)).toEqual(emptyProgress());
    expect(() => saveProgress(throwing, p)).not.toThrow();
  });

  it('daily streak counts consecutive days ending today or yesterday', () => {
    let p = emptyProgress();
    for (const date of ['2026-11-18', '2026-11-20', '2026-11-21', '2026-11-22']) {
      p = recordDaily(p, { date, brainAge: 40, results: [] });
    }
    expect(dailyStreak(p, '2026-11-22')).toBe(3);
    expect(dailyStreak(p, '2026-11-23')).toBe(3);
    expect(dailyStreak(p, '2026-11-25')).toBe(0);
    p = recordDaily(p, { date: '2026-11-22', brainAge: 30, results: [] });
    expect(p.daily.filter((d) => d.date === '2026-11-22')).toHaveLength(1);
    expect(p.daily.at(-1)?.brainAge).toBe(30);
  });
});
