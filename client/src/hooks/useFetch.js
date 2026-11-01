import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small data-fetching hook with loading/error state and a manual reload.
 * `fn` should be stable (wrap in useCallback) or pass `deps`.
 */
export function useFetch(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(signal);
      setData(result);
      return result;
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!immediate) return undefined;
    const controller = new AbortController();
    run(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { data, loading, error, reload: run, setData };
}

/** Debounce a rapidly changing value (e.g. a search box). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
