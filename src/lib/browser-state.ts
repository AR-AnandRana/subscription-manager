'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * Hooks for values that live in the browser rather than in React.
 *
 * These are read through `useSyncExternalStore` rather than an effect: the
 * server has no localStorage and no colour-scheme preference, so the value has
 * to come from a snapshot that differs between server and client, and this is
 * the API built for exactly that.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribeToStorage(listener: () => void) {
  listeners.add(listener);
  // `storage` only fires for *other* tabs, so writes in this tab notify via emit().
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** A string preference persisted in localStorage, shared across components. */
export function useLocalStorageState<T extends string>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribeToStorage,
    () => {
      try {
        return ((localStorage.getItem(key) as T | null) ?? fallback) as T;
      } catch {
        // Private windows and blocked site data throw on access.
        return fallback;
      }
    },
    () => fallback,
  );

  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Nothing to do; the value simply will not persist.
      }
      emit();
    },
    [key],
  );

  return [value, setValue];
}

function subscribeToColorScheme(listener: () => void) {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Whether the OS asks for a dark colour scheme. */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
}

/**
 * Editable copies of server rows that reset whenever the server data changes.
 *
 * The settings lists let you type into several rows before saving, so they need
 * local state, but a refresh after saving must replace it. This is React's
 * documented "adjust state during render" pattern: cheaper than an effect,
 * because the stale render is thrown away before it reaches the DOM.
 */
export function useDraftList<T>(source: T[]): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [drafts, setDrafts] = useState(source);
  const [lastSource, setLastSource] = useState(source);

  if (lastSource !== source) {
    setLastSource(source);
    setDrafts(source);
  }

  return [drafts, setDrafts];
}
