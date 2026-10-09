import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { emptyDayLog } from '../data/dayLogs';
import { db } from '../db';
import { defaultMealsForDate, effectiveMeals } from '../lib/mealPrep';
import {
  dayTotals,
  kcalStatus,
  rangeStatus,
  type Totals,
  type TargetStatus,
} from '../lib/nutrition';
import { useAppData } from '../state/appData';
import { SLOTS, type DayLog, type Meal, type Slot } from '../types';

export interface DayPlan {
  log: DayLog;
  loaded: boolean;
  defaults: Record<Slot, string>;
  mealIds: Record<Slot, string>;
  meals: Record<Slot, Meal | undefined>;
  totals: Totals;
  kcal: TargetStatus;
  protein: TargetStatus;
}

/** Dagsloggen for en dato, med valgte (eller standard) måltider og summer. */
export function useDayPlan(date: string): DayPlan {
  const { settings, plan, mealsById, ingredientsById } = useAppData();
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
    return {
      log,
      loaded: stored !== undefined,
      defaults,
      mealIds,
      meals,
      totals,
      kcal: kcalStatus(totals.kcal, settings.currentKcalTarget, settings.kcalTolerance),
      protein: rangeStatus(totals.protein, settings.proteinTargetG),
    };
  }, [stored, date, settings, plan.mealPrepRotation, mealsById, ingredientsById]);
}
