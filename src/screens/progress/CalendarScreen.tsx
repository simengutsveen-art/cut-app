import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type CSSProperties } from 'react';
import { IconCheck } from '../../components/icons';
import { Card, Page, PageHeader, SectionTitle, Sheet } from '../../components/ui';
import { db } from '../../db';
import { useDoneWorkoutDates } from '../../hooks/useDoneWorkoutDates';
import { useToday } from '../../hooks/useToday';
import {
  calendarRows,
  phaseSpans,
  planProgress,
  WEEKDAY_LETTERS,
  type CalendarDay,
} from '../../lib/calendar';
import { cx } from '../../lib/cx';
import {
  formatDate,
  formatDateShort,
  formatWeekdayLong,
  isoWeekday,
  planStatusFor,
} from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { capitalize } from '../../lib/labels';
import { painEntry } from '../../lib/pain';
import { dayPlanFor } from '../../lib/prescription';
import { stepGoal } from '../../lib/progress';
import { useAppData } from '../../state/appData';
import type { Phase } from '../../types';

/** Fasene får hver sin styrke av aksentfargen (deload lysest). */
function phaseColor(phases: Phase[], phase: Phase | undefined): string {
  if (!phase) return 'transparent';
  const i = phases.indexOf(phase);
  const deload = phase.setsFactor !== undefined && phase.setsFactor < 1;
  const strength = deload ? 28 : ([45, 65, 28, 82, 100][i] ?? 60);
  return `color-mix(in srgb, var(--c-accent) ${strength}%, var(--c-surface-3))`;
}

