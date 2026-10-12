import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconCheck } from '../../components/icons';
import { Button, Card, EmptyState, InlineConfirm, Page, PageHeader } from '../../components/ui';
import { discardWorkout, finishWorkout, suggestionFor, swapExercise } from '../../data/workouts';
import { db } from '../../db';
import { formatDate, formatWeekdayLong } from '../../lib/dates';
import { enDash, formatNumber } from '../../lib/format';
import {
  parseRirTarget,
  phaseForWeek,
  prescriptionForWeek,
  resolveRirText,
  type WeekPrescription,
} from '../../lib/prescription';
import { bestE1rm, exerciseHistory, isStalled, suggestionText } from '../../lib/progression';
import { useAppData } from '../../state/appData';
import type { Exercise, SetLog, WorkoutLog } from '../../types';
import { ExerciseThumb } from '../../components/ExerciseImage';
import { StopWorkoutButton } from '../../components/StopWorkout';
import { ExerciseCard } from './ExerciseCard';
import { SwapSheet } from './SwapSheet';

export interface ExerciseView {
  exercise: Exercise;
  prescription: WeekPrescription;
  plannedName: string;
  suggestionText: string | null;
  hasHistory: boolean;
  stalled: boolean;
  isPR: boolean;
  /** Settene fra forrige gang øvelsen ble logget (for «Forrige»-kolonnen) */
  previousSets: SetLog[] | null;
}

function fallbackPrescription(exerciseId: string, sets: number, week: number): WeekPrescription {
  return {
    exerciseId,
    sets,
    baseSets: sets,
    repMin: 8,
    repMax: 12,
    rir: resolveRirText('2', week),
    rirLabel: '2',
    restSec: 90,
    startWeightNote: '',
    unit: 'reps',
  };
}

export function WorkoutScreen() {
  const { logId = '' } = useParams();
  const log = useLiveQuery(() => db.workoutLogs.get(logId).then((l) => l ?? null), [logId]);
  if (log === undefined) return null;
  if (log === null) {
    return (
      <Page>
        <PageHeader title="Økt" back="/trening" />
        <EmptyState>Fant ikke økta.</EmptyState>
      </Page>
    );
  }
  return log.status === 'done' ? <DoneWorkout log={log} /> : <ActiveWorkout log={log} />;
}

function useExerciseViews(log: WorkoutLog): (ExerciseView | null)[] {
  const { sessionsById, exercisesById, plan } = useAppData();
  const otherLogs = useLiveQuery(
    () => db.workoutLogs.filter((l) => l.status === 'done' && l.id !== log.id).toArray(),
    [log.id],
  );
  return useMemo(() => {
    const session = sessionsById.get(log.sessionId);
    const prescriptions = session ? prescriptionForWeek(session, plan.phases, log.week) : [];
    const byId = new Map(prescriptions.map((p) => [p.exerciseId, p]));
    const logs = otherLogs ?? [];
    return log.exercises.map((entry): ExerciseView | null => {
      const exercise = exercisesById.get(entry.exerciseId);
      if (!exercise) return null;
      const planned = byId.get(entry.plannedExerciseId);
      const prescription = planned
        ? { ...planned, exerciseId: exercise.id }
        : fallbackPrescription(exercise.id, entry.sets.length, log.week);
      const history = exerciseHistory(logs, exercise.id);
      const suggestion = history.length
        ? suggestionFor(exercise, prescription, logs, plan.progression)
        : null;
      const target = {
        sets: prescription.sets,
        repMin: prescription.repMin,
        repMax: prescription.repMax,
        rirTarget: parseRirTarget(prescription.rir),
        unit: prescription.unit,
      };
      const previousBest = Math.max(0, ...history.map((h) => h.bestE1rm));
      const currentBest = bestE1rm(entry.sets.filter((s) => s.done));
      return {
        exercise,
        prescription,
        plannedName: exercisesById.get(entry.plannedExerciseId)?.name ?? entry.plannedExerciseId,
        suggestionText: suggestion ? suggestionText(suggestion, target) : null,
        hasHistory: history.length > 0,
        stalled: isStalled(history.map((h) => h.bestE1rm)),
        isPR: history.length > 0 && currentBest > previousBest,
        previousSets: history.length ? history[history.length - 1].sets : null,
      };
    });
  }, [log, otherLogs, sessionsById, exercisesById, plan]);
}

