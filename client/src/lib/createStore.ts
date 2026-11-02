import { useRef, useSyncExternalStore } from "react";

/**
 * A ~30-line Redux-style store. Any pure reducer can be hosted here, which is how
 * the cart reducer stays framework-free while still driving React components.
 */
export interface Store<S, A> {
  getState(): S;
  dispatch(action: A): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S, A>(reducer: (state: S, action: A) => S, initialState: S): Store<S, A> {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return; // reducers return the same reference for no-ops
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function shallowArrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
}

/** Subscribe to a slice. Re-renders only when the selected value changes. */
export function useStore<S, T>(
  store: Store<S, never>,
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const cache = useRef<{ state: S; selector: (state: S) => T; value: T } | null>(null);

  const getSnapshot = () => {
    const state = store.getState();
    const prev = cache.current;
    if (prev && prev.state === state && prev.selector === selector) return prev.value;
    const value = selector(state);
    if (prev && isEqual(prev.value, value)) {
      cache.current = { state, selector, value: prev.value };
      return prev.value;
    }
    cache.current = { state, selector, value };
    return value;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
