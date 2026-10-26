import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayMark, DayMarkLegend } from '../../components/DayMark';
import { IconCheck } from '../../components/icons';
import { EndPlanButton } from '../../components/PlanControls';
import { Badge, Card, Page, PageHeader, SectionTitle, Sheet } from '../../components/ui';
import { db } from '../../db';
import { useDoneWorkoutDates } from '../../hooks/useDoneWorkoutDates';
import { useToday } from '../../hooks/useToday';
import {
  dayLabel,
  groupByPhase,
  planProgress,
  planWeeks,
  type CalendarDay,
  type PhaseGroup,
  type PlanWeek,
} from '../../lib/calendar';
import { cx } from '../../lib/cx';
import {
  formatDate,
  formatDayMonth,
  formatDayMonthRange,
  formatWeekdayLong,
  isoWeekday,
} from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { capitalize } from '../../lib/labels';
import { painEntry } from '../../lib/pain';
import { dayPlanFor } from '../../lib/prescription';
import { stepGoal } from '../../lib/progress';
import { useAppData } from '../../state/appData';

function weekRangeLabel(first: number, last: number): string {
  return first === last ? `Uke ${first}` : `Uke ${first}–${last}`;
}

export function CalendarScreen() {
  const { settings, plan } = useAppData();
  const today = useToday();
  const navigate = useNavigate();
  const started = !!settings.planStarted;
  // Før start vises planen som om den starter i dag (det «Start nå» gjør).
  const startDate = started ? settings.startDate : today;
  const progress = planProgress(startDate, settings.weeks, today, started);
  const weeks = useMemo(
    () => planWeeks(startDate, settings.weeks, today, plan.phases),
    [startDate, settings.weeks, today, plan.phases],
  );
  const groups = groupByPhase(weeks);
  const done = useDoneWorkoutDates();
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const isPlanned = (date: string) => dayPlanFor(settings, isoWeekday(date)).kind === 'session';
  const allDays = weeks.flatMap((w) => w.days);
  const plannedTotal = allDays.filter((d) => isPlanned(d.date)).length;
  const doneTotal = allDays.filter((d) => done.has(d.date)).length;
  const current = started ? weeks.find((w) => w.state === 'current') : undefined;

  return (
    <Page>
      <PageHeader
        eyebrow="Planen"
        title="Kalender"
        back
        subtitle={
          started
            ? `${formatDate(progress.startDate)} – ${formatDate(progress.endDate)}`
            : 'Ikke startet ennå. Slik blir planen hvis du starter i dag.'
        }
      />

      <Card>
        <div className="flex items-end justify-between gap-3">
          <p className="num text-[30px] leading-none font-bold tracking-[-0.02em]">
            {progress.finished ? 'Ferdig' : `Dag ${progress.dayNumber}`}
            {!progress.finished && (
              <span className="text-[17px] font-semibold text-muted"> av {progress.totalDays}</span>
            )}
          </p>
          <p className="text-right text-[15px] font-semibold">
            <span className="num text-accent">{formatNumber(progress.daysLeft)}</span>{' '}
            {progress.daysLeft === 1 ? 'dag' : 'dager'} igjen
          </p>
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-label="Dager fullført i planen"
          aria-valuemin={0}
          aria-valuemax={progress.totalDays}
          aria-valuenow={progress.dayNumber}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress.fraction * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] text-muted">
          <span>Start {formatDayMonth(progress.startDate)}</span>
          <span>Slutt {formatDayMonth(progress.endDate)}</span>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--c-hairline)] pt-3.5">
          <div>
            <dt className="text-[12px] text-muted">Uke</dt>
            <dd className="num text-[17px] font-bold">
              {current ? current.week : progress.finished ? settings.weeks : '–'}
              <span className="text-[13px] font-semibold text-muted"> av {settings.weeks}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[12px] text-muted">Fase</dt>
            <dd className="truncate text-[17px] font-bold">{current?.phase?.name ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Økter</dt>
            <dd className="num text-[17px] font-bold">
              {formatNumber(doneTotal)}
              <span className="text-[13px] font-semibold text-muted">
                {' '}
                av {formatNumber(plannedTotal)}
              </span>
            </dd>
          </div>
        </dl>
      </Card>

      <SectionTitle>Uke for uke</SectionTitle>
      <DayMarkLegend className="-mt-1 mb-3 px-1" />

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <PhaseCard
            key={group.startDate}
            group={group}
            started={started}
            today={today}
            done={done}
            isPlanned={isPlanned}
            onSelect={setSelected}
          />
        ))}
      </div>

      {started && (
        <div className="mt-8">
          <EndPlanButton today={today} onEnded={() => navigate('/', { replace: true })} />
          <p className="mt-2 px-1 text-[12px] text-muted">
            Avslutter planen og går tilbake til «Klar til start». Det du har logget, beholdes.
          </p>
        </div>
      )}

      {selected && <DaySheet day={selected} onClose={() => setSelected(null)} />}
    </Page>
  );
}

