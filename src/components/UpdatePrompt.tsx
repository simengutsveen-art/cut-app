import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui';

/** Viser et banner når en ny versjon av appen er lastet ned. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Se etter oppdateringer hver time når appen er åpen.
      if (registration) {
        setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8px)] z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-accent/60 bg-surface p-3 shadow-lg"
    >
      <p className="flex-1 text-sm">Ny versjon av appen er klar.</p>
      <Button size="sm" variant="secondary" onClick={() => setNeedRefresh(false)}>
        Senere
      </Button>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Oppdater
      </Button>
    </div>
  );
}
