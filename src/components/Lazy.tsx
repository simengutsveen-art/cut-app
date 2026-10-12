import { Suspense, type ReactNode } from 'react';

/** Plassholder mens en skjerm som lastes ved behov hentes (fra service worker-cachen). */
export function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60dvh] items-center justify-center" role="status">
          <span className="sr-only">Laster …</span>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-3 border-t-accent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
