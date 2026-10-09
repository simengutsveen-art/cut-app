import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Skjemautkast for et element i databasen.
 * - Følger med på databaseverdien (`source`) så lenge det ikke finnes ulagrede endringer.
 * - `current()` gir alltid siste verdi, også når et tallfelt lagrer ved blur rett før «Lagre».
 */
export function useDraft<T>(source: T) {
  const [draft, setDraftState] = useState(source);
  const ref = useRef(source);
  const dirtyRef = useRef(false);
  const [dirty, setDirtyState] = useState(false);
  const lastSource = useRef(source);

  useEffect(() => {
    if (source === lastSource.current) return;
    lastSource.current = source;
    if (!dirtyRef.current) {
      ref.current = source;
      setDraftState(source);
    }
  }, [source]);

  const update = useCallback((fn: (d: T) => T) => {
    ref.current = fn(ref.current);
    dirtyRef.current = true;
    setDraftState(ref.current);
    setDirtyState(true);
  }, []);

  /** Etter lagring eller tilbakestilling: ingen ulagrede endringer. */
  const markClean = useCallback((value?: T) => {
    dirtyRef.current = false;
    setDirtyState(false);
    if (value !== undefined) {
      ref.current = value;
      setDraftState(value);
    }
  }, []);

  const current = useCallback(() => ref.current, []);
  return { draft, update, markClean, current, dirty };
}
