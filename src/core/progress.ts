/**
 * Persistent progress. Pure functions over a Storage-like object so it can be unit tested
 * without a browser. The shell passes `window.localStorage` (guarded).
 */
import type { GameId, GameResult } from './types';

export const STORAGE_KEY = 'cortex-arcade:v1';

export interface GameRecord {
  plays: number;
  bestScore: number;
  bestAccuracy: number;
  /** Lowest average reaction time seen (ms); 0 = none yet. */
  bestReactionMs: number;
  lastPlayed: string | null;
  /** Most recent scores, newest last, capped. */
  history: number[];
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  brainAge: number;
  results: { gameId: GameId; score: number; performance: number }[];
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

export interface Progress {
  version: 1;
  games: Partial<Record<GameId, GameRecord>>;
  daily: DailyRecord[];
  settings: Settings;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const HISTORY_CAP = 30;
const DAILY_CAP = 120;

export function emptyProgress(): Progress {
  return { version: 1, games: {}, daily: [], settings: { sound: true, haptics: true } };
}

export function emptyRecord(): GameRecord {
  return { plays: 0, bestScore: 0, bestAccuracy: 0, bestReactionMs: 0, lastPlayed: null, history: [] };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Parse defensively: corrupt or foreign data yields an empty progress, never a throw. */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || data.version !== 1) return emptyProgress();
    const out = emptyProgress();
    if (isObj(data.games)) {
      for (const [id, rec] of Object.entries(data.games)) {
        if (!isObj(rec)) continue;
        out.games[id as GameId] = {
          plays: num(rec.plays),
          bestScore: num(rec.bestScore),
          bestAccuracy: num(rec.bestAccuracy),
          bestReactionMs: num(rec.bestReactionMs),
          lastPlayed: typeof rec.lastPlayed === 'string' ? rec.lastPlayed : null,
          history: Array.isArray(rec.history) ? rec.history.filter((n) => typeof n === 'number').slice(-HISTORY_CAP) : [],
        };
      }
    }
    if (Array.isArray(data.daily)) {
      out.daily = data.daily
        .filter((d): d is DailyRecord => isObj(d) && typeof d.date === 'string' && typeof d.brainAge === 'number' && Array.isArray(d.results))
        .slice(-DAILY_CAP);
    }
    if (isObj(data.settings)) {
      out.settings = {
        sound: data.settings.sound !== false,
        haptics: data.settings.haptics !== false,
      };
    }
    return out;
  } catch {
    return emptyProgress();
  }
}

export function loadProgress(storage: StorageLike | null): Progress {
  if (!storage) return emptyProgress();
  try {
    return parseProgress(storage.getItem(STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(storage: StorageLike | null, progress: Progress): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Quota / private mode: progress just won't persist.
  }
}

export interface RecordOutcome {
  progress: Progress;
  newBestScore: boolean;
  previousBest: number;
}

/** Immutable: returns a new Progress with this result folded in. */
export function recordResult(progress: Progress, result: GameResult, date: string): RecordOutcome {
  const prev = progress.games[result.gameId] ?? emptyRecord();
  const newBestScore = result.score > prev.bestScore;
  const rec: GameRecord = {
    plays: prev.plays + 1,
    bestScore: Math.max(prev.bestScore, result.score),
    bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
    bestReactionMs:
      result.avgReactionMs > 0 && (prev.bestReactionMs === 0 || result.avgReactionMs < prev.bestReactionMs)
        ? Math.round(result.avgReactionMs)
        : prev.bestReactionMs,
    lastPlayed: date,
    history: [...prev.history, result.score].slice(-HISTORY_CAP),
  };
  return {
    progress: { ...progress, games: { ...progress.games, [result.gameId]: rec } },
    newBestScore,
    previousBest: prev.bestScore,
  };
}

/** Replaces any record for the same date (only the first daily of a day counts would be harsher; we keep latest). */
export function recordDaily(progress: Progress, daily: DailyRecord): Progress {
  const others = progress.daily.filter((d) => d.date !== daily.date);
  return { ...progress, daily: [...others, daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-DAILY_CAP) };
}

/** Consecutive days with a daily record, ending today or yesterday. */
export function dailyStreak(progress: Progress, today: string): number {
  const dates = new Set(progress.daily.map((d) => d.date));
  let cursor = new Date(`${today}T00:00:00Z`);
  if (!dates.has(today)) cursor = new Date(cursor.getTime() - 86_400_000);
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
