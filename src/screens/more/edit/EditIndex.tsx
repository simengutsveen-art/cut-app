import { LinkRow, ListCard, Page, PageHeader } from '../../../components/ui';
import { TABLE_LABELS } from '../../../lib/labels';
import { useAppData } from '../../../state/appData';

export function EditIndex() {
  const { ingredients, meals, exercises, sessions } = useAppData();
  const rows = [
    { table: 'ingredients' as const, list: ingredients },
    { table: 'meals' as const, list: meals },
    { table: 'exercises' as const, list: exercises },
    { table: 'sessions' as const, list: sessions },
  ];
  return (
    <Page>
      <PageHeader title="Rediger data" back="/mer" />
      <ListCard>
        {rows.map(({ table, list }) => {
          const modified = list.filter((x) => x.userModified).length;
          const own = list.filter((x) => x.source === 'user').length;
          const inactive = list.filter((x) => !x.active).length;
          return (
            <LinkRow
              key={table}
              to={`/mer/data/${TABLE_LABELS[table].slug}`}
              title={TABLE_LABELS[table].plural}
              subtitle={[
                `${list.length} totalt`,
                own && `${own} egne`,
                modified && `${modified} endret`,
                inactive && `${inactive} deaktivert`,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          );
        })}
      </ListCard>
      <p className="mt-4 text-sm text-muted">
        Endringer du gjør her beholdes når planen oppdateres fra seed-fila. Hvert endret element kan
        tilbakestilles til standard.
      </p>
    </Page>
  );
}
