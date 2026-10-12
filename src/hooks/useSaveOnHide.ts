import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Kaller `save` når appen går i bakgrunnen eller lukkes (iOS sender ikke alltid blur da),
 * så det Simen har skrevet inn ikke går tapt.
 */
export function useSaveOnHide(save: () => void): void {
  const ref = useRef(save);
  useLayoutEffect(() => {
    ref.current = save;
  });
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') ref.current();
    };
    const onPageHide = () => ref.current();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