function ActiveWorkout({ log }: { log: WorkoutLog }) {
  const { sessionsById, plan, exercises } = useAppData();
  const navigate = useNavigate();
  const views = useExerciseViews(log);
  const session = sessionsById.get(log.sessionId);
  const phase = phaseForWeek(plan.phases, log.week);
  const [manualOpen, setManualOpen] = useState<Record<number, boolean>>({});
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  const firstIncomplete = log.exercises.findIndex((e) => e.sets.some((s) => !s.done));
  const totalDone = log.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const totalSets = log.exercises.reduce((n, e) => n + e.sets.length, 0);
  const swapView = swapIndex !== null ? (views[swapIndex] ?? undefined) : undefined;

  return (
    <Page>
      <PageHeader
        title={session?.name ?? 'Økt'}
        subtitle={`Uke ${log.week}${phase ? ` · ${phase.name}` : ''} · ${formatWeekdayLong(log.date)}`}
        back="/trening"
        actions={
          <StopWorkoutButton
            compact
            log={log}
            onStopped={() => navigate('/trening', { replace: true })}
          />
        }
      />
      <div className="surface mb-4 rounded-[22px] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[15px] font-semibold" aria-live="polite">
            {totalDone} av {totalSets} sett ferdig
          </p>
          <p className="num text-[13px] text-muted">
            {totalSets ? Math.round((totalDone / totalSets) * 100) : 0} %
          </p>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${totalSets ? (totalDone / totalSets) * 100 : 0}%` }}
          />
        </div>
        {phase?.note && <p className="mt-3 text-[13px] text-muted">{phase.note}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {log.exercises.map((entry, i) => {
          const view = views[i];
          if (!view) return null;
          const open = manualOpen[i] ?? i === firstIncomplete;
          return (
            <ExerciseCard
              key={`${i}-${entry.exerciseId}`}
              logId={log.id}
              index={i}
              entry={entry}
              view={view}
              open={open}
              onToggle={() => setManualOpen((m) => ({ ...m, [i]: !open }))}
              onSwap={() => setSwapIndex(i)}
              incrementsKg={plan.progression.incrementsKg}
              stallRule={plan.progression.stallRule}
            />
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          size="lg"
          block
          disabled={totalDone === 0}
          onClick={async () => {
            await finishWorkout(db, log.id);
            navigate('/trening', { replace: true });
          }}
        >
          <IconCheck /> Fullfør økt
        </Button>
        <StopWorkoutButton log={log} onStopped={() => navigate('/trening', { replace: true })} />
      </div>

      {swapView && swapIndex !== null && (
        <SwapSheet
          open
          current={swapView.exercise}
          exercises={exercises}
          onClose={() => setSwapIndex(null)}
          onPick={async (exercise) => {
            await swapExercise(
              db,
              log.id,
              swapIndex,
              exercise,
              swapView.prescription,
              plan.progression,
            );
            setSwapIndex(null);
          }}
        />
      )}
    </Page>
  );
}

function DoneWorkout({ log }: { log: WorkoutLog }) {
  const { sessionsById, exercisesById } = useAppData();
  const navigate = useNavigate();
  const session = sessionsById.get(log.sessionId);
  return (
    <Page>
      <PageHeader
        title={session?.name ?? 'Økt'}
        subtitle={`Fullført ${formatDate(log.date)} · uke ${log.week}`}
        back="/trening"
      />
      <div className="flex flex-col gap-3">
        {log.exercises.map((entry, i) => {
          const exercise = exercisesById.get(entry.exerciseId);
          return (
            <Card key={i}>
              <Link
                to={`/trening/ovelse/${entry.exerciseId}`}
                className="flex items-center gap-3 font-semibold"
              >
                {exercise && <ExerciseThumb subject={exercise} size={40} />}
                <span className="flex-1">{exercise?.name ?? entry.exerciseId}</span>
              </Link>
              <ul className="num mt-2 flex flex-col gap-0.5 text-[14px] text-muted">
                {entry.sets.map((s, j) => (
                  <li key={j} className="tabular">
                    Sett {j + 1}: {formatNumber(s.kg, 2)} kg × {s.reps}
                    {s.rir !== null && s.rir !== undefined ? ` · RIR ${enDash(String(s.rir))}` : ''}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      <div className="mt-6">
        <InlineConfirm
          label="Slett økta"
          message="Økta fjernes fra historikken. Dette kan ikke angres."
          confirmLabel="Slett"
          onConfirm={async () => {
            await discardWorkout(db, log.id);
            navigate('/trening', { replace: true });
          }}
        />
      </div>
    </Page>
  );
}
