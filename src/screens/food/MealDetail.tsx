import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconEdit } from '../../components/icons';
import {
  Badge,
  Card,
  EmptyState,
  Page,
  PageHeader,
  SectionTitle,
  Segmented,
} from '../../components/ui';
import { fmtNok, formatNumber } from '../../lib/format';
import { SLOT_LABELS } from '../../lib/labels';
import { amountLines, dislikedHits, mealTotals, type AmountLine } from '../../lib/nutrition';
import { useAppData } from '../../state/appData';
import type { Meal } from '../../types';
import { DislikeWarning, MacroGrid } from './MealBits';

export function MealDetail() {
  const { mealId = '' } = useParams();
  const { mealsById, ingredientsById, settings } = useAppData();
  const meal = mealsById.get(mealId);
  const [mode, setMode] = useState<'portion' | 'batch'>('portion');

  if (!meal) {
    return (
      <Page>
        <PageHeader title="Måltid" back />
        <EmptyState>Fant ikke måltidet.</EmptyState>
      </Page>
    );
  }
  const totals = mealTotals(meal, ingredientsById);
  const hits = dislikedHits(meal, ingredientsById, settings.dislikedFoods);
  const portions = mode === 'batch' ? meal.batchPortions : 1;

  return (
    <Page>
      <PageHeader
        title={meal.name}
        subtitle={`${meal.id} · ${SLOT_LABELS[meal.slot]}`}
        back
        actions={
          <Link
            to={`/mer/data/maltider/${meal.id}`}
            aria-label="Rediger måltid"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-surface-2"
          >
            <IconEdit />
          </Link>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {meal.isMealPrep && <Badge tone="accent">Meal prep · {meal.batchPortions} porsjoner</Badge>}
        {!meal.active && <Badge tone="warn">Deaktivert</Badge>}
        <DislikeWarning hits={hits} />
      </div>
      {meal.description && <p className="mb-3 text-muted">{meal.description}</p>}

      <MacroGrid totals={totals} />
      <p className="mt-2 text-sm text-muted">
        Per porsjon · pris {fmtNok(totals.priceNok)}
        {meal.batchPortions > 1 && ` · batch ${fmtNok(totals.priceNok * meal.batchPortions)}`}
      </p>

      <SectionTitle>Ingredienser</SectionTitle>
      {meal.batchPortions > 1 && (
        <div className="mb-3">
          <Segmented
            label="Mengde"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'portion', label: 'Per porsjon' },
              { value: 'batch', label: `Batch (${meal.batchPortions} porsjoner)` },
            ]}
          />
        </div>
      )}
      <IngredientList meal={meal} portions={portions} />
      {meal.servingNote && <p className="mt-2 text-sm text-muted">{meal.servingNote}</p>}

      {meal.steps.length > 0 && (
        <>
          <SectionTitle>Slik gjør du</SectionTitle>
          <Card>
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {meal.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </Page>
  );
}

function amountText(line: AmountLine): { main: string; extra?: string } {
  const g = line.roundedGrams;
  const main = g >= 1000 ? `${formatNumber(g / 1000, 2)} kg` : `${formatNumber(g, 1)} g`;
  if (!line.units) return { main };
  return { main, extra: `≈ ${formatNumber(line.units.count, 1)} ${line.units.name}` };
}

export function IngredientList({ meal, portions }: { meal: Meal; portions: number }) {
  const { ingredientsById } = useAppData();
  const lines = amountLines(meal, ingredientsById, portions);
  return (
    <Card className="p-0">
      <ul>
        {lines.map((line) => {
          const t = amountText(line);
          return (
            <li
              key={line.ingredient.id}
              className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <span>{line.ingredient.name}</span>
              <span className="tabular shrink-0 text-right">
                <span className="font-semibold">{t.main}</span>
                {t.extra && <span className="block text-xs text-muted">{t.extra}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
