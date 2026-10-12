import type { IsoWeekday, Phase } from '../types';
import { addDaysISO, daysBetween, formatWeekdayLong, isoWeekday, parseDate } from './dates';
import { capitalize } from './labels';
import { phaseForWeek } from './prescription';

export interface PlanProgress {
  started: boolean;
  /** Dag i planen (1-basert). 0 før start. */
  dayNumber: number;
  totalDays: number;
  /** Dager som gjenstår etter i dag */
  daysLeft: number;
  /** 0–1 */
  fraction: number;
  finished: boolean;
  startDate: string;
  endDate: string;
}

/** Hvor langt Simen har kommet i planen, og hvor mye som er igjen. */
export function planProgress(
  startISO: string,
  weeks: number,
  todayIso: string,
  started: boolean,
): PlanProgress {
  const totalDays = weeks * 7;
  const endDate = addDaysISO(startISO, totalDays - 1);
  const base = { totalDays, startDate: startISO, endDate };
  const diff = daysBetween(startISO, todayIso);
  if (!started || diff < 0) {
    return {
      ...base,
      started: false,
      dayNumber: 0,
      daysLeft: totalDays,
      fraction: 0,
      finished: false,
    };
  }
  if (diff >= totalDays) {
    return {
      ...base,
      started: true,
      dayNumber: totalDays,
      daysLeft: 0,
      fraction: 1,
      finished: true,
    };
  }
  const dayNumber = diff + 1;
  return {
    ...base,
    started: true,
    dayNumber,
    daysLeft: totalDays - dayNumber,
    fraction: dayNumber / totalDays,
    finished: false,
  };
}

export type DayState = 'past' | 'today' | 'future';
export type PeriodState = 'past' | 'current' | 'future';

export interface CalendarDay {
  date: string;
  /** Dato i måneden */
  day: number;
  weekday: IsoWeekday;
  /** Planuke (1–weeks) */
  week: number;
  phase: Phase | undefined;
  state: DayState;
}

export interface PlanWeek {
  week: number;
  startDate: string;
  endDate: string;
  phase: Phase | undefined;
  state: PeriodState;
  days: CalendarDay[];
}

function periodState(startISO: string, endISO: string, todayIso: string): PeriodState {
  if (daysBetween(todayIso, endISO) < 0) return 'past';
  if (daysBetween(todayIso, startISO) > 0) return 'future';
  return 'current';
}

/** Planen uke for uke. Uke 1 starter på startdagen, uansett ukedag. */
export function planWeeks(
  startISO: string,
  weeks: number,
  todayIso: string,
  phases: Phase[],
): PlanWeek[] {
  return Array.from({ length: weeks }, (_, i) => {
    const week = i + 1;
    const startDate = addDaysISO(startISO, i * 7);
    const endDate = addDaysISO(startDate, 6);
    const phase = phaseForWeek(phases, week);
    const days = Array.from({ length: 7 }, (_, d): CalendarDay => {
      const date = addDaysISO(startDate, d);
      const rel = daysBetween(todayIso, date);
      return {
        date,
        day: parseDate(date).getDate(),
        weekday: isoWeekday(date),
        week,
        phase,
        state: rel < 0 ? 'past' : rel === 0 ? 'today' : 'future',
      };
    });
    return {
      week,
      startDate,
      endDate,
      phase,
      state: periodState(startDate, endDate, todayIso),
      days,
    };
  });
}

export interface PhaseGroup {
  phase: Phase | undefined;
  weeks: PlanWeek[];
  startDate: string;
  endDate: string;
  state: PeriodState;
}

/** Ukene samlet per fase, i rekkefølge. */
export function groupByPhase(weeks: PlanWeek[]): PhaseGroup[] {
  const lists: PlanWeek[][] = [];
  for (const w of weeks) {
    const last = lists[lists.length - 1];
    if (last && last[0].phase === w.phase) last.push(w);
    else lists.push([w]);
  }
  return lists.map((list) => ({
    phase: list[0].phase,
    weeks: list,
    startDate: list[0].startDate,
    endDate: list[list.length - 1].endDate,
    state: list.some((w) => w.state === 'current')
      ? 'current'
      : list.every((w) => w.state === 'past')
        ? 'past'
        : 'future',
  }));
}

/** Skjermleser-tekst for en dag, f.eks. «Mandag 12. oktober, i dag, treningsdag». */
export function dayLabel(date: string, today: string, planned: boolean, done: boolean): string {
  const when = date === today ? ', i dag' : '';
  const what = done ? ', økt fullført' : planned ? ', treningsdag' : ', hviledag';
  return `${capitalize(formatWeekdayLong(date))}${when}${what}`;
}

/** Ukedagsbokstaver mandag–søndag. */
export const WEEKDAY_LETTERS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'] as const;
