import type { DayLog, Measurement, StepsRule, WorkoutLog } from '../types';
import { rawPlanWeek } from './dates';
import { average, round } from './util';

// ---------- Skritt ----------

/** Skrittmål for en dag: fra settings.steps for uka, eget mål onsdag, pluss godtatte justeringer. */
export function stepGoal(rules: StepsRule[], week: number, isoWeekday: number, bonus = 0): number {
  const rule =
    rules.find((r) => week >= r.weeks[0] && week <= r.weeks[1]) ??
    (week < (rules[0]?.weeks[0] ?? 1) ? rules[0] : rules[rules.length - 1]);
  if (!rule) return bonus;
  return (isoWeekday === 3 ? rule.wednesday : rule.daily) + bonus;
}

// ---------- Vekt ----------

/** Grupper verdier per planuke (bare uke 1–weeks). */
function groupByWeek<T extends { date: string }>(
  items: T[],
  startISO: string,
  weeks: number,
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const week = rawPlanWeek(item.date, startISO);
    if (week < 1 || week > weeks) continue;
    const list = map.get(week) ?? [];
    list.push(item);
    map.set(week, list);
  }
  return map;
}

/** Ukesnitt for vekt: gjennomsnitt av alle vektene i planuka. */
export function weeklyWeightAverages(
  logs: Pick<DayLog, 'date' | 'weightKg'>[],
  startISO: string,
  weeks: number,
): Map<number, number> {
  const withWeight = logs.filter((l) => typeof l.weightKg === 'number') as {
    date: string;
    weightKg: number;
  }[];
  const result = new Map<number, number>();
  for (const [week, list] of groupByWeek(withWeight, startISO, weeks)) {
    const avg = average(list.map((l) => l.weightKg));
    if (avg !== null) result.set(week, avg);
  }
  return result;
}

/** Tap per uke = (snitt(uke n−2) − snitt(uke n)) / 2, fra uke 3. Rundet til 2 desimaler. */
export function lossPerWeek(averages: Map<number, number>, week: number): number | null {
  if (week < 3) return null;
  const now = averages.get(week);
  const before = averages.get(week - 2);
  if (now === undefined || before === undefined) return null;
  return round((before - now) / 2, 2);
}

/** Målkurve: startvekt − planlagt tap × uke. */
export function targetWeight(startKg: number, plannedLossPerWeek: number, week: number): number {
  return startKg - plannedLossPerWeek * week;
}

/** Siste uke med vektdata og snitt tap per uke fram til da. */
export function averageLossPerWeek(
  averages: Map<number, number>,
  startKg: number,
): { week: number; latestAverage: number; perWeek: number } | null {
  if (averages.size === 0) return null;
  const week = Math.max(...averages.keys());
  const latestAverage = averages.get(week)!;
  return { week, latestAverage, perWeek: (startKg - latestAverage) / week };
}

/** Prognose for uke 12: startvekt − snittTapPerUke × 12. */
export function forecastWeight(startKg: number, avgLossPerWeek: number, weeks: number): number {
  return startKg - avgLossPerWeek * weeks;
}

// ---------- Livvidde ----------

/** Siste livviddemåling i hver planuke. */
export function waistByWeek(
  measurements: Pick<Measurement, 'date' | 'waistCm'>[],
  startISO: string,
  weeks: number,
): Map<number, number> {
  const withWaist = measurements
    .filter((m) => typeof m.waistCm === 'number')
    .sort((a, b) => a.date.localeCompare(b.date)) as { date: string; waistCm: number }[];
  const result = new Map<number, number>();
  for (const [week, list] of groupByWeek(withWaist, startISO, weeks)) {
    result.set(week, list[list.length - 1].waistCm);
  }
  return result;
}

/**
 * Livvidde for en uke. Mangler måling, brukes siste tidligere måling, og startmålet i uke 1.
 */
export function waistForWeek(
  waist: Map<number, number>,
  week: number,
  startWaistCm: number,
): { value: number; measured: boolean } {
  if (waist.has(week)) return { value: waist.get(week)!, measured: true };
  for (let w = week - 1; w >= 1; w--) {
    if (waist.has(w)) return { value: waist.get(w)!, measured: false };
  }
  return { value: startWaistCm, measured: false };
}

/** Endring i livvidde: livvidde(uke n−2) − livvidde(uke n). Positiv = ned. */
export function waistDrop(
  waist: Map<number, number>,
  week: number,
  startWaistCm: number,
): number | null {
  if (week < 3) return null;
  const now = waistForWeek(waist, week, startWaistCm);
  const before = waistForWeek(waist, week - 2, startWaistCm);
  return round(before.value - now.value, 1);
}

// ---------- Skritt og oppmøte ----------

export function weeklyStepAverages(
  logs: Pick<DayLog, 'date' | 'steps'>[],
  startISO: string,
  weeks: number,
): Map<number, number> {
  const withSteps = logs.filter((l) => typeof l.steps === 'number') as {
    date: string;
    steps: number;
  }[];
  const result = new Map<number, number>();
  for (const [week, list] of groupByWeek(withSteps, startISO, weeks)) {
    const avg = average(list.map((l) => l.steps));
    if (avg !== null) result.set(week, avg);
  }
  return result;
}

/** Antall fullførte økter per planuke. */
export function sessionsCompletedByWeek(
  logs: Pick<WorkoutLog, 'date' | 'status'>[],
  startISO: string,
  weeks: number,
): Map<number, number> {
  const done = logs.filter((l) => l.status === 'done');
  const result = new Map<number, number>();
  for (const [week, list] of groupByWeek(done, startISO, weeks)) result.set(week, list.length);
  return result;
}
