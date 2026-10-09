import { describe, expect, it } from 'vitest';
import { initDatabase } from '../../src/data/seedSync';
import {
  buildWorkoutLog,
  completeSet,
  extendRest,
  finishWorkout,
  getActiveWorkout,
  startWorkout,
  swapExercise,
  updateSet,
  type WorkoutContext,
} from '../../src/data/workouts';
import { prescriptionForWeek } from '../../src/lib/prescription';
import type { Exercise, Session } from '../../src/types';
import { fixtureSeed, freshDb } from '../helpers';

const seed = fixtureSeed();
const exercisesById = new Map<string, Exercise>(
  seed.exercises.map((e) => [e.id, { ...e, source: 'seed', userModified: false, active: true }]),
);
const sessionOf = (id: string): Session => ({
  ...seed.sessions.find((s) => s.id === id)!,
  source: 'seed',
  userModified: false,
  active: true,
});
const ctx: WorkoutContext = {
  settings: seed.settings,
  phases: seed.phases,
  progression: seed.progression,
  exercisesById,
};

describe('økt-logg', () => {
  it('forhåndsutfyller med forskrivning og startvekt', () => {
    const log = buildWorkoutLog(sessionOf('okt1'), '2026-10-12', ctx, []);
    expect(log.week).toBe(1);
    expect(log.status).toBe('active');
    expect(log.exercises).toHaveLength(7);
    expect(log.exercises.reduce((n, e) => n + e.sets.length, 0)).toBe(15);
    expect(log.exercises[0]).toMatchObject({ exerciseId: 'benkpress' });
    expect(log.exercises[0].sets).toEqual([
      { kg: 60, reps: 5, rir: null, done: false },
      { kg: 60, reps: 5, rir: null, done: false },
      { kg: 60, reps: 5, rir: null, done: false },
    ]);
  });

  it('lagres fortløpende, og pausetimeren bruker tidsstempler', async () => {
    const db = freshDb();
    await initDatabase(db, seed);
    const id = await startWorkout(db, sessionOf('okt1'), '2026-10-12', ctx);
    expect(await startWorkout(db, sessionOf('okt1'), '2026-10-12', ctx)).toBe(id);

    await updateSet(db, id, 0, 0, { kg: 62.5, reps: 6 });
    await completeSet(db, id, 0, 0, 150, 1_000_000);
    let log = (await db.workoutLogs.get(id))!;
    expect(log.exercises[0].sets[0]).toMatchObject({ kg: 62.5, reps: 6, done: true });
    // Senere sett arver ny vekt
    expect(log.exercises[0].sets[1].kg).toBe(62.5);
    expect(log.rest).toEqual({ endsAt: 1_150_000, durationSec: 150 });

    await extendRest(db, id, 30, 1_100_000);
    log = (await db.workoutLogs.get(id))!;
    expect(log.rest?.endsAt).toBe(1_180_000);

    expect((await getActiveWorkout(db))?.id).toBe(id);
    await finishWorkout(db, id);
    log = (await db.workoutLogs.get(id))!;
    expect(log.status).toBe('done');
    expect(log.exercises).toHaveLength(1);
    expect(log.exercises[0].sets).toHaveLength(1);
    expect(await getActiveWorkout(db)).toBeUndefined();
    db.close();
  });

  it('neste økt foreslår progresjon fra forrige logg', async () => {
    const db = freshDb();
    await initDatabase(db, seed);
    const id = await startWorkout(db, sessionOf('okt1'), '2026-10-12', ctx);
    for (let i = 0; i < 3; i++) {
      await updateSet(db, id, 0, i, { reps: 8 });
      await completeSet(db, id, 0, i, 0);
    }
    await finishWorkout(db, id);
    const next = buildWorkoutLog(
      sessionOf('okt1'),
      '2026-10-19',
      ctx,
      await db.workoutLogs.toArray(),
    );
    expect(next.exercises[0].sets[0].kg).toBe(62.5);
    db.close();
  });

  it('bytte midt i økta beholder ferdige sett', async () => {
    const db = freshDb();
    await initDatabase(db, seed);
    const id = await startWorkout(db, sessionOf('okt2'), '2026-10-13', ctx);
    await completeSet(db, id, 0, 0, 0);
    const p = prescriptionForWeek(sessionOf('okt2'), seed.phases, 1)[0];
    await swapExercise(db, id, 0, exercisesById.get('nedtrekk_bredt')!, p, seed.progression);
    const log = (await db.workoutLogs.get(id))!;
    expect(log.exercises[0]).toMatchObject({ exerciseId: 'pullups' });
    expect(log.exercises[0].sets).toHaveLength(1);
    expect(log.exercises[1]).toMatchObject({
      exerciseId: 'nedtrekk_bredt',
      plannedExerciseId: 'pullups',
    });
    expect(log.exercises[1].sets).toHaveLength(2);
    db.close();
  });
});
