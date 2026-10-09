import type { RepUnit, SetLog, WorkoutLog } from '../types';
import { formatNumber } from './format';

/** Epley: kg × (1 + reps/30) */
export function e1rm(kg: number, reps: number): number {
  if (reps <= 0) return 0;
  return kg * (1 + reps / 30);
}

export function bestE1rm(sets: Pick<SetLog, 'kg' | 'reps'>[]): number {
  return sets.reduce((best, s) => Math.max(best, e1rm(s.kg, s.reps)), 0);
}

/** Tyngste sett (høyest kg, deretter flest reps). */
export function heaviestSet(
  sets: Pick<SetLog, 'kg' | 'reps'>[],
): { kg: number; reps: number } | null {
  let best: { kg: number; reps: number } | null = null;
  for (const s of sets) {
    if (s.reps <= 0) continue;
    if (!best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps)) {
      best = { kg: s.kg, reps: s.reps };
    }
  }
  return best;
}

/** Lasttyper der progresjon skjer med reps/meter i stedet for kg. */
export const REP_PROGRESSION_LOAD_TYPES = ['kroppsvekt', 'core'];

export interface ProgressionTarget {
  sets: number;
  repMin: number;
  repMax: number;
  /** RIR-mål (fra uka), eller null */
  rirTarget: { min: number; max: number } | null;
  unit: RepUnit;
}

export type SuggestionKind = 'first' | 'increase' | 'repeat' | 'more-reps';

export interface Suggestion {
  kind: SuggestionKind;
  kg: number;
  reps: number[];
  /** Forrige logg (tyngste vekt og reps per sett) */
  previous: { kg: number; reps: number[] } | null;
}

function fmtKg(kg: number): string {
  return formatNumber(kg, 2);
}

/** Resampler en liste reps til ønsket antall sett. */
function fitLength(reps: number[], length: number, fill: number): number[] {
  const out = reps.slice(0, length);
  while (out.length < length) out.push(out.length ? Math.min(...out) : fill);
  return out;
}

/**
 * Dobbel progresjon basert på forrige logg av samme øvelse:
 * - alle arbeidssett på repMax (og RIR ikke under målet, hvis logget) → øk vekten
 * - ellers samme vekt og +1 rep på settene under toppen (alltid det svakeste)
 * - kroppsvekt og core: flere reps eller meter
 */
export function suggestNext(params: {
  previousSets: Pick<SetLog, 'kg' | 'reps' | 'rir'>[] | null;
  target: ProgressionTarget;
  loadType: string;
  incrementsKg: Record<string, number>;
  startKg?: number | null;
}): Suggestion {
  const { target, loadType, incrementsKg } = params;
  const previousSets = (params.previousSets ?? []).filter((s) => s.reps > 0);

  if (previousSets.length === 0) {
    return {
      kind: 'first',
      kg: params.startKg ?? 0,
      reps: Array.from({ length: target.sets }, () => target.repMin),
      previous: null,
    };
  }

  const kg = Math.max(...previousSets.map((s) => s.kg));
  const prevReps = previousSets.map((s) => s.reps);
  const previous = { kg, reps: prevReps };
  const repStep = target.unit === 'meter' ? 5 : 1;

  if (REP_PROGRESSION_LOAD_TYPES.includes(loadType)) {
    return {
      kind: 'more-reps',
      kg,
      reps: fitLength(
        prevReps.map((r) => r + repStep),
        target.sets,
        target.repMin,
      ),
      previous,
    };
  }

  const allAtTop = previousSets.every((s) => s.reps >= target.repMax);
  const rirOk = previousSets.every(
    (s) =>
      s.rir === null || s.rir === undefined || !target.rirTarget || s.rir >= target.rirTarget.min,
  );
  const increment = incrementsKg[loadType] ?? 0;

  if (allAtTop && rirOk && increment > 0) {
    return {
      kind: 'increase',
      kg: kg + increment,
      reps: Array.from({ length: target.sets }, () => target.repMin),
      previous,
    };
  }

  // Samme vekt: +1 rep på hvert sett under toppen. Det svakeste settet får alltid +1.
  const weakest = Math.min(...prevReps);
  const next = prevReps.map((r) =>
    r === weakest ? r + 1 : r < target.repMax ? Math.min(target.repMax, r + 1) : r,
  );
  return { kind: 'repeat', kg, reps: fitLength(next, target.sets, target.repMin), previous };
}

function unitLabel(unit: RepUnit): string {
  return unit === 'meter' ? ' m' : '';
}

/** «Forrige: 60 × 8, 8, 7, 6 → prøv 60 × 8, 8, 8, 7» */
export function suggestionText(s: Suggestion, target: ProgressionTarget): string {
  const u = unitLabel(target.unit);
  const goal = `${fmtKg(s.kg)} × ${s.reps.join(', ')}${u}`;
  if (!s.previous)
    return s.kg > 0
      ? `Start: ${goal}`
      : `Første gang: finn en vekt som gir ${target.repMin}–${target.repMax}${u}`;
  const prev = `Forrige: ${fmtKg(s.previous.kg)} × ${s.previous.reps.join(', ')}${u}`;
  if (s.kind === 'increase') {
    return `${prev} → øk til ${fmtKg(s.kg)} kg (${target.repMin}–${target.repMax} reps)`;
  }
  return `${prev} → prøv ${goal}`;
}

/** Beste e1RM har gått ned tre økter på rad (fire økter med fallende e1RM). */
export function isStalled(bestE1rmHistory: number[]): boolean {
  if (bestE1rmHistory.length < 4) return false;
  const last = bestE1rmHistory.slice(-4);
  return last[1] < last[0] && last[2] < last[1] && last[3] < last[2];
}

export interface ExerciseHistoryPoint {
  date: string;
  logId: string;
  sets: SetLog[];
  bestE1rm: number;
  heaviest: { kg: number; reps: number } | null;
}

/** Historikk for én øvelse fra fullførte økter, eldste først. */
export function exerciseHistory(logs: WorkoutLog[], exerciseId: string): ExerciseHistoryPoint[] {
  const points: ExerciseHistoryPoint[] = [];
  const done = logs
    .filter((l) => l.status === 'done')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt);
  for (const log of done) {
    const sets = log.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets.filter((s) => s.done && s.reps > 0));
    if (sets.length === 0) continue;
    points.push({
      date: log.date,
      logId: log.id,
      sets,
      bestE1rm: bestE1rm(sets),
      heaviest: heaviestSet(sets),
    });
  }
  return points;
}

/** Sist loggede sett for en øvelse (fra fullførte økter, valgfritt unntatt én logg). */
export function previousSetsFor(
  logs: WorkoutLog[],
  exerciseId: string,
  excludeLogId?: string,
): SetLog[] | null {
  const history = exerciseHistory(
    logs.filter((l) => l.id !== excludeLogId),
    exerciseId,
  );
  return history.length ? history[history.length - 1].sets : null;
}

/** Steg for ±-knappene for kg. */
export function kgStep(loadType: string, incrementsKg: Record<string, number>): number {
  const inc = incrementsKg[loadType] ?? 0;
  if (inc <= 0) return 1;
  return Math.min(inc, 5);
}
