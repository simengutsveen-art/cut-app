import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconChevronLeft, IconChevronRight } from '../../components/icons';
import { Badge, Button, Card, EmptyState, IconButton } from '../../components/ui';
import { patchDayLog } from '../../data/dayLogs';
import { db } from '../../db';
import { useToday } from '../../hooks/useToday';
import { formatDate, planWeek, weekdayName } from '../../lib/dates';
import { capitalize } from '../../lib/labels';
import { prepEventsForWeek, PREP_WEEKDAY, type PrepEvent } from '../../lib/mealPrep';
import { mealTotals } from '../../lib/nutrition';
import { useAppData } from '../../state/appData';
import { IngredientList } from './MealDetail';
import { MacroLine } from './MealBits';

export function MealPrepScreen() {
  const { settings, plan } = useAppData();
  const today = useToday();
  const [week, setWeek] = useState(() => planWeek(today, settings.startDate, settings.weeks));
  const events = prepEventsForWeek(plan.mealPrepRotation, week, settings.startDate);
  const logs = useLiveQuery(
    () => db.dayLogs.bulkGet(events.map((e) => e.date)),
    [events.map((e) => e.date).join(',')],
  );

  return (
    <>
      <WeekPicker week={week} setWeek={setWeek} max={settings.weeks} />
      <p className="mb-3 text-sm text-muted">
        Søndagsprep dekker mandag–onsdag, onsdagsprep dekker torsdag–søndag. Hver batch gir 4
        porsjoner.
      </p>
      {events.length === 0 ? (
        <EmptyState>Ingen prep-plan for uke {week} i rotasjonen.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event, i) => (
            <PrepCard
              key={event.key}
              event={event}
              done={!!logs?.[i]?.prepDone}
              isToday={event.date === today}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function WeekPicker({
  week,
  setWeek,
  max,
}: {
  week: number;
  setWeek: (fn: (w: number) => number) => void;
  max: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl bg-surface-2 p-1">
      <IconButton label="Forrige uke" disabled={week <= 1} onClick={() => setWeek((w) => w - 1)}>
        <IconChevronLeft />
      </IconButton>
      <span className="font-semibold" aria-live="polite">
        Uke {week}
      </span>
      <IconButton label="Neste uke" disabled={week >= max} onClick={() => setWeek((w) => w + 1)}>
        <IconChevronRight />
      </IconButton>
    </div>
  );
}

function PrepCard({ event, done, isToday }: { event: PrepEvent; done: boolean; isToday: boolean }) {
  const { mealsById, ingredientsById } = useAppData();
  const meals = [
    { label: 'Lunsj', meal: mealsById.get(event.meals.lunsj) },
    { label: 'Middag', meal: mealsById.get(event.meals.middag) },
  ];
  const dayName = capitalize(weekdayName(PREP_WEEKDAY[event.key]));
  return (
    <Card tone={done ? 'good' : isToday ? 'accent' : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">
            {dayName} {formatDate(event.date)}
          </h3>
          <p className="text-sm text-muted">
            {event.key === 'sunday' ? 'Før uka: mandag–onsdag' : 'Torsdag–søndag'}
          </p>
        </div>
        {done ? (
          <Badge tone="good">
            <IconCheck size={14} /> Laget
          </Badge>
        ) : isToday ? (
          <Badge tone="accent">I dag</Badge>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {meals.map(({ label, meal }) =>
          meal ? (
            <details key={label} className="rounded-xl bg-surface-2">
              <summary className="flex min-h-12 cursor-pointer flex-col justify-center px-3 py-2">
                <span className="font-semibold">
                  {label}: <span className="text-muted">{meal.id}</span> {meal.name} ×{' '}
                  {meal.batchPortions}
                </span>
                <MacroLine totals={mealTotals(meal, ingredientsById)} />
              </summary>
              <div className="px-3 pb-3">
                <h4 className="mt-1 mb-2 text-sm font-semibold text-muted">
                  Batch ({meal.batchPortions} porsjoner)
                </h4>
                <IngredientList meal={meal} portions={meal.batchPortions} />
                {meal.steps.length > 0 && (
                  <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                    {meal.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
                <Link
                  to={`/mat/bibliotek/${meal.id}`}
                  className="mt-2 inline-block text-sm text-accent"
                >
                  Åpne oppskriften
                </Link>
              </div>
            </details>
          ) : (
            <p key={label} className="text-sm text-bad">
              {label}: fant ikke måltidet
            </p>
          ),
        )}
      </div>
      <Button
        className="mt-3"
        block
        variant={done ? 'secondary' : 'primary'}
        onClick={() => void patchDayLog(db, event.date, { prepDone: !done })}
      >
        <IconCheck /> {done ? 'Merk som ikke laget' : 'Merk som laget'}
      </Button>
    </Card>
  );
}
