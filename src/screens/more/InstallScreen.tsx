import { useState, type ReactNode } from 'react';
import { IconCheck, IconPhone, IconShare } from '../../components/icons';
import { Button, Card, Page, PageHeader, SectionTitle } from '../../components/ui';
import { useInstall } from '../../hooks/useInstall';
import { showInstallPrompt } from '../../installPrompt';
import { chromeIntentUrl } from '../../lib/install';

function appUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-snug">
          <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[14px] font-bold text-accent">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

const ANDROID_STEPS: ReactNode[] = [
  <>
    Åpne lenka i <b>Chrome</b>.
  </>,
  <>
    Trykk <b>⋮</b> øverst til høyre.
  </>,
  <>
    Velg <b>«Installer app»</b> (eller <b>«Legg til på startskjermen»</b>) og trykk <b>Installer</b>
    .
  </>,
  <>Cut ligger nå på startskjermen og i app-oversikten, som en vanlig app.</>,
];

const IPHONE_STEPS: ReactNode[] = [
  <>
    Åpne lenka i <b>Safari</b>.
  </>,
  <>
    Trykk <b>Del-knappen</b> (firkanten med pil opp).
  </>,
  <>
    Velg <b>«Legg til på Hjem-skjerm»</b> og trykk <b>Legg til</b>.
  </>,
  <>Åpne Cut fra Hjem-skjermen.</>,
];

function AndroidGuide() {
  return (
    <Card>
      <Steps items={ANDROID_STEPS} />
      <ul className="mt-4 flex flex-col gap-1.5 border-t border-[var(--c-hairline)] pt-3 text-[14px] text-muted">
        <li>
          <b className="text-fg">Samsung Internet:</b> trykk <b>≡</b> nederst → «Legg til side på» →
          «Startskjerm».
        </li>
        <li>
          <b className="text-fg">Firefox:</b> trykk <b>⋮</b> → «Installer».
        </li>
      </ul>
    </Card>
  );
}

function IphoneGuide() {
  return (
    <Card>
      <Steps items={IPHONE_STEPS} />
      <p className="mt-4 border-t border-[var(--c-hairline)] pt-3 text-[14px] text-muted">
        <b className="text-fg">Chrome på iPhone:</b> trykk Del-ikonet i adressefeltet → «Legg til på
        Hjem-skjerm».
      </p>
    </Card>
  );
}

export function InstallScreen() {
  const install = useInstall();
  const [copied, setCopied] = useState(false);
  const url = appUrl();
  const canShare = typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const androidFirst = install.os !== 'ios';
  return (
    <Page>
      <PageHeader
        title="Installer appen"
        back="/mer"
        subtitle="Legg Cut på Hjem-skjermen, så åpnes den som en vanlig app."
      />

      {install.platform === 'installed' && (
        <Card tone="good" className="flex items-center gap-3">
          <IconCheck size={22} className="shrink-0 text-good" />
          <p className="text-[15px]">Cut er installert. Du bruker appen fra Hjem-skjermen.</p>
        </Card>
      )}

      {install.canPrompt && (
        <Card tone="accent">
          <p className="text-[15px]">Telefonen kan installere Cut direkte.</p>
          <Button className="mt-3" block size="lg" onClick={() => void showInstallPrompt()}>
            <IconPhone size={20} /> Installer Cut
          </Button>
        </Card>
      )}

      {install.platform === 'in-app' && (
        <Card tone="warn">
          <p className="font-semibold">Du er i en innebygd nettleser</p>
          <p className="mt-1 text-[15px]">
            Lenker fra Messenger, Instagram, Snapchat og lignende åpnes inne i appen. Der kan ikke
            Cut installeres. Åpne lenka i {install.os === 'ios' ? 'Safari' : 'Chrome'} først: trykk{' '}
            <b>⋮</b> eller <b>···</b> og velg «Åpne i nettleser».
          </p>
          {install.os === 'android' && (
            <a
              href={chromeIntentUrl(window.location.href)}
              className="pressable mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-4 font-semibold text-on-accent"
            >
              Åpne i Chrome
            </a>
          )}
        </Card>
      )}

      <SectionTitle>{androidFirst ? 'Android' : 'iPhone'}</SectionTitle>
      {androidFirst ? <AndroidGuide /> : <IphoneGuide />}
      <SectionTitle>{androidFirst ? 'iPhone' : 'Android'}</SectionTitle>
      {androidFirst ? <IphoneGuide /> : <AndroidGuide />}

      <SectionTitle>Del appen</SectionTitle>
      <Card>
        <p className="text-[14px] text-muted">Lenke til appen</p>
        <p className="mt-0.5 font-semibold break-all">{url}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => void copy()}>
            {copied ? (
              <>
                <IconCheck size={18} /> Kopiert
              </>
            ) : (
              'Kopier lenke'
            )}
          </Button>
          {canShare && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => void navigator.share({ title: 'Cut', url }).catch(() => {})}
            >
              <IconShare size={18} /> Del
            </Button>
          )}
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Første gang må man ha nett. Etter det virker appen uten nett. Alt som logges, lagres bare
          på den telefonen, så alle har sine egne data.
        </p>
      </Card>
    </Page>
  );
}
