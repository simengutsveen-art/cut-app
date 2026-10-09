import { useEffect, useState } from 'react';
import { App } from './App';
import { initApp } from './init';

type BootState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export function Bootstrap() {
  const [state, setState] = useState<BootState>({ status: 'loading' });

  useEffect(() => {
    initApp()
      .then(() => setState({ status: 'ready' }))
      .catch((error: unknown) =>
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  }, []);

  if (state.status === 'ready') return <App />;
  if (state.status === 'error') {
    return (
      <div className="safe-top mx-auto max-w-xl p-4">
        <h1 className="mt-6 text-2xl font-bold">Appen kunne ikke starte</h1>
        <p className="mt-2 text-muted">Sjekk seed-data.json (eller databasen). Feilmelding:</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-surface p-3 text-sm whitespace-pre-wrap">
          {state.message}
        </pre>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
      Starter …
    </div>
  );
}
