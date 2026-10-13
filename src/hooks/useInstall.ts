import { useSyncExternalStore } from 'react';
import {
  getInstallPromptState,
  subscribeInstallPrompt,
  type InstallPromptState,
} from '../installPrompt';
import { installContext, type InstallContext } from '../lib/install';

function isStandalone(): boolean {
  return (
    !!window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Hvor appen kjører, og om nettleseren kan vise sin egen installeringsdialog. */
export function useInstall(): InstallContext & InstallPromptState {
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState);
  const context = installContext(navigator.userAgent, isStandalone(), navigator.maxTouchPoints);
  return { ...context, ...prompt, platform: prompt.installed ? 'installed' : context.platform };
}
