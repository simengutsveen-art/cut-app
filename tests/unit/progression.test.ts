import { describe, expect, it } from 'vitest';
import {
  e1rm,
  exerciseHistory,
  isStalled,
  kgStep,
  suggestNext,
  suggestionText,
  type ProgressionTarget,
} from '../../src/lib/progression';
import type { WorkoutLog } from '../../src/types';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();
const inc = seed.progression.incrementsKg;
const sets = (kg: number, reps: number[], rir?: number) =>
  reps.map((r) => ({ kg, reps: r, rir, done: true }));
const bench: ProgressionTarget = {
  sets: 4,
  repMin: 5,
  repMax: 8,
  rirTarget: { min: 2, max: 2 },
  unit: 'reps',
};

describe('dobbel progresjon', () => {
  it('benkpress 60 × 8, 8, 8, 8 (5–8) → 62,5 kg', () => {
    const s = suggestNext({
      previousSets: sets(60, [8, 8, 8, 8]),
      target: bench,
      loadType: 'stang_overkropp',
      incrementsKg: inc,
    });
    expect(s.kind).toBe('increase');
    expect(s.kg).toBe(62.5);
    expect(s.reps).toEqual([5, 5, 5, 5]);
  });

  it('60 × 8, 7, 6, 6 → 60 kg', () => {
    const s = suggestNext({
      previousSets: sets(60, [8, 7, 6, 6]),
      target: bench,
      loadType: 'stang_overkropp',
      incrementsKg: inc,
    });
    expect(s.kind).toBe('repeat');
    expect(s.kg).toBe(60);
    expect(Math.min(...s.reps)).toBe(7);
  });

  it('«Forrige: 60 × 8, 8, 7, 6 → prøv 60 × 8, 8, 8, 7»', () => {
    const s = suggestNext({
      previousSets: sets(60, [8, 8, 7, 6]),
      target: bench,
      loadType: 'stang_overkropp',
      incrementsKg: inc,
    });
    expect(s.reps).toEqual([8, 8, 8, 7]);
    expect(suggestionText(s, bench)).toBe('Forrige: 60 × 8, 8, 7, 6 → prøv 60 × 8, 8, 8, 7');
  });

  it('RIR under målet hindrer økning', () => {
    const s = suggestNext({
      previousSets: sets(60, [8, 8, 8, 8], 0),
      target: bench,
      loadType: 'stang_overkropp',
      incrementsKg: inc,
    });
    expect(s.kg).toBe(60);
  });

  it('manualer 24 kg på toppen → 26 kg', () => {
    const target: ProgressionTarget = {
      sets: 3,
      repMin: 8,
      repMax: 12,
      rirTarget: { min: 1, max: 2 },
      unit: 'reps',
    };
    const s = suggestNext({
      previousSets: sets(24, [12, 12, 12]),
      target,
      loadType: 'manualer',
      incrementsKg: inc,
    });
    expect(s.kg).toBe(26);
  });

  it('beinpress → +10 kg', () => {
    const target: ProgressionTarget = {
      sets: 4,
      repMin: 6,
      repMax: 10,
      rirTarget: { min: 2, max: 2 },
      unit: 'reps',
    };
    const s = suggestNext({
      previousSets: sets(120, [10, 10, 10, 10]),
      target,
      loadType: 'maskin_underkropp',
      incrementsKg: inc,
    });
    expect(s.kg).toBe(130);
  });

  it('kroppsvekt og core: flere reps eller meter', () => {
    const target: ProgressionTarget = {
      sets: 4,
      repMin: 6,
      repMax: 10,
      rirTarget: null,
      unit: 'reps',
    };
    const s = suggestNext({
      previousSets: sets(0, [10, 9, 8, 8]),
      target,
      loadType: 'kroppsvekt',
      incrementsKg: inc,
    });
    expect(s.kind).toBe('more-reps');
    expect(s.reps).toEqual([11, 10, 9, 9]);
    const carry: ProgressionTarget = {
      sets: 3,
      repMin: 30,
      repMax: 40,
      rirTarget: null,
      unit: 'meter',
    };
    const c = suggestNext({
      previousSets: sets(22, [30, 30, 30]),
      target: carry,
      loadType: 'core',
      incrementsKg: inc,
    });
    expect(c.reps).toEqual([35, 35, 35]);
    expect(c.kg).toBe(22);
  });

  it('første gang bruker startvekt og repMin', () => {
    const s = suggestNext({
      previousSets: null,
      target: bench,
      loadType: 'stang_overkropp',
      incrementsKg: inc,
      startKg: 60,
    });
    expect(s).toMatchObject({ kind: 'first', kg: 60, reps: [5, 5, 5, 5] });
  });

  it('tilpasser antall sett til uka', () => {
    const target = { ...bench, sets: 3 };
    const s = suggestNext({
      previousSets: sets(60, [8, 8, 7, 6]),
      target,
      loadType: 'stang_overkropp',
      incrementsKg: inc,
    });
    expect(s.reps).toEqual([8, 8, 8]);
  });

  it('kg-steg for ±-knappene', () => {
    expect(kgStep('stang_overkropp', inc)).toBe(2.5);
    expect(kgStep('maskin_underkropp', inc)).toBe(5);
    expect(kgStep('kroppsvekt', inc)).toBe(1);
  });
});

describe('e1RM og stagnasjon', () => {
  it('Epley', () => {
    expect(e1rm(60, 8)).toBeCloseTo(76, 5);
    expect(e1rm(100, 0)).toBe(0);
  });

  it('stall når beste e1RM har gått ned tre økter på rad', () => {
    expect(isStalled([80, 79, 78, 77])).toBe(true);
    expect(isStalled([80, 79, 79, 77])).toBe(false);
    expect(isStalled([79, 78, 77])).toBe(false);
  });

  it('historikk fra fullførte økter', () => {
    const log = (
      id: string,
      date: string,
      reps: number[],
      status: 'done' | 'active' = 'done',
    ): WorkoutLog => ({
      id,
      date,
      sessionId: 'okt1',
      week: 1,
      status,
      startedAt: Date.parse(date),
      exercises: [
        { exerciseId: 'benkpress', plannedExerciseId: 'benkpress', sets: sets(60, reps) },
      ],
    });
    const h = exerciseHistory(
      [
        log('b', '2026-10-19', [8, 8, 8, 8]),
        log('a', '2026-10-12', [8, 7, 6]),
        log('c', '2026-10-26', [8], 'active'),
      ],
      'benkpress',
    );
    expect(h.map((p) => p.logId)).toEqual(['a', 'b']);
    expect(h[1].heaviest).toEqual({ kg: 60, reps: 8 });
  });
});
