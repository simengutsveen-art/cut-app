import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ring } from '../../components/Ring';
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
import { addExtra, removeExtra, setEaten, setMeal } from '../../data/dayLogs';
import { db } from '../../db';
import { useDayPlan, type DayPlan } from '../../hooks/useDayPlan';
import { useToday } from '../../hooks/useToday';
import { cx } from '../../lib/cx';
import { addDaysISO, formatDate, formatWeekdayLong } from '../../lib/dates';
import { fmtNok, fmtSigned, formatNumber, parseDecimal } from '../../lib/format';
import { capitalize, SLOT_LABELS } from '../../lib/labels';
import { dislikedHits, mealTotals, statusTone, type IntakeStatus } from '../../lib/nutrition';
import { useAppData } from '../../state/appData';
import { SLOTS, type ExtraFood, type Meal, type Slot } from '../../types';
import { DislikeWarning, EatenCheck, MacroLine } from './MealBits';

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
          {date === today ? (
            <div className="text-xs text-muted">{formatDate(date)}</div>
          ) : (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="pressable min-h-8 text-[13px] font-medium text-accent"
            >
              {formatDate(date)} · Til i dag
            </button>
          )}
        </div>
        <IconButton label="Neste dag" onClick={() => setDate((d) => addDaysISO(d, 1))}>
          <IconChevronRight />
        </IconButton>
      </div>

      <DaySummary day={day} />

      <SectionTitle>Måltider</SectionTitle>
      <div className="flex flex-col gap-2">
        {SLOTS.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            day={day}
            onPick={() => setPicking(slot)}
            onEaten={(eaten) => void setEaten(db, date, slot, eaten)}
          />
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
              className="surface flex items-center gap-3 rounded-[20px] py-1 pr-1 pl-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{x.name}</span>
                <span className="tabular text-sm text-muted">
                  {formatNumber(x.kcal)} kcal · {formatNumber(x.protein, 1)} g protein
                  {x.carbs !== undefined && <> · {formatNumber(x.carbs, 1)} g karbo</>}
                  {x.fat !== undefined && <> · {formatNumber(x.fat, 1)} g fett</>}
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

const STATUS_TEXT = { ok: 'I rute', under: 'Under målet', over: 'Over målet' } as const;

const STATUS_CLASS: Record<IntakeStatus, string> = {
  ok: 'text-good',
  under: 'text-warn',
  over: 'text-bad',
  remaining: 'text-muted',
};

const RING_TONE: Record<IntakeStatus, 'accent' | 'good' | 'warn' | 'bad'> = {
  ...statusTone,
  remaining: 'accent',
};

export function DaySummary({ day, compact }: { day: DayPlan; compact?: boolean }) {
  const { settings } = useAppData();
  const target = settings.currentKcalTarget;
  const [pMin, pMax] = settings.proteinTargetG;
  const { eaten } = day;
  const rings = [
    {
      label: 'Kcal',
      value: eaten.kcal,
      max: target,
      main: formatNumber(eaten.kcal),
      unit: 'kcal',
      target: `mål ${formatNumber(target)} ± ${formatNumber(settings.kcalTolerance)}`,
      status: day.kcal,
      left: `${formatNumber(Math.max(0, target - eaten.kcal))} kcal igjen`,
    },
    {
      label: 'Protein',
      value: eaten.protein,
      max: pMin,
      main: formatNumber(eaten.protein),
      unit: 'g protein',
      target: `mål ${pMin}–${pMax} g`,
      status: day.protein,
      left: `${formatNumber(Math.max(0, pMin - eaten.protein))} g igjen`,
    },
  ];
  const minis = [
    {
      label: 'Karbo',
      value: `${formatNumber(eaten.carbs, 1)} g`,
      hint: compact ? null : `mål ${settings.carbTargetG.join('–')}`,
      testId: 'day-carbs',
    },
    {
      label: 'Fett',
      value: `${formatNumber(eaten.fat, 1)} g`,
      hint: compact ? null : `mål ${settings.fatTargetG.join('–')}`,
      testId: 'day-fat',
    },
    { label: 'Dagens pris', value: fmtNok(day.totals.priceNok), hint: null, testId: 'day-price' },
  ];
  return (
    <Card className="rounded-[26px]">
      <div className="grid grid-cols-2 gap-3">
        {rings.map((r) => (
          <div key={r.label} className="flex flex-col items-center text-center">
            <Ring
              value={r.value}
              max={r.max}
              label={r.label}
              tone={RING_TONE[r.status]}
              size={118}
              stroke={11}
            >
              <span className="num text-[24px] leading-none font-bold">{r.main}</span>
              <span className="mt-1 text-[11px] font-medium text-muted">{r.unit}</span>
            </Ring>
            <p className="mt-2 text-[13px] text-muted">{r.target}</p>
            <p className={cx('text-[13px] font-semibold', STATUS_CLASS[r.status])}>
              {r.status === 'remaining' ? r.left : STATUS_TEXT[r.status]}
            </p>
          </div>
        ))}
      </div>
      <p className="tabular mt-3 text-center text-[13px] text-muted" data-testid="day-planned">
        Planlagt: {formatNumber(day.totals.kcal)} kcal · {formatNumber(day.totals.protein)} g
        protein
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--c-hairline)] pt-3.5">
        {minis.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-[12px] text-muted">{m.label}</dt>
            <dd className="num truncate text-[17px] font-semibold" data-testid={m.testId}>
              {m.value}
            </dd>
            {m.hint && <dd className="text-[11px] text-muted">{m.hint}</dd>}
          </div>
        ))}
      </dl>
    </Card>
  );
}

