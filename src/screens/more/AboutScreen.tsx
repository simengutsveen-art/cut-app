import { Card, Page, PageHeader, SectionTitle } from '../../components/ui';
import { SCHEMA_VERSION } from '../../db';
import { useAppData } from '../../state/appData';

export function AboutScreen() {
  const { plan, installedSeedVersion, settings } = useAppData();
  const src = plan.imageSource;
  return (
    <Page>
      <PageHeader title="Om appen" back="/mer" />
      <Card>
        <h2 className="text-lg font-bold">Cut</h2>
        <p className="text-sm text-muted">
          {settings.weeks}-ukers cut for {settings.person.name}. Alle data lagres bare på denne
          enheten (IndexedDB). Ingen innlogging og ingen server.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted">Planversjon</dt>
          <dd>{installedSeedVersion}</dd>
          <dt className="text-muted">Databaseskjema</dt>
          <dd>{SCHEMA_VERSION}</dd>
          {plan.generatedFrom && (
            <>
              <dt className="text-muted">Laget fra</dt>
              <dd>{plan.generatedFrom}</dd>
            </>
          )}
        </dl>
      </Card>

      <SectionTitle>Forbehold</SectionTitle>
      <Card tone="warn">
        <p>{plan.disclaimer}</p>
        <p className="mt-2 text-sm text-muted">
          Næringsverdier og priser er omtrentlige. Appen gir ikke medisinske råd. Ved smerter, røde
          flagg eller usikkerhet: kontakt lege eller fysioterapeut.
        </p>
      </Card>

      <SectionTitle>Kreditering</SectionTitle>
      <Card>
        <p>
          Øvelsesbildene er fra <span className="font-semibold">{src.name}</span> ({src.license}).
        </p>
        <p className="mt-1 text-sm break-all">
          <a href={src.repo} target="_blank" rel="noreferrer" className="text-accent underline">
            {src.repo}
          </a>
        </p>
        <p className="mt-2 text-sm text-muted">
          Bildene ligger i appen og fungerer uten nett. Grafer: Recharts. Lagring: Dexie.
        </p>
      </Card>
    </Page>
  );
}
