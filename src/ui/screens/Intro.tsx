import { cssVars } from '../cssVars';
import type { GameRecord } from '../../core/progress';
import type { GameMeta } from '../../core/types';

interface Props {
  meta: GameMeta;
  record?: GameRecord;
  /** e.g. "Game 2 of 3" in Daily Training. */
  step?: string;
  loading: boolean;
  onPlay: () => void;
  onBack: () => void;
}

export function Intro({ meta, record, step, loading, onPlay, onBack }: Props) {
  return (
    <main className="screen intro" style={cssVars({ '--accent': meta.accent })}>
      <button className="back" onClick={onBack} aria-label="Back to menu">
        ← Menu
      </button>
      {step && <p className="step">{step}</p>}
      <div className="intro-hero">
        <span className="emoji big" aria-hidden>
          {meta.emoji}
        </span>
        <h1>{meta.title}</h1>
        <p className="tagline">{meta.tagline}</p>
      </div>
      <p className="lead">{meta.description}</p>
      <ol className="howto">
        {meta.howTo.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      {record && (
        <p className="muted record">
          Best {record.bestScore.toLocaleString()} · played {record.plays}×
        </p>
      )}
      <button className="btn primary big" onClick={onPlay} disabled={loading}>
        {loading ? 'Loading…' : 'Play'}
      </button>
    </main>
  );
}
