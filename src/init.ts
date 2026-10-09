import { getBundledSeed } from './data/seed';
import { initDatabase } from './data/seedSync';
import { db, requestPersistentStorage } from './db';

let initPromise: Promise<void> | null = null;

/** Validerer seed og fyller databasen første gang. Kjøres én gang per sidevisning. */
export function initApp(): Promise<void> {
  initPromise ??= (async () => {
    const seed = getBundledSeed();
    await db.open();
    await initDatabase(db, seed);
    void requestPersistentStorage();
  })();
  return initPromise;
}

/** Brukes etter «Nullstill app». */
export function resetInitState(): void {
  initPromise = null;
}
