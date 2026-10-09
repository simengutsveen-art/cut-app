import { useState } from 'react';
import { IconCheck } from '../../components/icons';
import { Badge, Button, Card, Page, PageHeader, SectionTitle } from '../../components/ui';
import { applySeedUpdate, isNewerSeed, type SeedUpdateSummary } from '../../data/seedSync';
import { db } from '../../db';
import { TABLE_LABELS } from '../../lib/labels';
import { useAppData } from '../../state/appData';

export function SeedUpdateScreen() {
  const { seed, installedSeedVersion } = useAppData();
  const [summary, setSummary] = useState<SeedUpdateSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newer = isNewerSeed(seed.seedVersion, installedSeedVersion);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setSummary(await applySeedUpdate(db, seed));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Oppdater plan" back="/mer" />
      <Card>
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-muted">Installert</dt>
          <dd className="font-semibold">{summary?.fromVersion ?? installedSeedVersion}</dd>
          <dt className="text-muted">I appen nå</dt>
          <dd className="font-semibold">{seed.seedVersion}</dd>
        </dl>
        {!summary &&
          (newer ? (
            <>
              <p className="mt-3 text-sm">
                Det finnes en nyere plan. Elementer du har endret selv blir ikke rørt, nye elementer
                legges til, og ingenting slettes. Loggene dine endres aldri.
              </p>
              <Button className="mt-3" block size="lg" onClick={() => void run()} disabled={busy}>
                Oppdater plan
              </Button>
            </>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-good">
              <IconCheck size={18} /> Planen er oppdatert.
            </p>
          ))}
        {error && (
          <p className="mt-3 text-sm text-bad" role="alert">
            {error}
          </p>
        )}
      </Card>

      {summary && <Summary summary={summary} />}
    </Page>
  );
}

function Summary({ summary }: { summary: SeedUpdateSummary }) {
  const groups = [
    { title: 'Lagt til', items: summary.added, tone: 'good' as const },
    { title: 'Oppdatert', items: summary.updated, tone: 'accent' as const },
    { title: 'Beholdt dine endringer', items: summary.keptUserModified, tone: 'warn' as const },
  ];
  return (
    <>
      <SectionTitle>Oppsummering</SectionTitle>
      <Card tone="good" role="status">
        <p className="font-semibold">Planen er oppdatert til {summary.toVersion}.</p>
        <p className="text-sm text-muted">
          {summary.added.length} nye · {summary.updated.length} oppdatert ·{' '}
          {summary.keptUserModified.length} beholdt
          {summary.settingsUpdated ? ' · innstillinger oppdatert' : ''}
        </p>
      </Card>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.title}>
              <SectionTitle>{g.title}</SectionTitle>
              <Card className="p-0">
                <ul>
                  {g.items.map((item) => (
                    <li
                      key={`${item.table}-${item.id}`}
                      className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 last:border-b-0"
                    >
                      <span>{item.name}</span>
                      <Badge tone={g.tone}>{TABLE_LABELS[item.table].singular}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ),
      )}
    </>
  );
}
