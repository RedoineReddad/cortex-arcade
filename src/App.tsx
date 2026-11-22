import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { unlockAudio } from './audio/sfx';
import { gameBus } from './bridge/gameBus';
import { brainAge } from './core/brainAge';
import { dailyPlan, freshSeed } from './core/daily';
import { dailyStreak, localDateKey, recordDaily, recordResult } from './core/progress';
import type { GameId, GameResult } from './core/types';
import { GAME_METAS, getMeta } from './games/registry';
import { PhaserHost } from './phaser/PhaserHost';
import { DailySummary } from './ui/screens/DailySummary';
import { Home } from './ui/screens/Home';
import { Intro } from './ui/screens/Intro';
import { Results } from './ui/screens/Results';
import { useProgress } from './ui/useProgress';

type Mode = { kind: 'quick' } | { kind: 'daily'; plan: { gameId: GameId; seed: number }[]; index: number; results: GameResult[] };

type Route =
  | { name: 'home' }
  | { name: 'intro'; gameId: GameId; seed: number; mode: Mode }
  | { name: 'playing'; gameId: GameId; seed: number; mode: Mode; runId: number }
  | { name: 'results'; result: GameResult; newBest: boolean; previousBest: number; mode: Mode }
  | { name: 'daily-summary'; results: GameResult[]; brainAge: number; previous: number | null };

let runCounter = 0;

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [progress, updateProgress] = useProgress();
  const [hostReady, setHostReady] = useState(false);
  const today = useMemo(() => localDateKey(new Date()), []);
  const startedRun = useRef<number | null>(null);

  useEffect(() => gameBus.on('host:ready', () => setHostReady(true)), []);

  // Start the Phaser scene once we're on the playing route and the game has booted.
  useEffect(() => {
    if (route.name !== 'playing' || !hostReady || startedRun.current === route.runId) return;
    startedRun.current = route.runId;
    gameBus.emit('game:start', { gameId: route.gameId, seed: route.seed });
  }, [route, hostReady]);

  // A finished round comes back through the bus.
  const routeRef = useRef(route);
  routeRef.current = route;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  useEffect(
    () =>
      gameBus.on('game:complete', (result) => {
        const r = routeRef.current;
        if (r.name !== 'playing' || r.gameId !== result.gameId) return;
        const { newBestScore, previousBest } = recordResult(progressRef.current, result, today);
        updateProgress((p) => recordResult(p, result, today).progress);
        gameBus.emit('game:stop');
        const mode: Mode = r.mode.kind === 'daily' ? { ...r.mode, results: [...r.mode.results, result] } : r.mode;
        setRoute({ name: 'results', result, mode, newBest: newBestScore, previousBest });
      }),
    [today, updateProgress],
  );

  const goHome = useCallback(() => setRoute({ name: 'home' }), []);

  const play = useCallback((gameId: GameId, seed: number, mode: Mode) => {
    unlockAudio();
    setRoute({ name: 'playing', gameId, seed, mode, runId: ++runCounter });
  }, []);

  const startDaily = useCallback(() => {
    const plan = dailyPlan(today, GAME_METAS.map((g) => g.id));
    setRoute({ name: 'intro', gameId: plan[0].gameId, seed: plan[0].seed, mode: { kind: 'daily', plan, index: 0, results: [] } });
  }, [today]);

  const finishDaily = useCallback(
    (results: GameResult[]) => {
      const age = brainAge(results);
      const prior = progress.daily.filter((d) => d.date !== today).at(-1);
      updateProgress((p) =>
        recordDaily(p, { date: today, brainAge: age, results: results.map((r) => ({ gameId: r.gameId, score: r.score, performance: r.performance })) }),
      );
      setRoute({ name: 'daily-summary', results, brainAge: age, previous: prior?.brainAge ?? null });
    },
    [progress.daily, today, updateProgress],
  );

  let screen: ReactNode = null;
  switch (route.name) {
    case 'home':
      screen = (
        <Home
          games={GAME_METAS}
          progress={progress}
          today={today}
          onDaily={startDaily}
          onQuickPlay={(id) => setRoute({ name: 'intro', gameId: id, seed: freshSeed(), mode: { kind: 'quick' } })}
          onToggle={(key) => updateProgress((p) => ({ ...p, settings: { ...p.settings, [key]: !p.settings[key] } }))}
        />
      );
      break;
    case 'intro': {
      const { mode } = route;
      screen = (
        <Intro
          meta={getMeta(route.gameId)}
          record={progress.games[route.gameId]}
          step={mode.kind === 'daily' ? `Daily Training · game ${mode.index + 1} of ${mode.plan.length}` : undefined}
          loading={!hostReady}
          onBack={goHome}
          onPlay={() => play(route.gameId, route.seed, mode)}
        />
      );
      break;
    }
    case 'results': {
      const { mode, result } = route;
      const meta = getMeta(result.gameId);
      if (mode.kind === 'daily') {
        const nextIndex = mode.index + 1;
        const next = mode.plan[nextIndex];
        screen = (
          <Results
            meta={meta}
            result={result}
            newBest={route.newBest}
            previousBest={route.previousBest}
            nextLabel={next ? `Next: ${getMeta(next.gameId).title}` : 'See your Brain Age'}
            onNext={() =>
              next
                ? setRoute({ name: 'intro', gameId: next.gameId, seed: next.seed, mode: { ...mode, index: nextIndex } })
                : finishDaily(mode.results)
            }
            onMenu={goHome}
          />
        );
      } else {
        screen = (
          <Results
            meta={meta}
            result={result}
            newBest={route.newBest}
            previousBest={route.previousBest}
            onReplay={() => play(result.gameId, freshSeed(), mode)}
            onMenu={goHome}
          />
        );
      }
      break;
    }
    case 'daily-summary':
      screen = (
        <DailySummary
          brainAge={route.brainAge}
          previous={route.previous}
          results={route.results}
          streak={dailyStreak(progress, today)}
          onMenu={goHome}
        />
      );
      break;
    case 'playing':
      screen = null;
      break;
  }

  return (
    <div className="app">
      {screen}
      <PhaserHost active={route.name === 'playing'} onQuit={goHome} />
    </div>
  );
}
