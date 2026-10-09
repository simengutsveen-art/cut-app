import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Meter } from '../../components/Meter';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
  IconWarning,
} from '../../components/icons';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  SectionTitle,
  Sheet,
  TextInput,
} from '../../components/ui';
import { addExtra, removeExtra, setMeal } from '../../data/dayLogs';
import { db } from '../../db';
import { useDayPlan, type DayPlan } from '../../hooks/useDayPlan';
import { useToday } from '../../hooks/useToday';
import { cx } from '../../lib/cx';
import { addDaysISO, formatDate, formatWeekdayLong } from '../../lib/dates';
import { fmtNok, fmtSigned, formatNumber, parseDecimal } from '../../lib/format';
import { capitalize, SLOT_LABELS } from '../../lib/labels';
import { dislikedHits, mealTotals, statusTone } from '../../lib/nutrition';
import { useAppData } from '../../state/appData';
import { SLOTS, type Meal, type Slot } from '../../types';
import { DislikeWarning, MacroLine } from './MealBits';

export function FoodToday() {
  const today = useToday();
  const [date, setDate] = useState(today);
  const day = useDayPlan(date);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [addingExtra, setAddingExtra] = useState(false);

  return (
    <>
      <div className="mb-3 flex items-center gap-1">
        <IconButton label="Forrige dag" onClick={() => setDate((d) => addDaysISO(d, -1))}>
          <IconChevronLeft />
        </IconButton>
        <div className="flex-1 text-center">
          <div className="font-semibold">
            {date === today ? 'I dag' : capitalize(formatWeekdayLong(date))}
          </div>
          <div className="text-xs text-muted">{formatDate(date)}</div>
        </div>
        <IconButton label="Neste dag" onClick={() => setDate((d) => addDaysISO(d, 1))}>
          <IconChevronRight />
        </IconButton>
      </div>

      <DaySummary day={day} />

      <SectionTitle>Måltider</SectionTitle>
      <div className="flex flex-col gap-2">
        {SLOTS.map((slot) => (
          <SlotCard key={slot} slot={slot} day={day} onPick={() => setPicking(slot)} />
        ))}
      </div>

      <SectionTitle
        action={
          <Button size="sm" variant="ghost" onClick={() => setAddingExtra(true)}>
            <IconPlus size={18} /> Legg til
          </Button>
        }
      >
        Fleksipott
      </SectionTitle>
      {day.log.extras.length === 0 ? (
        <p className="text-sm text-muted">
          Ingen ekstra poster. Legg til snacks, drikke eller middag ute.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {day.log.extras.map((x) => (
            <li
              key={x.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface py-1 pr-1 pl-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{x.name}</span>
                <span className="tabular text-sm text-muted">
                  {formatNumber(x.kcal)} kcal · {formatNumber(x.protein, 1)} g protein
                </span>
              </span>
              <IconButton
                label={`Fjern ${x.name}`}
                onClick={() => void removeExtra(db, date, x.id)}
              >
                <IconTrash size={20} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {picking && (
        <MealPickerSheet
          slot={picking}
          day={day}
          onClose={() => setPicking(null)}
          onPick={async (mealId) => {
            await setMeal(db, date, picking, mealId);
            setPicking(null);
          }}
        />
      )}
      <ExtraSheet
        open={addingExtra}
        onClose={() => setAddingExtra(false)}
        onAdd={async (extra) => {
          await addExtra(db, date, extra);
          setAddingExtra(false);
        }}
      />
    </>
  );
}

export function DaySummary({ day, compact }: { day: DayPlan; compact?: boolean }) {
  const { settings } = useAppData();
  const target = settings.currentKcalTarget;
  const [pMin, pMax] = settings.proteinTargetG;
  return (
    <Card>
      <div className="grid grid-cols-2 gap-4">
        <Meter
          label="Kcal"
          value={day.totals.kcal}
          valueText={formatNumber(day.totals.kcal)}
          targetText={`mål ${formatNumber(target)} ± ${formatNumber(settings.kcalTolerance)}`}
          max={target * 1.2}
          range={[target - settings.kcalTolerance, target + settings.kcalTolerance]}
          tone={statusTone[day.kcal]}
        />
        <Meter
          label="Protein"
          value={day.totals.protein}
          valueText={`${formatNumber(day.totals.protein)} g`}
          targetText={`mål ${pMin}–${pMax}`}
          max={pMax * 1.2}
          range={[pMin, pMax]}
          tone={statusTone[day.protein]}
        />
      </div>
      {!compact && (
        <p className="tabular mt-3 text-sm text-muted">
          Karbo {formatNumber(day.totals.carbs)} g (mål {settings.carbTargetG.join('–')}) · Fett{' '}
          {formatNumber(day.totals.fat)} g (mål {settings.fatTargetG.join('–')})
        </p>
      )}
      <p className="mt-2 flex items-baseline justify-between text-sm">
        <span className="text-muted">Dagens pris</span>
        <span className="tabular font-semibold" data-testid="day-price">
          {fmtNok(day.totals.priceNok)}
        </span>
      </p>
    </Card>
  );
}

function SlotCard({ slot, day, onPick }: { slot: Slot; day: DayPlan; onPick: () => void }) {
  const { ingredientsById, settings } = useAppData();
  const meal = day.meals[slot];
  const chosen = !!day.log.meals[slot];
  const totals = meal ? mealTotals(meal, ingredientsById) : null;
  const hits = meal ? dislikedHits(meal, ingredientsById, settings.dislikedFoods) : [];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`${SLOT_LABELS[slot]}: ${meal?.name ?? 'ikke valgt'}. Trykk for å bytte.`}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:bg-surface-2"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
          {SLOT_LABELS[slot]}
          {!chosen && <span className="font-normal normal-case">(standard)</span>}
        </span>
        <span className="block font-semibold">
          {meal ? (
            <>
              <span className="text-muted">{meal.id}</span> {meal.name}
            </>
          ) : (
            'Velg måltid'
          )}
        </span>
        {totals && <MacroLine totals={totals} />}
        {hits.length > 0 && (
          <span className="mt-1 block">
            <DislikeWarning hits={hits} />
          </span>
        )}
      </span>
      <IconChevronRight className="shrink-0 text-muted" />
    </button>
  );
}

function MealPickerSheet({
  slot,
  day,
  onClose,
  onPick,
}: {
  slot: Slot;
  day: DayPlan;
  onClose: () => void;
  onPick: (mealId: string | null) => void;
}) {
  const { meals, ingredientsById, settings } = useAppData();
  const current = day.meals[slot];
  const currentKcal = current ? mealTotals(current, ingredientsById).kcal : 0;
  const options = meals.filter((m) => m.slot === slot && (m.active || m.id === current?.id));
  const chosen = !!day.log.meals[slot];
  return (
    <Sheet open title={`Velg ${SLOT_LABELS[slot].toLowerCase()}`} onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {options.map((meal: Meal) => {
          const totals = mealTotals(meal, ingredientsById);
          const hits = dislikedHits(meal, ingredientsById, settings.dislikedFoods);
          const selected = meal.id === current?.id;
          const delta = totals.kcal - currentKcal;
          return (
            <li key={meal.id}>
              <button
                type="button"
                onClick={() => onPick(meal.id)}
                aria-pressed={selected}
                className={cx(
                  'flex w-full flex-col gap-0.5 rounded-2xl border px-4 py-3 text-left',
                  selected ? 'border-accent bg-accent/10' : 'border-line bg-surface-2',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    <span className="text-muted">{meal.id}</span> {meal.name}
                  </span>
                  {selected ? (
                    <Badge tone="accent">Valgt</Badge>
                  ) : (
                    <span className="tabular text-sm text-muted">
                      {fmtSigned(Math.round(delta))} kcal
                    </span>
                  )}
                </span>
                <MacroLine totals={totals} />
                {meal.id === day.defaults[slot] && (
                  <span className="text-xs text-muted">Standard for denne dagen</span>
                )}
                {hits.length > 0 && <DislikeWarning hits={hits} />}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && (
        <Button variant="ghost" block className="mt-3" onClick={() => onPick(null)}>
          Tilbake til standard
        </Button>
      )}
      <p className="mt-3 text-center text-sm">
        <Link to={`/mat/bibliotek?slot=${slot}`} className="text-accent">
          Se oppskrifter i biblioteket
        </Link>
      </p>
    </Sheet>
  );
}

function ExtraSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (extra: { name: string; kcal: number; protein: number }) => void;
}) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const kcalN = parseDecimal(kcal);
  const proteinN = protein.trim() === '' ? 0 : parseDecimal(protein);
  const valid = name.trim() !== '' && kcalN !== null && kcalN >= 0 && proteinN !== null;
  return (
    <Sheet open={open} title="Legg til i fleksipotten" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onAdd({ name: name.trim(), kcal: Math.round(kcalN!), protein: proteinN ?? 0 });
          setName('');
          setKcal('');
          setProtein('');
        }}
      >
        <Field label="Navn" htmlFor="extra-name">
          <TextInput
            id="extra-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="F.eks. proteinbar"
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kcal" htmlFor="extra-kcal">
            <TextInput
              id="extra-kcal"
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </Field>
          <Field label="Protein (g)" htmlFor="extra-protein">
            <TextInput
              id="extra-protein"
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </Field>
        </div>
        {kcal !== '' && kcalN === null && (
          <p className="flex items-center gap-1 text-sm text-bad">
            <IconWarning size={16} /> Skriv kcal som et tall.
          </p>
        )}
        <Button type="submit" size="lg" disabled={!valid}>
          Legg til
        </Button>
      </form>
    </Sheet>
  );
}