function SlotCard({
  slot,
  day,
  onPick,
  onEaten,
}: {
  slot: Slot;
  day: DayPlan;
  onPick: () => void;
  onEaten: (eaten: boolean) => void;
}) {
  const { ingredientsById, settings } = useAppData();
  const meal = day.meals[slot];
  const chosen = !!day.log.meals[slot];
  const eaten = !!day.log.eaten?.[slot];
  const totals = meal ? mealTotals(meal, ingredientsById) : null;
  const hits = meal ? dislikedHits(meal, ingredientsById, settings.dislikedFoods) : [];
  return (
    <div className="surface flex items-center rounded-[22px] pl-1.5">
      <EatenCheck checked={eaten} onChange={onEaten} label={`${SLOT_LABELS[slot]} spist`} />
      <button
        type="button"
        onClick={onPick}
        aria-label={`${SLOT_LABELS[slot]}: ${meal?.name ?? 'ikke valgt'}. Trykk for å bytte.`}
        className="pressable flex min-w-0 flex-1 items-center gap-3 rounded-r-[22px] py-3.5 pr-4 pl-1.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
            {SLOT_LABELS[slot]}
            {!chosen && <span className="font-normal normal-case">(standard)</span>}
            {eaten && (
              <span className="font-semibold tracking-normal text-good normal-case">Spist</span>
            )}
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
    </div>
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
                  'pressable flex w-full flex-col gap-0.5 rounded-[20px] border px-4 py-3 text-left',
                  selected
                    ? 'border-transparent bg-accent/10 shadow-[inset_0_0_0_1.5px_var(--c-accent)]'
                    : 'border-transparent bg-surface-2',
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
  onAdd: (extra: Omit<ExtraFood, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const kcalN = parseDecimal(kcal);
  const optional = (v: string) => (v.trim() === '' ? 0 : parseDecimal(v));
  const proteinN = optional(protein);
  const carbsN = optional(carbs);
  const fatN = optional(fat);
  const valid =
    name.trim() !== '' &&
    kcalN !== null &&
    kcalN >= 0 &&
    proteinN !== null &&
    carbsN !== null &&
    fatN !== null;
  return (
    <Sheet open={open} title="Legg til i fleksipotten" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onAdd({
            name: name.trim(),
            kcal: Math.round(kcalN!),
            protein: proteinN ?? 0,
            carbs: carbsN ?? 0,
            fat: fatN ?? 0,
          });
          setName('');
          setKcal('');
          setProtein('');
          setCarbs('');
          setFat('');
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
          <Field label="Karbo (g)" htmlFor="extra-carbs">
            <TextInput
              id="extra-carbs"
              inputMode="decimal"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </Field>
          <Field label="Fett (g)" htmlFor="extra-fat">
            <TextInput
              id="extra-fat"
              inputMode="decimal"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
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
