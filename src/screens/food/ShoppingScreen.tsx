import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { IconShare } from '../../components/icons';
import { Button, Card, Field, SectionTitle, SelectInput } from '../../components/ui';
import { db } from '../../db';
import { useToday } from '../../hooks/useToday';
import { planWeek } from '../../lib/dates';
import { fmtNok, formatNumber } from '../../lib/format';
import { capitalize } from '../../lib/labels';
import { weekBreakfastAndEvening } from '../../lib/mealPrep';
import { buildShoppingList, shoppingGramsText, shoppingListText } from '../../lib/shopping';
import { useAppData } from '../../state/appData';
import { WeekPicker } from './MealPrepScreen';

export function ShoppingScreen() {
  const { settings, plan, meals, mealsById, ingredientsById } = useAppData();
  const today = useToday();
  const [week, setWeek] = useState(() => planWeek(today, settings.startDate, settings.weeks));
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const haveMap = useLiveQuery(() => db.getMeta('shoppingHave'), []);
  // Avkrysning vises med en gang, før databasen har lagret.
  const [override, setOverride] = useState<{ week: number; ids: string[] } | null>(null);
  const haveIds = useMemo(
    () => (override?.week === week ? override.ids : (haveMap?.[String(week)] ?? [])),
    [override, haveMap, week],
  );
  const have = useMemo(() => new Set(haveIds), [haveIds]);
  const choice = weekBreakfastAndEvening(settings, week);

  const list = useMemo(
    () =>
      buildShoppingList({
        week,
        rotation: plan.mealPrepRotation,
        breakfastId: choice.frokost,
        eveningId: choice.kveldsmat,
        meals: mealsById,
        ingredients: ingredientsById,
        have,
      }),
    [
      week,
      plan.mealPrepRotation,
      choice.frokost,
      choice.kveldsmat,
      mealsById,
      ingredientsById,
      have,
    ],
  );

  const setChoice = async (slot: 'frokost' | 'kveldsmat', mealId: string) => {
    const key = String(week);
    await db.settings.update('app', {
      weekMealChoices: {
        ...settings.weekMealChoices,
        [key]: { ...settings.weekMealChoices[key], [slot]: mealId },
      },
    });
  };

  const toggleHave = async (id: string) => {
    const next = have.has(id) ? haveIds.filter((x) => x !== id) : [...haveIds, id];
    setOverride({ week, ids: next });
    const current = (await db.getMeta('shoppingHave')) ?? {};
    await db.setMeta('shoppingHave', { ...current, [String(week)]: next });
  };

  const share = async () => {
    const text = shoppingListText(list, have);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Handleliste uke ${week}`, text });
        setShareStatus(null);
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareStatus('Kopiert til utklippstavla.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setShareStatus('Kunne ikke dele lista.');
    }
  };

  const options = (slot: 'frokost' | 'kveldsmat') =>
    meals.filter((m) => m.slot === slot && (m.active || m.id === choice[slot]));

  return (
    <>
      <WeekPicker week={week} setWeek={setWeek} max={settings.weeks} />
      <div className="grid grid-cols-2 gap-3">
        {(['frokost', 'kveldsmat'] as const).map((slot) => (
          <Field key={slot} label={`${capitalize(slot)} (× 7)`} htmlFor={`shop-${slot}`}>
            <SelectInput
              id={`shop-${slot}`}
              value={choice[slot]}
              onChange={(e) => void setChoice(slot, e.target.value)}
            >
              {options(slot).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} {m.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        Prep:{' '}
        {list.mealsUsed
          .filter((u) => u.role === 'prep')
          .map((u) => `${u.meal.id} × ${u.portions}`)
          .join(', ') || 'ingen'}
      </p>

      {list.groups.map((group) => (
        <section key={group.category}>
          <SectionTitle>{capitalize(group.category)}</SectionTitle>
          <Card className="p-0">
            <ul>
              {group.lines.map((line) => {
                const checked = have.has(line.ingredient.id);
                return (
                  <li key={line.ingredient.id} className="border-b border-line last:border-b-0">
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2">
                      {line.pantry ? (
                        <span className="w-6 shrink-0" aria-hidden="true" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => void toggleHave(line.ingredient.id)}
                          aria-label={`${line.ingredient.name}: har hjemme`}
                          className="h-6 w-6 shrink-0 accent-[var(--c-accent)]"
                        />
                      )}
                      <span
                        className={
                          checked ? 'min-w-0 flex-1 text-muted line-through' : 'min-w-0 flex-1'
                        }
                      >
                        <span className="block font-medium">{line.ingredient.name}</span>
                        <span className="block text-sm text-muted">
                          {line.pantry
                            ? `Basisvare · forbruk ${shoppingGramsText(line.grams)}`
                            : `${line.packs} × ${line.ingredient.pack.label} · trenger ${shoppingGramsText(line.grams)}`}
                        </span>
                      </span>
                      {line.priceNok !== null && (
                        <span className="tabular shrink-0 text-sm font-semibold">
                          {fmtNok(line.priceNok)}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}

      <Card className="mt-6" tone="accent">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">Sum å kjøpe</span>
          <span className="tabular text-2xl font-bold" data-testid="shopping-total">
            {fmtNok(list.totalNok)}
          </span>
        </div>
        {list.totalNok !== list.fullTotalNok && (
          <p className="text-sm text-muted">
            {fmtNok(list.fullTotalNok - list.totalNok)} trukket fra for det du har hjemme
          </p>
        )}
        <p className="mt-1 text-xs text-muted">
          Prisene er omtrentlige.{' '}
          {formatNumber(list.groups.reduce((n, g) => n + g.lines.length, 0))} varer.
        </p>
        <Button className="mt-3" block onClick={() => void share()}>
          <IconShare /> Del handlelista
        </Button>
        {shareStatus && (
          <p className="mt-2 text-center text-sm" role="status">
            {shareStatus}
          </p>
        )}
      </Card>
    </>
  );
}
