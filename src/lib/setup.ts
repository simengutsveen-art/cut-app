import {
  WEEKDAY_KEYS,
  type AppSettings,
  type PrescribedExercise,
  type Session,
  type StepsRule,
  type WeekdayKey,
} from '../types';
import { MAX_WEEKS, MIN_WEEKS } from './phases';

export type Sex = 'mann' | 'kvinne';
export type ActivityLevel = 'lav' | 'middels' | 'hoy' | 'svart_hoy';

export const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  description: string;
  factor: number;
}[] = [
  { value: 'lav', label: 'Rolig hverdag', description: 'Sitter mye, lite gåing', factor: 1.45 },
  {
    value: 'middels',
    label: 'Litt aktiv',
    description: 'Går eller står en del i løpet av dagen',
    factor: 1.55,
  },
  { value: 'hoy', label: 'Aktiv', description: 'Aktiv jobb eller mye gåing', factor: 1.7 },
  { value: 'svart_hoy', label: 'Svært aktiv', description: 'Fysisk tungt arbeid', factor: 1.85 },
];

export const PACE_OPTIONS: { value: number; label: string; description: string }[] = [
  { value: 0.25, label: 'Rolig', description: '0,25 kg i uka. Lettest å holde ut.' },
  { value: 0.5, label: 'Moderat', description: '0,5 kg i uka. Et godt utgangspunkt.' },
  { value: 0.75, label: 'Raskt', description: '0,75 kg i uka. Krevende over tid.' },
];

/** Omtrent så mange kcal er det i 1 kg kroppsfett. */
const KCAL_PER_KG = 7700;

export function round50(n: number): number {
  return Math.round(n / 50) * 50;
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

export interface SetupPerson {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
}

/** Hvileforbrenning (Mifflin-St Jeor). */
export function bmrKcal({ sex, age, heightCm, weightKg }: SetupPerson): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'kvinne' ? -161 : 5);
}

export function activityFactor(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.factor ?? 1.55;
}

/** Forslag til lengde: uker som trengs for å nå målvekta i valgt tempo (4–24). */
export function suggestWeeks(startKg: number, goalKg: number, pacePerWeek: number): number {
  if (pacePerWeek <= 0 || goalKg >= startKg) return MIN_WEEKS;
  return clampWeeks(Math.ceil((startKg - goalKg) / pacePerWeek));
}

export function clampWeeks(weeks: number): number {
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.round(weeks)));
}

export interface Targets {
  bmrKcal: number;
  maintenanceEstimateKcal: number;
  kcalTarget: number;
  kcalFloor: number;
  proteinTargetG: [number, number];
  fatTargetG: [number, number];
  carbTargetG: [number, number];
}

/**
 * Kalori- og makromål: vedlikehold = hvileforbrenning × aktivitet, minus underskuddet for tempoet.
 * Protein 2,0–2,3 g og fett 0,8–1,0 g per kg målvekt. Resten blir karbohydrater.
 */
export function computeTargets(input: {
  person: SetupPerson;
  activity: ActivityLevel;
  goalKg: number;
  pacePerWeek: number;
  /** Eget kcal-mål i stedet for det utregnede */
  kcalOverride?: number | null;
}): Targets {
  const { person, activity, goalKg, pacePerWeek, kcalOverride } = input;
  const bmr = bmrKcal(person);
  const maintenance = bmr * activityFactor(activity);
  const sexMin = person.sex === 'kvinne' ? 1200 : 1500;
  const deficit = (pacePerWeek * KCAL_PER_KG) / 7;
  const suggestedFloor = Math.max(sexMin, round50(bmr), round50(maintenance - deficit - 300));
  const kcalTarget = kcalOverride ?? Math.max(suggestedFloor, round50(maintenance - deficit));
  const kcalFloor = Math.min(suggestedFloor, kcalTarget);
  const protein: [number, number] = [round5(goalKg * 2), round5(goalKg * 2.3)];
  const fat: [number, number] = [round5(goalKg * 0.8), round5(goalKg * 1.0)];
  const carbMid =
    (kcalTarget - ((protein[0] + protein[1]) / 2) * 4 - ((fat[0] + fat[1]) / 2) * 9) / 4;
  const carbs: [number, number] = [
    Math.max(0, round5(carbMid - 20)),
    Math.max(0, round5(carbMid + 20)),
  ];
  return {
    bmrKcal: Math.round(bmr),
    maintenanceEstimateKcal: round50(maintenance),
    kcalTarget,
    kcalFloor,
    proteinTargetG: protein,
    fatTargetG: fat,
    carbTargetG: carbs,
  };
}

