/**
 * Minimal reducer store. Logic modules expose `reduce(state, action) -> { state, events }`;
 * scenes wrap that in a Store, dispatch actions and subscribe to state + events.
 */
export interface Step<S, E> {
  state: S;
  events: E[];
}

export type Reducer<S, A, E> = (state: S, action: A) => Step<S, E>;
export type Listener<S, E> = (state: S, events: E[]) => void;

export interface Store<S, A, E> {
  getState(): S;
  dispatch(action: A): E[];
  subscribe(listener: Listener<S, E>): () => void;
}

export function createStore<S, A, E>(reducer: Reducer<S, A, E>, initial: S): Store<S, A, E> {
  let state = initial;
  const listeners = new Set<Listener<S, E>>();
  return {
    getState: () => state,
    dispatch(action) {
      const step = reducer(state, action);
      const changed = step.state !== state;
      state = step.state;
      if (changed || step.events.length > 0) {
        for (const l of [...listeners]) l(state, step.events);
      }
      return step.events;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
