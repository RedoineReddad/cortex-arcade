import { cssVars } from '../cssVars';
import type { GameMeta, GameResult } from '../../core/types';
import { Stat } from '../components/Stat';

interface Props {
  meta: GameMeta;
  result: GameResult;
  newBest: boolean;
  previousBest: number;
  /** Daily Training: label for the next-step button. */
  nextLabel?: string;
  onNext?: () => void;
  onReplay?: () => void;
  onMenu: () => void;
}

export function Results({ meta, result, newBest, previousBest, nextLabel, onNext, onReplay, onMenu }: Props) {
  return (
    <main className="screen results" style={cssVars({ '--accent': meta.accent })}>
      <p className="step">
        {meta.emoji} {meta.title}
      </p>
      <div className="score-hero">
        <small>Score</small>
        <strong className="score">{result.score.toLocaleString()}</strong>
        {newBest ? (
          <span className="badge gold">★ New best!</span>
        ) : previousBest > 0 ? (
          <span className="muted">Best {previousBest.toLocaleString()}</span>
        ) : null}
      </div>

      <div className="stat-grid">
        <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} sub={`${result.correct} / ${result.total}`} />
        <Stat label="Avg reaction" value={result.avgReactionMs ? `${result.avgReactionMs.toLocaleString()} ms` : '—'} />
        {result.extra.map((x) => (
          <Stat key={x.label} label={x.label} value={x.value} small />
        ))}
      </div>

      <div className="actions">
        {onNext && (
          <button className="btn primary big" onClick={onNext}>
            {nextLabel ?? 'Next'}
          </button>
        )}
        {onReplay && (
          <button className="btn primary big" onClick={onReplay}>
            Play again
          </button>
        )}
        <button className="btn ghost" onClick={onMenu}>
          Menu
        </button>
      </div>
    </main>
  );
}
