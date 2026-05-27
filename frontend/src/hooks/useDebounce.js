import { useState, useEffect } from 'react';

/**
 * Devuelve el valor después de `delay` ms sin cambios.
 * Útil para inputs de búsqueda (responsividad real-time sin saturar la API).
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
