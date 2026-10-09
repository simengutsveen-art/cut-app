import type { CutDB } from '../db';
import { planWeek } from '../lib/dates';
import {
  parseRirTarget,
  parseStartWeight,
  prescriptionForWeek,
  type WeekPrescription,
} from '../lib/prescription';
import { previousSetsFor, suggestNext, type Suggestion } from '../lib/progression';
import { newId } from '../lib/util';
import type {
  AppSettings,
  Exercise,
  Phase,
  Progression,
  Session,
  SetLog,
  WorkoutExerciseLog,
  WorkoutLog,
} from '../types';

export interface WorkoutContext {
  settings: Pick<AppSettings, 'startDate' | 'weeks'>;
  phases: Phase[];
  progression: Progression;
  exercisesById: Map<string, Exercise>;
}

/** Forslag for én øvelse basert på forrige logg. */
export function suggestionFor(
  exercise: Exercise,
  prescription: Pick<
    WeekPrescription,
    'sets' | 'repMin' | 'repMax' | 'rir' | 'unit' | 'startWeightNote'
  >,
  logs: WorkoutLog[],
  progression: Progression,
  excludeLogId?: string,
): Suggestion {
  return suggestNext({
    previousSets: previousSetsFor(logs, exercise.id, excludeLogId),
    target: {
      sets: prescription.sets,
      repMin: prescription.repMin,
      repMax: prescription.repMax,
      rirTarget: parseRirTarget(prescription.rir),
      unit: prescription.unit,
    },
    loadType: exercise.loadType,
    incrementsKg: progression.incrementsKg,
    startKg: parseStartWeight(prescription.startWeightNote),
  });
}

function setsFromSuggestion(s: Suggestion): SetLog[] {
  return s.reps.map((reps) => ({ kg: s.kg, reps, rir: null, done: false }));
}

/** Lager en ny økt-logg (forhåndsutfylt med forslagene). */
export function buildWorkoutLog(
  session: Session,
  date: string,
  ctx: WorkoutContext,
  logs: WorkoutLog[],
  now = Date.now(),
): WorkoutLog {
  const week = planWeek(date, ctx.settings.startDate, ctx.settings.weeks);
  const exercises: WorkoutExerciseLog[] = [];
  for (const p of prescriptionForWeek(session, ctx.phases, week)) {
    const exercise = ctx.exercisesById.get(p.exerciseId);
    if (!exercise) continue;
    const suggestion = suggestionFor(exercise, p, logs, ctx.progression);
    exercises.push({
      exerciseId: exercise.id,
      plannedExerciseId: exercise.id,
      sets: setsFromSuggestion(suggestion),
    });
  }
  return {
    id: newId('okt'),
    date,
    sessionId: session.id,
    week,
    status: 'active',
    startedAt: now,
    finishedAt: null,
    exercises,
    rest: null,
  };
}

export async function getActiveWorkout(db: CutDB): Promise<WorkoutLog | undefined> {
  const active = await db.workoutLogs.where('status').equals('active').toArray();
  return active.sort((a, b) => b.startedAt - a.startedAt)[0];
}

/** Starter en økt, eller fortsetter en aktiv økt av samme type samme dag. */
export async function startWorkout(
  db: CutDB,
  session: Session,
  date: string,
  ctx: WorkoutContext,
): Promise<string> {
  return db.transaction('rw', db.workoutLogs, async () => {
    const existing = await db.workoutLogs
      .where('date')
      .equals(date)
      .filter((l) => l.status === 'active' && l.sessionId === session.id)
      .first();
    if (existing) return existing.id;
    const logs = await db.workoutLogs.toArray();
    const log = buildWorkoutLog(session, date, ctx, logs);
    await db.workoutLogs.add(log);
    return log.id;
  });
}

async function mutate(db: CutDB, id: string, fn: (log: WorkoutLog) => void): Promise<void> {
  await db.transaction('rw', db.workoutLogs, async () => {
    const log = await db.workoutLogs.get(id);
    if (!log) return;
    fn(log);
    await db.workoutLogs.put(log);
  });
}

