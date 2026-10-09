import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconPlus, IconSearch } from '../../../components/icons';
import {
  Badge,
  EmptyState,
  LinkRow,
  ListCard,
  Page,
  PageHeader,
  TextInput,
} from '../../../components/ui';
import { weekdayName } from '../../../lib/dates';
import {
  capitalize,
  SLOT_LABELS,
  TABLE_LABELS,
  TABLE_SLUGS,
  type TableSlug,
} from '../../../lib/labels';
import { mealTotals } from '../../../lib/nutrition';
import { formatNumber } from '../../../lib/format';
import { useAppData } from '../../../state/appData';
import type { Editable } from '../../../types';

interface Row extends Editable {
  id: string;
  name: string;
  subtitle: string;
}

export function EntityList() {
  const { table: slug = '' } = useParams();
  const app = useAppData();
  const [query, setQuery] = useState('');
  const table = TABLE_SLUGS[slug as TableSlug];
  if (!table) {
    return (
      <Page>
        <PageHeader title="Rediger data" back="/mer/data" />
        <EmptyState>Ukjent liste.</EmptyState>
      </Page>
    );
  }
  const labels = TABLE_LABELS[table];

  const rows: Row[] =
    table === 'ingredients'
      ? app.ingredients.map((i) => ({
          ...i,
          subtitle: `${formatNumber(i.per100g.kcal)} kcal / 100 g · ${capitalize(i.category)}`,
        }))
      : table === 'meals'
        ? app.meals.map((m) => ({
            ...m,
            name: `${m.id} ${m.name}`,
            subtitle: `${SLOT_LABELS[m.slot]} · ${formatNumber(mealTotals(m, app.ingredientsById).kcal)} kcal`,
          }))
        : table === 'exercises'
          ? app.exercises.map((e) => ({ ...e, subtitle: e.primaryMuscles.join(', ') }))
          : app.sessions.map((s) => ({
              ...s,
              subtitle: `${capitalize(weekdayName(s.weekday))} · ${s.exercises.length} øvelser`,
            }));

  const q = query.trim().toLocaleLowerCase('nb');
  const filtered = rows.filter((r) => !q || r.name.toLocaleLowerCase('nb').includes(q));

  return (
    <Page>
      <PageHeader
        title={labels.plural}
        back="/mer/data"
        actions={
          <Link
            to={`/mer/data/${labels.slug}/ny`}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-accent px-3 font-semibold text-on-accent"
          >
            <IconPlus size={18} /> Ny
          </Link>
        }
      />
      <label className="relative mb-3 block">
        <span className="sr-only">Søk i {labels.plural.toLowerCase()}</span>
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <TextInput
          type="search"
          placeholder="Søk"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </label>
      {filtered.length === 0 ? (
        <EmptyState>Ingen treff.</EmptyState>
      ) : (
        <ListCard>
          {filtered.map((r) => (
            <LinkRow
              key={r.id}
              to={`/mer/data/${labels.slug}/${encodeURIComponent(r.id)}`}
              title={r.name}
              subtitle={r.subtitle}
              right={
                <span className="flex flex-col items-end gap-1">
                  {r.source === 'user' && <Badge>Egen</Badge>}
                  {r.userModified && <Badge tone="accent">Endret</Badge>}
                  {!r.active && <Badge tone="warn">Deaktivert</Badge>}
                </span>
              }
            />
          ))}
        </ListCard>
      )}
    </Page>
  );
}
