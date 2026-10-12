import {
  IconBook,
  IconDatabase,
  IconDownload,
  IconInfo,
  IconPulse,
  IconRefresh,
  IconSliders,
  IconTrash,
} from '../../components/icons';
import { Badge, LinkRow, ListCard, Page, PageHeader, SectionTitle } from '../../components/ui';
import { isNewerSeed } from '../../data/seedSync';
import { daysBetween, formatDate, todayISO } from '../../lib/dates';
import { useAppData } from '../../state/appData';

export function MoreIndex() {
  const { seed, installedSeedVersion, lastBackupAt } = useAppData();
  const update = isNewerSeed(seed.seedVersion, installedSeedVersion);
  const backupDays = lastBackupAt
    ? daysBetween(todayISO(new Date(lastBackupAt)), todayISO())
    : null;
  return (
    <Page>
      <PageHeader title="Mer" />
      <ListCard>
        <LinkRow
          to="/mer/core"
          icon={<IconPulse size={20} />}
          title="Core og rygg"
          subtitle="Rutine, smerteskala og røde flagg"
        />
        <LinkRow
          to="/mer/guide"
          icon={<IconBook size={20} />}
          title="Guide"
          subtitle="Søvn, tilskudd, alkohol, skritt, rygg og måling"
        />
      </ListCard>

      <SectionTitle>Plan og data</SectionTitle>
      <ListCard>
        <LinkRow
          to="/mer/data"
          icon={<IconDatabase size={20} />}
          title="Rediger data"
          subtitle="Ingredienser, måltider, øvelser og økter"
        />
        <LinkRow
          to="/mer/innstillinger"
          icon={<IconSliders size={20} />}
          title="Innstillinger"
          subtitle="Startdato, mål, ukeplan og tema"
        />
        <LinkRow
          to="/mer/oppdater"
          icon={<IconRefresh size={20} />}
          title="Oppdater plan"
          subtitle={`Installert versjon ${installedSeedVersion}`}
          right={update ? <Badge tone="accent">Ny versjon</Badge> : undefined}
        />
        <LinkRow
          to="/mer/backup"
          icon={<IconDownload size={20} />}
          title="Backup og eksport"
          subtitle={
            lastBackupAt
              ? `Siste backup ${formatDate(todayISO(new Date(lastBackupAt)))}`
              : 'Ingen backup ennå'
          }
          right={
            backupDays === null || backupDays > 7 ? <Badge tone="warn">Ta backup</Badge> : undefined
          }
        />
      </ListCard>

      <SectionTitle>Annet</SectionTitle>
      <ListCard>
        <LinkRow
          to="/mer/om"
          icon={<IconInfo size={20} />}
          title="Om appen"
          subtitle="Kreditering og forbehold"
        />
        <LinkRow
          to="/mer/nullstill"
          icon={<IconTrash size={20} />}
          title="Nullstill app"
          subtitle="Slett alle data på denne enheten"
        />
      </ListCard>
    </Page>
  );
}
