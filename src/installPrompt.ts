/**
 * Android (Chrome, Edge, Samsung Internet) sender `beforeinstallprompt` når appen kan installeres.
 * Hendelsen kan komme før React har startet, så den fanges her fra første stund og vises
 * som en «Installer»-knapp i appen i stedet for nettleserens eget lille banner.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptState {
  /** Nettleseren kan vise sin egen installeringsdialog */
  canPrompt: boolean;
  /** Appen ble installert i denne økta */
  installed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallPromptState = { canPrompt: false, installed: false };
const listeners = new Set<() => void>();

function set(next: InstallPromptState) {
  state = next;
  listeners.forEach((l) => l());
}

export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    set({ ...state, canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canPrompt: false, installed: true });
  });
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPromptState(): InstallPromptState {
  return state;
}

/** Viser nettleserens installeringsdialog. Gir `true` hvis brukeren trykket Installer. */
export async function showInstallPrompt(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  set({ canPrompt: false, installed: outcome === 'accepted' });
  return outcome === 'accepted';
}