function PhaseCard({
  group,
  started,
  today,
  done,
  isPlanned,
  onSelect,
}: {
  group: PhaseGroup;
  started: boolean;
  today: string;
  done: Set<string>;
  isPlanned: (date: string) => boolean;
  onSelect: (day: CalendarDay) => void;
}) {
  const first = group.weeks[0].week;
  const last = group.weeks[group.weeks.length - 1].week;
  const name = group.phase?.name ?? weekRangeLabel(first, last);
  const isCurrent = started && group.state === 'current';
  const isPast = started && group.state === 'past';
  return (
    <section
      aria-label={name}
      className={cx(
        'surface overflow-hidden rounded-2xl',
        isCurrent &&
          'shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--c-accent)_55%,transparent)]',
      )}
    >
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[18px] leading-tight font-bold tracking-[-0.01em]">{name}</h3>
          {isCurrent && <Badge tone="accent">Nå</Badge>}
          {isPast && (
            <Badge tone="good">
              <IconCheck size={13} /> Ferdig
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-muted">
          {weekRangeLabel(first, last)} · {formatDayMonthRange(group.startDate, group.endDate)}
        </p>
        {group.phase?.note && (
          <p className="mt-1.5 text-[14px] leading-snug text-fg/85">{group.phase.note}</p>
        )}
      </header>
      <ol>
        {group.weeks.map((week) => (
          <WeekRow
            key={week.week}
            week={week}
            showDates={group.weeks.length > 1}
            started={started}
            today={today}
            done={done}
            isPlanned={isPlanned}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </section>
  );
}

function WeekRow({
  week,
  started,
  today,
  done,
  isPlanned,
  onSelect,
  showDates,
}: {
  week: PlanWeek;
  /** Datoene står allerede i fasen når den bare har én uke. */
  showDates: boolean;
  started: boolean;
  today: string;
  done: Set<string>;
  isPlanned: (date: string) => boolean;
  onSelect: (day: CalendarDay) => void;
}) {
  const planned = week.days.filter((d) => isPlanned(d.date)).length;
  const doneCount = week.days.filter((d) => done.has(d.date)).length;
  const isCurrent = started && week.state === 'current';
  const complete = planned > 0 && doneCount >= planned;
  return (
    <li
      aria-label={`Uke ${week.week}`}
      className={cx(
        'border-t border-[var(--c-hairline)] px-3 pt-2.5 pb-3',
        isCurrent && 'bg-accent/[0.07]',
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-[14px] font-semibold">
          Uke {week.week}
          {isCurrent && <span className="font-medium text-accent"> · denne uka</span>}
          {showDates && (
            <span className="font-normal text-muted">
              {' '}
              · {formatDayMonthRange(week.startDate, week.endDate)}
            </span>
          )}
        </p>
        <p
          className={cx(
            'num shrink-0 text-[12px]',
            complete ? 'font-semibold text-good' : 'text-muted',
          )}
        >
          {week.state === 'future' || !started
            ? `${planned} økter`
            : `${doneCount} av ${planned} økter`}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {week.days.map((d) => {
          const p = isPlanned(d.date);
          const isDone = done.has(d.date);
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={dayLabel(d.date, today, p, isDone)}
              className="pressable flex justify-center rounded-2xl py-0.5"
            >
              <DayMark date={d.date} today={today} planned={p} done={isDone} />
            </button>
          );
        })}
      </div>
    </li>
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
  const goal = stepGoal(settings.steps, day.week, isoWeekday(day.date), settings.stepsBonus);
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
          ? `${formatNumber(log.steps)} av ${formatNumber(goal)}`
          : `mål ${formatNumber(goal)}`,
    },
    ...(settings.backCare === false
      ? []
      : [
          { label: 'Core-rutine', value: log?.coreDone ? 'Gjort' : '–' },
          {
            label: 'Smerte',
            value: log?.pain != null ? `${log.pain}${pain ? ` (${pain.level})` : ''}` : '–',
          },
        ]),
  ];

  return (
    <Sheet open title={capitalize(formatWeekdayLong(day.date))} onClose={onClose}>
      <p className="text-sm text-muted">
        Uke {day.week}
        {day.phase ? ` · ${day.phase.name}` : ''} · {formatDate(day.date)}
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
                {w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} sett
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
