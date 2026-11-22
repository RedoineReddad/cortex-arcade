/**
 * Typed event bridge between the React shell and Phaser scenes.
 * Deliberately has NO Phaser import so React can use it without pulling Phaser in.
 */
import type { GameId, GameResult } from '../core/types';

export interface GameStartPayload {
  gameId: GameId;
  seed: number;
}

export interface GameBusEvents {
  /** Shell -> Phaser: start (or restart) a mini-game scene. */
  'game:start': GameStartPayload;
  /** Shell -> Phaser: abandon the running mini-game and return to idle. */
  'game:stop': void;
  /** Phaser -> Shell: the Phaser.Game has booted and can accept game:start. */
  'host:ready': void;
  /** Phaser -> Shell: a scene has created its display and is about to count down. */
  'game:ready': { gameId: GameId };
  /** Phaser -> Shell: a round finished. */
  'game:complete': GameResult;
}

export type GameBusEvent = keyof GameBusEvents;
type Handler<K extends GameBusEvent> = GameBusEvents[K] extends void
  ? () => void
  : (payload: GameBusEvents[K]) => void;

type Args<K extends GameBusEvent> = GameBusEvents[K] extends void ? [] : [GameBusEvents[K]];

export interface TypedBus {
  on<K extends GameBusEvent>(event: K, handler: Handler<K>): () => void;
  once<K extends GameBusEvent>(event: K, handler: Handler<K>): () => void;
  off<K extends GameBusEvent>(event: K, handler: Handler<K>): void;
  emit<K extends GameBusEvent>(event: K, ...args: Args<K>): void;
  /** Remove every listener (tests only). */
  clear(): void;
}

export function createBus(): TypedBus {
  const map = new Map<GameBusEvent, Set<(...a: unknown[]) => void>>();
  const bus: TypedBus = {
    on(event, handler) {
      let set = map.get(event);
      if (!set) map.set(event, (set = new Set()));
      set.add(handler as (...a: unknown[]) => void);
      return () => bus.off(event, handler);
    },
    once(event, handler) {
      const wrapped = ((...a: unknown[]) => {
        bus.off(event, wrapped as Handler<typeof event>);
        (handler as (...a: unknown[]) => void)(...a);
      }) as Handler<typeof event>;
      return bus.on(event, wrapped);
    },
    off(event, handler) {
      map.get(event)?.delete(handler as (...a: unknown[]) => void);
    },
    emit(event, ...args) {
      const set = map.get(event);
      if (!set) return;
      for (const h of [...set]) {
        try {
          h(...args);
        } catch (err) {
          console.error(`[gameBus] handler for "${event}" threw`, err);
        }
      }
    },
    clear() {
      map.clear();
    },
  };
  return bus;
}

/** The app-wide bus. */
export const gameBus = createBus();
