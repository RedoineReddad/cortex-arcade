import { cssVars } from '../cssVars';
import type { Progress } from '../../core/progress';
import { dailyStreak } from '../../core/progress';
import type { GameId, GameMeta } from '../../core/types';

interface Props {
  games: readonly GameMeta[];
  progress: Progress;
  today: string;
  onQuickPlay: (id: GameId) => void;
  onDaily: () => void;
  onToggle: (key: 'sound' | 'haptics') => void;
}

export function Home({ games, progress, today, onQuickPlay, onDaily, onToggle }: Props) {
  const todayDaily = progress.daily.find((d) => d.date === today);
  const streak = dailyStreak(progress, today);
  const recent = progress.daily.slice(-7);

  return (
    <main className="screen home">
      <header className="brand">
        <h1>
          Cortex <span>Arcade</span>
        </h1>
        <p className="muted">Quick daily brain workouts</p>
      </header>

      <section className="card daily" aria-labelledby="daily-title">
        <div className="daily-head">
          <div>
            <h2 id="daily-title">Daily Training</h2>
            <p className="muted">
              {Math.min(3, games.length)} games · same set for everyone today
              {streak > 0 && <> · 🔥 {streak}-day streak</>}
            </p>
          </div>
          {todayDaily && (
            <div className="age-chip" title="Today's Brain Age">
              <small>Brain Age</small>
              <strong>{todayDaily.brainAge}</strong>
            </div>
          )}
        </div>
        {recent.length > 1 && (
          <ol className="age-trend" aria-label="Recent Brain Age">
            {recent.map((d) => (
              <li key={d.date} style={cssVars({ '--h': `${Math.max(8, ((80 - d.brainAge) / 60) * 100)}%` })}>
                <span>{d.brainAge}</span>
              </li>
            ))}
          </ol>
        )}
        <button className="btn primary big" onClick={onDaily}>
          {todayDaily ? 'Train again' : 'Start today’s training'}
        </button>
      </section>

      <section aria-labelledby="qp-title">
        <h2 id="qp-title" className="section-title">
          Quick Play
        </h2>
        <ul className="game-grid">
          {games.map((g) => {
            const rec = progress.games[g.id];
            return (
              <li key={g.id}>
                <button className="game-card" style={cssVars({ '--accent': g.accent })} onClick={() => onQuickPlay(g.id)}>
                  <span className="emoji" aria-hidden>
                    {g.emoji}
                  </span>
                  <span className="title">{g.title}</span>
                  <span className="tagline">{g.tagline}</span>
                  <span className="best">{rec ? `Best ${rec.bestScore.toLocaleString()}` : 'New'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="settings">
        <label>
          <input type="checkbox" checked={progress.settings.sound} onChange={() => onToggle('sound')} /> Sound
        </label>
        <label>
          <input type="checkbox" checked={progress.settings.haptics} onChange={() => onToggle('haptics')} /> Vibration
        </label>
      </footer>
    </main>
  );
}
