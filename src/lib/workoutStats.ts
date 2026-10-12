import type { WorkoutLog } from '../types';
import { bestE1rm, exerciseHistory } from './progression';

export interface WorkoutStats {
  /** Varighet i ms (null hvis økta ikke er fullført) */
  durationMs: number | null;
  exercises: number;
  sets: number;
  /** Sum kg × reps for vektøvelser */
  volumeKg: number;
  /** Øvelser med ny beste e1RM sammenlignet med tidligere økter */
  prExerciseIds: string[];
}

/** Er økta `a` logget før økta `b`? */
function before(a: WorkoutLog, b: WorkoutLog): boolean {
  return a.date < b.date || (a.date === b.date && a.startedAt < b.startedAt);
}

/**
 * Oppsummering av en økt: varighet, antall sett, volum og PR-er.
 * `countsForVolume` avgjør hvilke øvelser som teller i volumet (f.eks. ikke core/meter).
 */
export function workoutStats(
  log: WorkoutLog,
  allLogs: WorkoutLog[],
  countsForVolume: (exerciseId: string) => boolean = () => true,
): WorkoutStats {
  const doneByExercise = new Map<string, { kg: number; reps: number }[]>();
  for (const entry of log.exercises) {
    const sets = entry.sets.filter((s) => s.done && s.reps > 0);
    if (!sets.length) continue;
    doneByExercise.set(entry.exerciseId, [
      ...(doneByExercise.get(entry.exerciseId) ?? []),
      ...sets,
    ]);
  }
  let sets = 0;
  let volumeKg = 0;
  const prExerciseIds: string[] = [];
  const earlier = allLogs.filter((l) => l.id !== log.id && l.status === 'done' && before(l, log));
  for (const [exerciseId, list] of doneByExercise) {
    sets += list.length;
    if (countsForVolume(exerciseId)) volumeKg += list.reduce((n, s) => n + s.kg * s.reps, 0);
    const history = exerciseHistory(earlier, exerciseId);
    if (history.length === 0) continue;
    const previousBest = Math.max(...history.map((h) => h.bestE1rm));
    if (bestE1rm(list) > previousBest) prExerciseIds.push(exerciseId);
  }
  return {
    durationMs: log.finishedAt ? Math.max(0, log.finishedAt - log.startedAt) : null,
    exercises: doneByExercise.size,
    sets,
    volumeKg,
    prExerciseIds,
  };
}

/** «52 min» eller «1 t 05 min» */
export function formatWorkoutDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 1) return '< 1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} t ${String(m).padStart(2, '0')} min`;
}

/** «12:34» eller «1:02:03» for en tidtaker som går */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
