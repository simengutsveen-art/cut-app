import type { AppSettings, MealPrepRotationEntry, PrepSlots, Slot, WeekMealChoice } from '../types';
import { addDaysISO, dateInWeek, isoWeekday, planWeek, weekStartISO } from './dates';

/** Rotasjonsoppføringen som gjelder for en planuke. */
export function rotationForWeek(
  rotation: MealPrepRotationEntry[],
  week: number,
): MealPrepRotationEntry | undefined {
  return rotation.find((r) => r.weeks.includes(week));
}

export type PrepKey = 'sunday' | 'wednesday';

/** ISO-ukedag for nøklene i mealPrepRotation. */
export const PREP_WEEKDAY: Record<PrepKey, number> = { sunday: 7, wednesday: 3 };

export interface PrepEvent {
  key: PrepKey;
  /** Datoen prep-økta gjøres */
  date: string;
  /** Planuka maten spises i */
  forWeek: number;
  meals: PrepSlots;
}

/**
 * Prep for en planuke: «sunday» lages søndagen før uka (dekker man–ons),
 * «wednesday» lages onsdag i uka (dekker tor–søn).
 */
export function prepEventsForWeek(
  rotation: MealPrepRotationEntry[],
  week: number,
  startISO: string,
): PrepEvent[] {
  const entry = rotationForWeek(rotation, week);
  if (!entry) return [];
  const sundayBefore = addDaysISO(weekStartISO(week, startISO), -1);
  const events: PrepEvent[] = [];
  const sundayDate =
    isoWeekday(sundayBefore) === PREP_WEEKDAY.sunday
      ? sundayBefore
      : (dateInWeek(week - 1, startISO, PREP_WEEKDAY.sunday) ?? sundayBefore);
  events.push({ key: 'sunday', date: sundayDate, forWeek: week, meals: entry.sunday });
  const wednesday = dateInWeek(week, startISO, PREP_WEEKDAY.wednesday);
  if (wednesday) {
    events.push({ key: 'wednesday', date: wednesday, forWeek: week, meals: entry.wednesday });
  }
  return events;
}

/** Prep som skal gjøres på en bestemt dato (for påminnelser). */
export function prepEventOnDate(
  rotation: MealPrepRotationEntry[],
  dateISO: string,
  startISO: string,
  weeks: number,
): PrepEvent | undefined {
  const w = planWeek(dateISO, startISO, weeks);
  for (const week of [w, w + 1]) {
    if (week < 1 || week > weeks) continue;
    const hit = prepEventsForWeek(rotation, week, startISO).find((e) => e.date === dateISO);
    if (hit) return hit;
  }
  return undefined;
}

/** Valgt frokost og kveldsmat for en uke (standard er Simens standardmåltider). */
export function weekBreakfastAndEvening(
  settings: Pick<AppSettings, 'standardMeals' | 'weekMealChoices'>,
  week: number,
): Required<WeekMealChoice> {
  const choice = settings.weekMealChoices[String(week)] ?? {};
  return {
    frokost: choice.frokost ?? settings.standardMeals.frokost,
    kveldsmat: choice.kveldsmat ?? settings.standardMeals.kveldsmat,
  };
}

/**
 * Standardmåltider for en dato når Simen ikke har valgt noe:
 * frokost/kveldsmat fra ukas valg, lunsj/middag fra prep-rotasjonen.
 */
export function defaultMealsForDate(
  dateISO: string,
  settings: Pick<AppSettings, 'standardMeals' | 'weekMealChoices' | 'startDate' | 'weeks'>,
  rotation: MealPrepRotationEntry[],
): Record<Slot, string> {
  const week = planWeek(dateISO, settings.startDate, settings.weeks);
  const { frokost, kveldsmat } = weekBreakfastAndEvening(settings, week);
  const entry = rotationForWeek(rotation, week);
  const prep = entry ? (isoWeekday(dateISO) <= 3 ? entry.sunday : entry.wednesday) : undefined;
  return {
    frokost,
    lunsj: prep?.lunsj ?? settings.standardMeals.lunsj,
    middag: prep?.middag ?? settings.standardMeals.middag,
    kveldsmat,
  };
}

/** Måltidene som gjelder for en dag: Simens valg, ellers standard. */
export function effectiveMeals(
  chosen: Partial<Record<Slot, string>> | undefined,
  defaults: Record<Slot, string>,
): Record<Slot, string> {
  return {
    frokost: chosen?.frokost ?? defaults.frokost,
    lunsj: chosen?.lunsj ?? defaults.lunsj,
    middag: chosen?.middag ?? defaults.middag,
    kveldsmat: chosen?.kveldsmat ?? defaults.kveldsmat,
  };
}
