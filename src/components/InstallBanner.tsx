import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstall } from '../hooks/useInstall';
import { showInstallPrompt } from '../installPrompt';
import { chromeIntentUrl } from '../lib/install';
import { IconPhone, IconX } from './icons';
import { Button, Card, IconButton } from './ui';

const DISMISSED_KEY = 'cut.installBannerDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Banner på I dag når appen åpnes i nettleseren på en telefon: «Legg Cut på Hjem-skjermen». */
export function InstallBanner() {
  const install = useInstall();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed || install.platform === 'installed' || install.platform === 'desktop') return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Uten lagring vises banneret igjen neste gang. Det er greit.
    }
  };
  const inApp = install.platform === 'in-app';

  return (
    <Card tone="accent" className="mb-4 flex items-start gap-3" aria-label="Installer appen">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <IconPhone size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {inApp ? 'Åpne Cut i nettleseren' : 'Legg Cut på Hjem-skjermen'}
        </p>
        <p className="mt-0.5 text-[14px] text-muted">
          {inApp
            ? 'Du er i en innebygd nettleser (f.eks. Messenger, Instagram eller Snapchat). Der kan ikke appen installeres.'
            : 'Da åpnes den som en vanlig app, i fullskjerm, og virker uten nett.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {install.canPrompt ? (
            <Button size="sm" onClick={() => void showInstallPrompt()}>
              Installer
            </Button>
          ) : inApp && install.os === 'android' ? (
            <a
              href={chromeIntentUrl(window.location.href)}
              className="pressable inline-flex min-h-11 items-center rounded-xl bg-accent px-3.5 text-[15px] font-semibold text-on-accent"
            >
              Åpne i Chrome
            </a>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => navigate('/mer/installer')}>
            Slik gjør du
          </Button>
        </div>
      </div>
      <IconButton label="Skjul" className="-mt-1.5 -mr-1.5 text-muted" onClick={dismiss}>
        <IconX size={18} />
      </IconButton>
    </Card>
  );
}
