import { cssVars } from '../cssVars';
import { getMeta } from '../../games/registry';
import type { GameResult } from '../../core/types';

interface Props {
  brainAge: number;
  previous: number | null;
  results: GameResult[];
  streak: number;
  onMenu: () => void;
}

function verdict(age: number) {
  if (age <= 25) return 'Razor sharp. Outstanding work!';
  if (age <= 35) return 'Quick and accurate. Great session.';
  if (age <= 50) return 'Solid. Keep training daily to push it lower.';
  return 'Warm-up done. Come back tomorrow and beat it!';
}

export function DailySummary({ brainAge, previous, results, streak, onMenu }: Props) {
  const delta = previous === null ? null : brainAge - previous;
  return (
    <main className="screen summary">
      <p className="step">Daily Training complete</p>
      <div className="brain-age">
        <small>Your Brain Age</small>
        <strong>{brainAge}</strong>
        {delta !== null && delta !== 0 && (
          <span className={`badge ${delta < 0 ? 'good' : 'bad'}`}>
            {delta < 0 ? `▼ ${-delta} younger` : `▲ ${delta} older`} than last time
          </span>
        )}
        <p className="lead">{verdict(brainAge)}</p>
        {streak > 1 && <p className="muted">🔥 {streak}-day streak</p>}
      </div>
      <ul className="summary-list">
        {results.map((r) => {
          const m = getMeta(r.gameId);
          return (
            <li key={r.gameId} style={cssVars({ '--accent': m.accent })}>
              <span className="emoji" aria-hidden>
                {m.emoji}
              </span>
              <span className="name">{m.title}</span>
              <span className="muted">
                {Math.round(r.accuracy * 100)}% · {r.avgReactionMs ? `${r.avgReactionMs} ms` : '—'}
              </span>
              <strong>{r.score.toLocaleString()}</strong>
            </li>
          );
        })}
      </ul>
      <div className="actions">
        <button className="btn primary big" onClick={onMenu}>
          Done
        </button>
      </div>
    </main>
  );
}
