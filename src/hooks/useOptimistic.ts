import { useEffect, useState } from 'react';

/**
 * Viser en ny verdi med en gang, før IndexedDB har lagret og live-spørringen har oppdatert seg.
 */
export function useOptimistic<T>(value: T): [T, (next: T) => void] {
  const [pending, setPending] = useState<{ value: T } | null>(null);
  useEffect(() => setPending(null), [value]);
  return [pending ? pending.value : value, (next: T) => setPending({ value: next })];
}