/** Endrer et sett. Endres vekten, får senere sett som ikke er gjort samme vekt. */
export function updateSet(
  db: CutDB,
  id: string,
  exIndex: number,
  setIndex: number,
  patch: Partial<SetLog>,
): Promise<void> {
  return mutate(db, id, (log) => {
    const ex = log.exercises[exIndex];
    const set = ex?.sets[setIndex];
    if (!set) return;
    Object.assign(set, patch);
    if (patch.kg !== undefined) {
      for (const later of ex.sets.slice(setIndex + 1)) if (!later.done) later.kg = patch.kg;
    }
  });
}

/** Merker et sett som ferdig og starter pausetimeren. */
export function completeSet(
  db: CutDB,
  id: string,
  exIndex: number,
  setIndex: number,
  restSec: number,
  now = Date.now(),
): Promise<void> {
  return mutate(db, id, (log) => {
    const ex = log.exercises[exIndex];
    const set = ex?.sets[setIndex];
    if (!set) return;
    set.done = true;
    log.rest = restSec > 0 ? { endsAt: now + restSec * 1000, durationSec: restSec } : null;
  });
}

export function uncompleteSet(db: CutDB, id: string, exIndex: number, setIndex: number) {
  return updateSet(db, id, exIndex, setIndex, { done: false });
}

export function addSet(db: CutDB, id: string, exIndex: number): Promise<void> {
  return mutate(db, id, (log) => {
    const ex = log.exercises[exIndex];
    if (!ex) return;
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ kg: last?.kg ?? 0, reps: last?.reps ?? 8, rir: null, done: false });
  });
}

export function removeSet(db: CutDB, id: string, exIndex: number, setIndex: number) {
  return mutate(db, id, (log) => {
    const ex = log.exercises[exIndex];
    if (ex && ex.sets.length > 1) ex.sets.splice(setIndex, 1);
  });
}

export function setRest(db: CutDB, id: string, rest: WorkoutLog['rest']): Promise<void> {
  return mutate(db, id, (log) => {
    log.rest = rest;
  });
}

export function extendRest(db: CutDB, id: string, seconds: number, now = Date.now()) {
  return mutate(db, id, (log) => {
    if (!log.rest) return;
    const base = Math.max(log.rest.endsAt, now);
    log.rest = { endsAt: base + seconds * 1000, durationSec: log.rest.durationSec + seconds };
  });
}

/**
 * Bytter øvelse midt i økta. Har noen sett allerede blitt gjort, beholdes de på den
 * opprinnelige øvelsen, og resten av settene flyttes til den nye.
 */
export async function swapExercise(
  db: CutDB,
  id: string,
  exIndex: number,
  newExercise: Exercise,
  prescription: Pick<
    WeekPrescription,
    'sets' | 'repMin' | 'repMax' | 'rir' | 'unit' | 'startWeightNote'
  >,
  progression: Progression,
): Promise<void> {
  const logs = await db.workoutLogs.toArray();
  const suggestion = suggestionFor(newExercise, prescription, logs, progression, id);
  await mutate(db, id, (log) => {
    const ex = log.exercises[exIndex];
    if (!ex || ex.exerciseId === newExercise.id) return;
    const doneSets = ex.sets.filter((s) => s.done);
    const remaining = Math.max(1, ex.sets.length - doneSets.length);
    const sets = setsFromSuggestion(suggestion).slice(0, remaining);
    while (sets.length < remaining) sets.push({ ...sets[sets.length - 1] });
    const replacement: WorkoutExerciseLog = {
      exerciseId: newExercise.id,
      plannedExerciseId: ex.plannedExerciseId,
      sets,
    };
    if (doneSets.length > 0) {
      ex.sets = doneSets;
      log.exercises.splice(exIndex + 1, 0, replacement);
    } else {
      log.exercises[exIndex] = replacement;
    }
  });
}

/** Fullfører økta: bare ferdige sett beholdes. */
export function finishWorkout(db: CutDB, id: string, now = Date.now()): Promise<void> {
  return mutate(db, id, (log) => {
    log.exercises = log.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0);
    log.status = 'done';
    log.finishedAt = now;
    log.rest = null;
  });
}

export async function discardWorkout(db: CutDB, id: string): Promise<void> {
  await db.workoutLogs.delete(id);
}
