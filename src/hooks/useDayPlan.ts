import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { emptyDayLog } from '../data/dayLogs';
import { db } from '../db';
import { defaultMealsForDate, effectiveMeals } from '../lib/mealPrep';
import {
  dayTotals,
  eatenTotals,
  intakeStatus,
  kcalStatus,
  rangeStatus,
  type IntakeStatus,
  type Totals,
} from '../lib/nutrition';
import { useAppData } from '../state/appData';
import { SLOTS, type DayLog, type Meal, type Slot } from '../types';
import { useToday } from './useToday';

export interface DayPlan {
  log: DayLog;
  loaded: boolean;
  defaults: Record<Slot, string>;
  mealIds: Record<Slot, string>;
  meals: Record<Slot, Meal | undefined>;
  /** Planlagt: alle fire måltider + fleksipotten */
  totals: Totals;
  /** Spist hittil: avkryssede måltider + fleksipotten */
  eaten: Totals;
  /** Status for det som er spist */
  kcal: IntakeStatus;
  protein: IntakeStatus;
}

/** Dagsloggen for en dato, med valgte (eller standard) måltider og summer. */
export function useDayPlan(date: string): DayPlan {
  const { settings, plan, mealsById, ingredientsById } = useAppData();
  const today = useToday();
  const stored = useLiveQuery(() => db.dayLogs.get(date).then((l) => l ?? null), [date]);
  return useMemo(() => {
    const log = stored ?? emptyDayLog(date);
    const defaults = defaultMealsForDate(date, settings, plan.mealPrepRotation);
    const mealIds = effectiveMeals(log.meals, defaults);
    const meals = Object.fromEntries(SLOTS.map((s) => [s, mealsById.get(mealIds[s])])) as Record<
      Slot,
      Meal | undefined
    >;
    const totals = dayTotals(
      SLOTS.map((s) => meals[s]),
      log.extras,
      ingredientsById,
    );
    const eaten = eatenTotals(meals, log.eaten, log.extras, ingredientsById);
    const dayOver = date < today;
    return {
      log,
      loaded: stored !== undefined,
      defaults,
      mealIds,
      meals,
      totals,
      eaten,
      kcal: intakeStatus(
        kcalStatus(eaten.kcal, settings.currentKcalTarget, settings.kcalTolerance),
        dayOver,
      ),
      protein: intakeStatus(rangeStatus(eaten.protein, settings.proteinTargetG), dayOver),
    };
  }, [stored, date, today, settings, plan.mealPrepRotation, mealsById, ingredientsById]);
}