/** Porsjonsstørrelse for matplanen: kalorimålet delt på det planen er laget for (60–140 %). */
export function portionScaleFor(kcalTarget: number, planKcal: number): number {
  if (planKcal <= 0) return 1;
  return Math.min(1.4, Math.max(0.6, Math.round((kcalTarget / planKcal) * 20) / 20));
}

/** Mål for livvidden: omtrent 1,2 cm per kg ned. */
export function goalWaistRange(
  startWaistCm: number,
  startKg: number,
  goalKg: number,
): [number, number] {
  const mid = Math.round(startWaistCm - 1.2 * Math.max(0, startKg - goalKg));
  return [mid - 1, mid + 1];
}

/** Ett skrittmål for hele planen. */
export function flatSteps(daily: number, weeks: number): StepsRule[] {
  return [{ weeks: [1, weeks], daily, wednesday: daily }];
}

/** Skrittmålet en enkel innstilling viser (siste regel, vanlig dag). */
export function dailyStepGoal(rules: StepsRule[]): number {
  return rules[rules.length - 1]?.daily ?? 8000;
}

/** Ukeplan: dager uten økt er hvile. */
export function scheduleFor(
  days: Record<WeekdayKey, string | null>,
): AppSettings['weeklySchedule'] {
  return Object.fromEntries(
    WEEKDAY_KEYS.map((d) => [d, days[d] ?? 'hvile']),
  ) as AppSettings['weeklySchedule'];
}

/** Standardoppsett for en øvelse som legges til i en økt. */
export function defaultPrescription(exerciseId: string, loadType: string): PrescribedExercise {
  const core = loadType === 'core';
  return {
    exerciseId,
    sets: 3,
    repMin: core ? 10 : 8,
    repMax: core ? 15 : 12,
    rir: '2',
    restSec: core ? 60 : 120,
    startWeightNote: '',
    unit: 'reps',
  };
}

/** Økta med øvelsene i `exerciseIds` (i den rekkefølgen). Øvelser som var der, beholder oppsettet. */
export function sessionWithExercises(
  session: Session,
  exerciseIds: string[],
  loadTypeOf: (exerciseId: string) => string,
): Session {
  const existing = new Map(session.exercises.map((p) => [p.exerciseId, p]));
  return {
    ...session,
    exercises: exerciseIds.map((id) => existing.get(id) ?? defaultPrescription(id, loadTypeOf(id))),
  };
}

export interface SetupAnswers {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  waistCm: number;
  goalKg: number;
  pace: number;
  weeks: number;
  activity: ActivityLevel;
  steps: number;
  schedule: Record<WeekdayKey, string | null>;
  backCare: boolean;
  dislikedFoods: string[];
  kcalOverride: number | null;
}

/** Innstillingene etter oppsettet. `planKcal` er kcal-nivået matplanen er laget for. */
export function settingsFromAnswers(
  base: AppSettings,
  a: SetupAnswers,
  planKcal: number,
): AppSettings {
  const targets = computeTargets({
    person: { sex: a.sex, age: a.age, heightCm: a.heightCm, weightKg: a.weightKg },
    activity: a.activity,
    goalKg: a.goalKg,
    pacePerWeek: a.pace,
    kcalOverride: a.kcalOverride,
  });
  return {
    ...base,
    ...targets,
    person: { ...base.person, name: a.name.trim(), age: a.age, heightCm: a.heightCm, sex: a.sex },
    startWeightKg: a.weightKg,
    startWaistCm: a.waistCm,
    goalWeightRangeKg: [a.goalKg - 0.5, a.goalKg + 0.5],
    goalWaistRangeCm: goalWaistRange(a.waistCm, a.weightKg, a.goalKg),
    weeks: a.weeks,
    plannedLossKgPerWeek: a.pace,
    currentKcalTarget: targets.kcalTarget,
    steps: flatSteps(a.steps, a.weeks),
    stepsBonus: 0,
    weeklySchedule: scheduleFor(a.schedule),
    dislikedFoods: a.dislikedFoods,
    activityLevel: a.activity,
    backCare: a.backCare,
    portionScale: portionScaleFor(targets.kcalTarget, planKcal),
    onboarded: true,
    userModified: true,
  };
}
