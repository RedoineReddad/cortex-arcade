import { useEffect, useRef, useState } from 'react';
import { gameBus } from '../bridge/gameBus';

type GameModule = typeof import('./game');
let modPromise: Promise<GameModule> | null = null;
/** Phaser is code-split: the shell paints instantly and Phaser loads in the background. */
const loadGameModule = () => (modPromise ??= import('./game'));

async function fontsReady() {
  try {
    await Promise.all([document.fonts.load('700 32px Atkinson'), document.fonts.load('400 16px Atkinson')]);
  } catch {
    /* fall back to system font */
  }
}

interface Props {
  /** True while a mini-game is on screen. */
  active: boolean;
  onQuit: () => void;
}

/**
 * Always-mounted host for the single shared Phaser.Game.
 * It never destroys the game; it only re-parents the canvas, resizes it and sleeps/wakes the loop.
 */
export function PhaserHost({ active, onQuit }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mod, setMod] = useState<GameModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = ref.current!;
    void (async () => {
      const [m] = await Promise.all([loadGameModule(), fontsReady()]);
      if (cancelled) return;
      const game = m.getGame(el);
      // If the host element was remounted, move the existing canvas instead of creating a new game.
      if (game.canvas && game.canvas.parentElement !== el) el.appendChild(game.canvas);
      setMod(m);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mod) return;
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      mod.resizeGame(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mod]);

  useEffect(() => {
    if (!mod) return;
    if (active) {
      mod.setGameAwake(true);
      return;
    }
    // Let the stop/idle switch run for a frame before sleeping the loop.
    const id = window.setTimeout(() => mod.setGameAwake(false), 120);
    return () => window.clearTimeout(id);
  }, [active, mod]);

  return (
    <div className={`phaser-layer${active ? ' is-active' : ''}`} aria-hidden={!active}>
      <div ref={ref} className="phaser-host" />
      {active && (
        <button
          className="quit-btn"
          aria-label="Quit game"
          onClick={() => {
            gameBus.emit('game:stop');
            onQuit();
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
