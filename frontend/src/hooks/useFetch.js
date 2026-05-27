import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook genérico para llamadas async con estado de loading/error
 * y posibilidad de refetch. Cancela actualizaciones en componentes desmontados.
 */
export function useFetch(asyncFn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current) setError(err);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { if (immediate) run(); /* eslint-disable-next-line */ }, deps);

  return { data, loading, error, refetch: run, setData };
}
