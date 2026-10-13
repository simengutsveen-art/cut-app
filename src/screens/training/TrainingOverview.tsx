import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCheck, IconChevronLeft, IconChevronRight, IconPlay } from '../../components/icons';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  LinkRow,
  ListCard,
  Page,
  PageHeader,
  SectionTitle,
} from '../../components/ui';
import { ExerciseThumb } from '../../components/ExerciseImage';
import { SessionCard } from '../../components/SessionCard';
import { StopWorkoutButton } from '../../components/StopWorkout';
import { startWorkout } from '../../data/workouts';
import { db } from '../../db';
import { useToday } from '../../hooks/useToday';
import { useWorkoutContext } from '../../hooks/useWorkoutContext';
import { cx } from '../../lib/cx';
import {
  formatDate,
  formatDateShort,
  isoWeekday,
  planStatusFor,
  planStatusLabel,
  weekDates,
  weekdayName,
} from '../../lib/dates';
import { dayPlanFor, phaseForWeek, prescriptionForWeek } from '../../lib/prescription';
import { formatSets } from '../../lib/progression';
import { useAppData } from '../../state/appData';
import { WEEKDAY_KEYS, type Session, type WorkoutLog } from '../../types';

export function TrainingOverview() {
  const { settings, plan, sessions, sessionsById, exercisesById } = useAppData();
  // Dagene økta står på i ukeplanen («mandag og torsdag»), eller at den ikke er i planen.
  const scheduledDays = (sessionId: string) => {
    const days = WEEKDAY_KEYS.filter((d) => settings.weeklySchedule[d] === sessionId).map((d) =>
      weekdayName(Number(d)),
    );
    return days.length ? days.join(' og ') : 'ikke i ukeplanen';
  };
  const today = useToday();
  const navigate = useNavigate();
  const ctx = useWorkoutContext();
  const status = planStatusFor(settings, today);
  const [week, setWeek] = useState(status.week);
  const phase = phaseForWeek(plan.phases, week);
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []);

  const byDate = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    for (const log of logs ?? []) map.set(log.date, [...(map.get(log.date) ?? []), log]);
    return map;
  }, [logs]);

  const active = (logs ?? []).find((l) => l.status === 'active');
  const todayPlan = dayPlanFor(settings, isoWeekday(today));
  const todaySession =
    todayPlan.kind === 'session' ? sessionsById.get(todayPlan.sessionId) : undefined;
  const todayDone = (byDate.get(today) ?? []).some(
    (l) => l.status === 'done' && l.sessionId === todaySession?.id,
  );

  const start = async (session: Session) => {
    const id = await startWorkout(db, session, today, ctx);
    navigate(`/trening/okt/${id}`);
  };

  const recent = (logs ?? [])
    .filter((l) => l.status === 'done')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt)
    .slice(0, 8);

  const loggedExerciseIds = new Set(
    (logs ?? [])
      .filter((l) => l.status === 'done')
      .flatMap((l) => l.exercises.map((e) => e.exerciseId)),
  );

  return (
    <Page>
      <PageHeader
        eyebrow={`${planStatusLabel(status, settings.weeks)}${phase && status.kind === 'active' ? ` · ${phase.name}` : ''}`}
        title="Trening"
      />

      {active ? (
        <Card tone="accent" className="rounded-[26px]">
          <p className="eyebrow text-accent">Økt pågår</p>
          <h2 className="mt-1 text-[24px] font-bold tracking-[-0.025em]">
            {sessionsById.get(active.sessionId)?.name}
          </h2>
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => navigate(`/trening/okt/${active.id}`)}
            >
              <IconPlay size={20} /> Fortsett økta
            </Button>
            <StopWorkoutButton compact log={active} className="min-h-14 rounded-2xl px-4" />
          </div>
        </Card>
      ) : todaySession ? (
        <SessionCard
          session={todaySession}
          week={status.week}
          done={todayDone}
          onStart={() => void start(todaySession)}
        />
      ) : (
        <Card className="rounded-[26px]">
          <p className="eyebrow">I dag</p>
          <h2 className="mt-1 text-[24px] font-bold tracking-[-0.025em]">Hviledag: lang tur</h2>
          <p className="mt-1 text-[15px] text-muted">Restitusjon er en del av planen.</p>
        </Card>
      )}

      {phase?.note && (
        <p className="mt-3 rounded-2xl bg-surface-2/70 px-4 py-3 text-[14px] text-muted shadow-[inset_0_0_0_1px_var(--c-hairline)]">
          <span className="font-semibold text-fg">{phase.name}.</span> {phase.note}
        </p>
      )}

      <SectionTitle
        action={
          <div className="flex items-center">
            <IconButton
              label="Forrige uke"
              disabled={week <= 1}
              onClick={() => setWeek((w) => w - 1)}
            >
              <IconChevronLeft />
            </IconButton>
            <span className="num w-16 text-center text-[15px] font-semibold">Uke {week}</span>
            <IconButton
              label="Neste uke"
              disabled={week >= settings.weeks}
              onClick={() => setWeek((w) => w + 1)}
            >
              <IconChevronRight />
            </IconButton>
          </div>
        }
      >
        Ukeoversikt
      </SectionTitle>
      <ListCard>
        <ul className="divide-y divide-[var(--c-hairline)]">
          {weekDates(week, settings.startDate).map((date) => {
            const dp = dayPlanFor(settings, isoWeekday(date));
            const session = dp.kind === 'session' ? sessionsById.get(dp.sessionId) : undefined;
            const dayLogs = byDate.get(date) ?? [];
            const done = dayLogs.filter((l) => l.status === 'done');
            const isToday = date === today;
            return (
              <li key={date} className="flex min-h-[60px] items-center gap-3 px-3.5 py-2">
                <span
                  className={cx(
                    'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] leading-none',
                    isToday
                      ? 'bg-accent text-on-accent'
                      : done.length > 0
                        ? 'bg-good/15 text-good'
                        : 'bg-surface-2',
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase opacity-80">
                    {weekdayName(isoWeekday(date), 'short')}
                  </span>
                  <span className="num mt-0.5 text-[16px] font-bold">
                    {formatDateShort(date).slice(0, 2)}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {session ? (
                    <span className="font-medium">{session.name}</span>
                  ) : (
                    <span className="text-muted">Hvile</span>
                  )}
                  {done
                    .filter((l) => l.sessionId !== session?.id)
                    .map((l) => (
                      <span key={l.id} className="text-muted">
                        {' '}
                        + {sessionsById.get(l.sessionId)?.name}
                      </span>
                    ))}
                </span>
                {done.length > 0 ? (
                  <Badge tone="good">
                    <IconCheck size={13} /> Gjort
                  </Badge>
                ) : dayLogs.some((l) => l.status === 'active') ? (
                  <Badge tone="accent">Pågår</Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      </ListCard>

      <SectionTitle
        action={
          <Link to="/mer/data/okter" className="text-[15px] font-medium text-accent">
            Endre øvelser
          </Link>
        }
      >
        Alle økter
      </SectionTitle>
      <div className="flex flex-col gap-2.5">
        {sessions
          .filter((s) => s.active)
          .map((s) => (
            <Card key={s.id} className="flex items-center gap-3 py-3.5">
              <div className="flex shrink-0 -space-x-3">
                {prescriptionForWeek(s, plan.phases, status.week)
                  .map((p) => exercisesById.get(p.exerciseId))
                  .filter((e) => !!e)
                  .slice(0, 2)
                  .map((e) => (
                    <ExerciseThumb
                      key={e.id}
                      subject={e}
                      size={40}
                      className="ring-[3px] ring-[var(--c-surface)]"
                    />
                  ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold tracking-[-0.01em]">{s.name}</div>
                <div className="truncate text-[13px] text-muted">
                  {prescriptionForWeek(s, plan.phases, status.week).length} øvelser ·{' '}
                  {scheduledDays(s.id)}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={!!active}
                onClick={() => void start(s)}
                aria-label={`Start økta ${s.name} nå`}
              >
                Start
              </Button>
            </Card>
          ))}
      </div>

      <SectionTitle>Siste økter</SectionTitle>
      {recent.length === 0 ? (
        <EmptyState>Ingen fullførte økter ennå.</EmptyState>
      ) : (
        <ListCard>
          {recent.map((l) => (
            <LinkRow
              key={l.id}
              to={`/trening/okt/${l.id}`}
              title={sessionsById.get(l.sessionId)?.name ?? l.sessionId}
              subtitle={`${formatDate(l.date)} · ${l.exercises.reduce((n, e) => n + e.sets.length, 0)} sett`}
            />
          ))}
        </ListCard>
      )}

      {loggedExerciseIds.size > 0 && (
        <>
          <SectionTitle>Historikk per øvelse</SectionTitle>
          <ListCard>
            {[...loggedExerciseIds]
              .map((id) => exercisesById.get(id))
              .filter((e) => !!e)
              .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
              .map((e) => {
                const last = (logs ?? [])
                  .filter((l) => l.status === 'done')
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .flatMap((l) => l.exercises.filter((x) => x.exerciseId === e.id))[0];
                return (
                  <LinkRow
                    key={e.id}
                    to={`/trening/ovelse/${e.id}`}
                    icon={<ExerciseThumb subject={e} size={36} className="rounded-[10px]" />}
                    title={e.name}
                    subtitle={last ? `Sist: ${formatSets(last.sets)}` : undefined}
                  />
                );
              })}
          </ListCard>
        </>
      )}
      <p className="mt-6 text-center">
        <Link to="/mer/core" className="text-[15px] font-medium text-accent">
          Core og rygg →
        </Link>
      </p>
    </Page>
  );
}
