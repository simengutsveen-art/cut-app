import { describe, expect, it } from 'vitest';
import { formatElapsed, formatWorkoutDuration, workoutStats } from '../../src/lib/workoutStats';
import type { WorkoutLog } from '../../src/types';

const log = (
  id: string,
  date: string,
  startedAt: number,
  exercises: [string, [number, number, boolean?][]][],
  finishedAt: number | null = startedAt + 52 * 60_000,
): WorkoutLog => ({
  id,
  date,
  sessionId: 'okt1',
  week: 1,
  status: 'done',
  startedAt,
  finishedAt,
  exercises: exercises.map(([exerciseId, sets]) => ({
    exerciseId,
    plannedExerciseId: exerciseId,
    sets: sets.map(([kg, reps, done = true]) => ({ kg, reps, done })),
  })),
});

describe('oppsummering av økt', () => {
  const first = log('a', '2026-10-12', 1000, [
    [
      'benkpress',
      [
        [60, 8],
        [60, 8],
        [60, 7],
      ],
    ],
  ]);
  const second = log('b', '2026-10-19', 2000, [
    [
      'benkpress',
      [
        [62.5, 6],
        [62.5, 6],
        [62.5, 5, false],
      ],
    ],
    ['pallof', [[10, 10]]],
  ]);

  it('varighet, sett og volum (bare ferdige sett, uten core)', () => {
    const s = workoutStats(second, [first, second], (id) => id !== 'pallof');
    expect(s.durationMs).toBe(52 * 60_000);
    expect(s.sets).toBe(3);
    expect(s.exercises).toBe(2);
    expect(s.volumeKg).toBe(62.5 * 6 * 2);
  });

  it('PR når beste e1RM slår tidligere økter', () => {
    // 62,5 × 6 → e1RM 75,0; 60 × 8 → 76,0. Ingen PR.
    expect(workoutStats(second, [first, second]).prExerciseIds).toEqual([]);
    const strong = log('c', '2026-10-26', 3000, [['benkpress', [[65, 7]]]]);
    expect(workoutStats(strong, [first, second, strong]).prExerciseIds).toEqual(['benkpress']);
    // Første gang en øvelse logges, er det ingen PR å sammenligne med.
    expect(workoutStats(first, [first]).prExerciseIds).toEqual([]);
  });

  it('formatering', () => {
    expect(formatWorkoutDuration(20_000)).toBe('< 1 min');
    expect(formatWorkoutDuration(52 * 60_000)).toBe('52 min');
    expect(formatWorkoutDuration(65 * 60_000)).toBe('1 t 05 min');
    expect(formatElapsed(754_000)).toBe('12:34');
    expect(formatElapsed(3_723_000)).toBe('1:02:03');
  });
});
