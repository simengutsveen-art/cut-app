import type { ReactNode } from 'react';
import { Button, EmptyState, Page, PageHeader } from '../../../components/ui';

export function FormPage({
  title,
  back,
  children,
}: {
  title: string;
  back: string;
  children: ReactNode;
}) {
  return (
    <Page>
      <PageHeader title={title} back={back} />
      {children}
    </Page>
  );
}

export function NotFound({ back }: { back: string }) {
  return (
    <Page>
      <PageHeader title="Fant ikke elementet" back={back} />
      <EmptyState>Elementet finnes ikke (lenger).</EmptyState>
    </Page>
  );
}

/** Lagre-knapp som ligger fast over fanelinja, med feil- og lagret-melding. */
export function SaveBar({
  onSave,
  error,
  saved,
  dirty,
  label = 'Lagre',
}: {
  onSave: () => void;
  error: string | null;
  saved: boolean;
  dirty: boolean;
  label?: string;
}) {
  return (
    <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 mt-6 flex flex-col gap-2 rounded-2xl bg-bg/90 py-2 backdrop-blur">
      {error && (
        <pre
          className="overflow-x-auto rounded-xl bg-bad/10 p-2 text-sm whitespace-pre-wrap text-bad"
          role="alert"
        >
          {error}
        </pre>
      )}
      {saved && !dirty && (
        <p className="text-sm text-good" role="status">
          Lagret.
        </p>
      )}
      <Button size="lg" block onClick={onSave}>
        {label}
      </Button>
    </div>
  );
}
