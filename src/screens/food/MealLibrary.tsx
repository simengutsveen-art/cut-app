import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Checkbox, EmptyState } from '../../components/ui';
import { cx } from '../../lib/cx';
import { SLOT_LABELS } from '../../lib/labels';
import { dislikedHits, mealTotals } from '../../lib/nutrition';
import { useAppData } from '../../state/appData';
import { SLOTS, type Slot } from '../../types';
import { DislikeWarning, MacroLine } from './MealBits';

export function MealLibrary() {
  const { meals, ingredientsById, settings } = useAppData();
  const [params, setParams] = useSearchParams();
  const slot = (params.get('slot') as Slot | null) ?? null;
  const showInactive = params.get('inaktive') === '1';

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const list = meals.filter((m) => (!slot || m.slot === slot) && (showInactive || m.active));

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrer på måltid">
        {[null, ...SLOTS].map((s) => (
          <button
            key={s ?? 'alle'}
            type="button"
            aria-pressed={slot === s}
            onClick={() => update('slot', s)}
            className={cx(
              'min-h-11 rounded-full border px-4 text-sm font-semibold',
              slot === s ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface-2',
            )}
          >
            {s ? SLOT_LABELS[s] : 'Alle'}
          </button>
        ))}
      </div>
      <Checkbox
        checked={showInactive}
        onChange={(v) => update('inaktive', v ? '1' : null)}
        label="Vis deaktiverte måltider"
      />
      {list.length === 0 ? (
        <EmptyState>Ingen måltider her.</EmptyState>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {list.map((meal) => {
            const totals = mealTotals(meal, ingredientsById);
            const hits = dislikedHits(meal, ingredientsById, settings.dislikedFoods);
            return (
              <li key={meal.id}>
                <Link
                  to={`/mat/bibliotek/${meal.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 hover:bg-surface-2"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      <span className="text-muted">{meal.id}</span> {meal.name}
                    </span>
                    <Badge>{SLOT_LABELS[meal.slot]}</Badge>
                    {meal.isMealPrep && <Badge tone="accent">Meal prep</Badge>}
                    {!meal.active && <Badge tone="warn">Deaktivert</Badge>}
                    {meal.source === 'user' && <Badge>Egen</Badge>}
                  </span>
                  {meal.description && (
                    <span className="text-sm text-muted">{meal.description}</span>
                  )}
                  <MacroLine totals={totals} full />
                  {hits.length > 0 && <DislikeWarning hits={hits} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
