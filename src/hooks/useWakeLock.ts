import { useEffect } from 'react';

/**
 * Holder skjermen på (Screen Wake Lock) så lenge `enabled` er sann, f.eks. under en økt.
 * iOS slipper låsen når appen går i bakgrunnen, så den hentes på nytt når appen vises igjen.
 * Gjør ingenting der API-et ikke finnes.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (active) sentinel = s;
        else void s.release();
      } catch {
        // Nektet (f.eks. lavt batteri) – appen fungerer som før.
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}