export function CalendarScreen() {
  const { settings, plan } = useAppData();
  const today = useToday();
  const started = !!settings.planStarted;
  // Før start vises planen som om den starter i dag (det «Start nå» gjør).
  const startDate = started ? settings.startDate : today;
  const progress = planProgress(startDate, settings.weeks, today, started);
  const status = planStatusFor(settings, today);
  const rows = useMemo(
    () => calendarRows(startDate, settings.weeks, today, plan.phases),
    [startDate, settings.weeks, today, plan.phases],
  );
  const spans = phaseSpans(startDate, plan.phases);
  const done = useDoneWorkoutDates();
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  return (
    <Page>
      <PageHeader
        eyebrow={`${settings.weeks} uker`}
        title="Kalender"
        back
        subtitle={
          started
            ? `${formatDate(progress.startDate)} – ${formatDate(progress.endDate)}`
            : `Ikke startet. Forhåndsvisning hvis du starter i dag: ${formatDate(progress.startDate)} – ${formatDate(progress.endDate)}`
        }
      />

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Fremdrift</p>
            <p className="num mt-1 text-[34px] leading-none font-bold">
              {progress.dayNumber}
              <span className="text-[18px] font-semibold text-muted">
                {' '}
                / {progress.totalDays} dager
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="num text-[22px] leading-none font-bold text-accent">
              {formatNumber(progress.daysLeft)}
            </p>
            <p className="text-[13px] text-muted">dager igjen</p>
          </div>
        </div>

        {/* Tidslinje med fasene, og en markør for i dag */}
        <div className="relative mt-4" aria-hidden="true">
          <div className="flex h-3 gap-[3px] overflow-hidden rounded-full">
            {spans.map(({ phase, days }) => (
              <div
                key={phase.name}
                className="h-full"
                style={{ flexGrow: days, background: phaseColor(plan.phases, phase) }}
              />
            ))}
          </div>
          {started && !progress.finished && (
            <div
              className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-fg shadow-[0_0_0_3px_var(--c-surface)]"
              style={{ left: `${progress.fraction * 100}%` }}
            />
          )}
        </div>
        <ul className="mt-4 grid gap-2">
          {spans.map(({ phase, startDate, endDate }) => {
            const current =
              started &&
              phase ===
                plan.phases.find((p) => status.week >= p.weeks[0] && status.week <= p.weeks[1]);
            return (
              <li key={phase.name} className="flex items-center gap-2.5 text-[14px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: phaseColor(plan.phases, phase) }}
                  aria-hidden="true"
                />
                <span className={cx('flex-1', current ? 'font-semibold' : 'text-fg/85')}>
                  {phase.name}
                  {current && <span className="ml-1.5 text-accent">· nå</span>}
                </span>
                <span className="num text-muted">
                  {phase.weeks[0] === phase.weeks[1]
                    ? `U${phase.weeks[0]}`
                    : `U${phase.weeks[0]}–${phase.weeks[1]}`}{' '}
                  · {formatDateShort(startDate)}–{formatDateShort(endDate)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <SectionTitle>Alle dager</SectionTitle>
      <Card className="px-2.5 py-3">
        <div
          className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-y-1"
          role="group"
          aria-label="Kalender for planen"
        >
          <span aria-hidden="true" />
          {WEEKDAY_LETTERS.map((l, i) => (
            <span
              key={i}
              className="pb-1 text-center text-[11px] font-semibold text-muted"
              aria-hidden="true"
            >
              {l}
            </span>
          ))}
          {rows.map((row, ri) => (
            <CalendarRowView
              key={row.days[0].date}
              row={row}
              first={ri === 0}
              done={done}
              onSelect={setSelected}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1.5 text-[12px] text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" /> Økt fullført
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted/50" aria-hidden="true" /> Treningsdag
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full ring-2 ring-accent" aria-hidden="true" /> I dag
          </li>
        </ul>
      </Card>

      {selected && <DaySheet day={selected} onClose={() => setSelected(null)} />}
    </Page>
  );
}

function CalendarRowView({
  row,
  first,
  done,
  onSelect,
}: {
  row: ReturnType<typeof calendarRows>[number];
  first: boolean;
  done: Set<string>;
  onSelect: (day: CalendarDay) => void;
}) {
  const { settings, plan } = useAppData();
  return (
    <>
      {row.month && (
        <p
          className={cx(
            'col-span-8 px-1 pb-1 text-[13px] font-semibold capitalize',
            !first && 'pt-3',
          )}
        >
          {row.month}
        </p>
      )}
      <span
        className="num flex items-center justify-start pl-0.5 text-[11px] font-semibold text-muted"
        aria-hidden="true"
      >
        {row.week ? `U${row.week}` : ''}
      </span>
      {row.days.map((d) => {
        const planned = d.inPlan && dayPlanFor(settings, isoWeekday(d.date)).kind === 'session';
        const isDone = done.has(d.date);
        const style = { '--phase': phaseColor(plan.phases, d.phase) } as CSSProperties;
        return (
          <button
            key={d.date}
            type="button"
            disabled={!d.inPlan}
            onClick={() => onSelect(d)}
            aria-label={`${capitalize(formatWeekdayLong(d.date))}${d.state === 'today' ? ', i dag' : ''}${isDone ? ', økt fullført' : planned ? ', treningsdag' : ''}`}
            style={style}
            className={cx(
              'pressable relative mx-auto flex h-11 w-full max-w-11 flex-col items-center justify-center rounded-[14px] disabled:pointer-events-none',
              d.state === 'outside' && 'opacity-25',
              d.state === 'past' && 'bg-surface-2',
              d.state === 'today' && 'pulse-today bg-accent text-on-accent',
            )}
          >
            {d.inPlan && d.state !== 'today' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2.5 top-0 h-[3px] rounded-b-full"
                style={{ background: 'var(--phase)' }}
              />
            )}
            <span
              className={cx('num text-[15px] font-semibold', d.state === 'future' && 'text-fg/80')}
            >
              {d.day}
            </span>
            <span
              aria-hidden="true"
              className={cx(
                'mt-0.5 h-1.5 w-1.5 rounded-full',
                isDone
                  ? d.state === 'today'
                    ? 'bg-on-accent'
                    : 'bg-accent'
                  : planned
                    ? d.state === 'today'
                      ? 'bg-on-accent/50'
                      : 'bg-muted/50'
                    : 'bg-transparent',
              )}
            />
          </button>
        );
      })}
    </>
  );
}

function DaySheet({ day, onClose }: { day: CalendarDay; onClose: () => void }) {
  const { settings, sessionsById, plan } = useAppData();
  const log = useLiveQuery(() => db.dayLogs.get(day.date).then((l) => l ?? null), [day.date]);
  const workouts = useLiveQuery(
    () => db.workoutLogs.where('date').equals(day.date).toArray(),
    [day.date],
  );
  const dp = dayPlanFor(settings, isoWeekday(day.date));
  const planned = dp.kind === 'session' ? sessionsById.get(dp.sessionId) : undefined;
  const goal = day.week
    ? stepGoal(settings.steps, day.week, isoWeekday(day.date), settings.stepsBonus)
    : null;
  const pain = painEntry(log?.pain, plan.coreRoutine.painScale);
  const doneWorkouts = (workouts ?? []).filter((w) => w.status === 'done');

  const rows: { label: string; value: string }[] = [
    {
      label: 'Vekt',
      value: log?.weightKg ? `${formatNumber(log.weightKg, 1)} kg` : '–',
    },
    {
      label: 'Skritt',
      value:
        log?.steps != null
          ? `${formatNumber(log.steps)}${goal ? ` av ${formatNumber(goal)}` : ''}`
          : goal
            ? `mål ${formatNumber(goal)}`
            : '–',
    },
    { label: 'Core-rutine', value: log?.coreDone ? 'Gjort' : '–' },
    {
      label: 'Smerte',
      value: log?.pain != null ? `${log.pain}${pain ? ` (${pain.level})` : ''}` : '–',
    },
  ];

  return (
    <Sheet open title={capitalize(formatWeekdayLong(day.date))} onClose={onClose}>
      <p className="text-sm text-muted">
        {day.week ? `Uke ${day.week}${day.phase ? ` · ${day.phase.name}` : ''}` : 'Utenfor planen'}{' '}
        · {formatDate(day.date)}
      </p>

      <div className="surface mt-3 rounded-2xl p-3.5">
        <p className="eyebrow">Trening</p>
        <p className="mt-1 text-[17px] font-semibold">
          {planned ? planned.name : 'Hviledag: lang tur'}
        </p>
        {doneWorkouts.length > 0 ? (
          <ul className="mt-1.5 flex flex-col gap-1">
            {doneWorkouts.map((w) => (
              <li key={w.id} className="flex items-center gap-1.5 text-sm text-good">
                <IconCheck size={16} /> {sessionsById.get(w.sessionId)?.name ?? 'Økt'} fullført ·{' '}
                {w.exercises.reduce((n, e) => n + e.sets.length, 0)} sett
              </li>
            ))}
          </ul>
        ) : (
          day.state === 'past' &&
          planned && <p className="mt-1 text-sm text-muted">Ingen økt logget.</p>
        )}
      </div>

      <dl className="surface mt-3 divide-y divide-[var(--c-hairline)] rounded-2xl">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-3.5 py-2.5 text-[15px]"
          >
            <dt className="text-muted">{r.label}</dt>
            <dd className="num font-semibold">{r.value}</dd>
          </div>
        ))}
      </dl>
      {log?.note && (
        <p className="surface mt-3 rounded-2xl p-3.5 text-[15px]">
          <span className="eyebrow mb-1 block">Notat</span>
          {log.note}
        </p>
      )}
    </Sheet>
  );
}
