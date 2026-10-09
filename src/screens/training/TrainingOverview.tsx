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
import { startWorkout } from '../../data/workouts';
import { db } from '../../db';
import { useToday } from '../../hooks/useToday';
import { useWorkoutContext } from '../../hooks/useWorkoutContext';
import { cx } from '../../lib/cx';
import {
  formatDate,
  formatDateShort,
  isoWeekday,
  planStatus,
  planStatusLabel,
  weekDates,
  weekdayName,
} from '../../lib/dates';
import { dayPlanFor, phaseForWeek, prescriptionForWeek } from '../../lib/prescription';
import { formatSets } from '../../lib/progression';
import { useAppData } from '../../state/appData';
import type { Session, WorkoutLog } from '../../types';

export function TrainingOverview() {
  const { settings, plan, sessions, sessionsById, exercisesById } = useAppData();
  const today = useToday();
  const navigate = useNavigate();
  const ctx = useWorkoutContext();
  const status = planStatus(today, settings.startDate, settings.weeks);
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
        title="Trening"
        subtitle={`${planStatusLabel(status, settings.weeks)}${phase && status.kind === 'active' ? ` · ${phase.name}` : ''}`}
      />

      {active ? (
        <Card tone="accent">
          <p className="text-sm text-muted">Økt pågår</p>
          <h2 className="text-xl font-bold">{sessionsById.get(active.sessionId)?.name}</h2>
          <Button
            className="mt-3"
            block
            size="lg"
            onClick={() => navigate(`/trening/okt/${active.id}`)}
          >
            <IconPlay size={20} /> Fortsett økta
          </Button>
        </Card>
      ) : todaySession ? (
        <Card tone={todayDone ? 'good' : 'accent'}>
          <p className="text-sm text-muted">Dagens økt</p>
          <h2 className="text-xl font-bold">{todaySession.name}</h2>
          <p className="text-sm text-muted">
            {prescriptionForWeek(todaySession, plan.phases, status.week).length} øvelser
          </p>
          {todayDone ? (
            <p className="mt-2 flex items-center gap-1 font-semibold text-good">
              <IconCheck size={18} /> Fullført i dag
            </p>
          ) : (
            <Button className="mt-3" block size="lg" onClick={() => void start(todaySession)}>
              <IconPlay size={20} /> Start {todaySession.name}
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">I dag</p>
          <h2 className="text-xl font-bold">Hviledag: lang tur</h2>
        </Card>
      )}

      {phase?.note && (
        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-fg">{phase.name}:</span> {phase.note}
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
            <span className="tabular w-16 text-center text-sm font-semibold">Uke {week}</span>
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
        <ul>
          {weekDates(week, settings.startDate).map((date) => {
            const dp = dayPlanFor(settings, isoWeekday(date));
            const session = dp.kind === 'session' ? sessionsById.get(dp.sessionId) : undefined;
            const dayLogs = byDate.get(date) ?? [];
            const done = dayLogs.filter((l) => l.status === 'done');
            const isToday = date === today;
            return (
              <li
                key={date}
                className={cx(
                  'flex min-h-12 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0',
                  isToday && 'bg-accent/10',
                )}
              >
                <span className="w-20 shrink-0 text-sm">
                  <span className="font-semibold capitalize">
                    {weekdayName(isoWeekday(date), 'short')}
                  </span>{' '}
                  <span className="text-muted">{formatDateShort(date)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {session ? session.name : <span className="text-muted">Hvile</span>}
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
                    <IconCheck size={14} /> Gjort
                  </Badge>
                ) : dayLogs.some((l) => l.status === 'active') ? (
                  <Badge tone="accent">Pågår</Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      </ListCard>

      <SectionTitle>Alle økter</SectionTitle>
      <div className="flex flex-col gap-2">
        {sessions
          .filter((s) => s.active)
          .map((s) => (
            <Card key={s.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-muted">
                  {prescriptionForWeek(s, plan.phases, status.week)
                    .map((p) => exercisesById.get(p.exerciseId)?.name)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(', ')}
                  …
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
                    title={e.name}
                    subtitle={last ? `Sist: ${formatSets(last.sets)}` : undefined}
                  />
                );
              })}
          </ListCard>
        </>
      )}
      <p className="mt-6 text-center">
        <Link to="/mer/core" className="text-sm font-semibold text-accent">
          Core og rygg →
        </Link>
      </p>
    </Page>
  );
}
