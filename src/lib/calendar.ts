import type { Phase } from '../types';
import { addDaysISO, daysBetween, isoWeekday, parseDate } from './dates';
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

export type DayState = 'outside' | 'past' | 'today' | 'future';

export interface CalendarDay {
  date: string;
  /** Dato i måneden */
  day: number;
  inPlan: boolean;
  /** Planuke (1–weeks), eller null utenfor planen */
  week: number | null;
  phase: Phase | undefined;
  state: DayState;
}

export interface CalendarRow {
  days: CalendarDay[];
  /** Planuka til den første dagen i raden som er med i planen */
  week: number | null;
  /** Månedsnavn når raden starter en ny måned (eller er første rad) */
  month: string | null;
}

const MONTHS = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

export function monthName(iso: string): string {
  return MONTHS[parseDate(iso).getMonth()];
}

/**
 * Kalender med uker fra mandag til søndag som dekker hele planen.
 * Starter planen midt i en uke, er dagene før start med (men utenfor planen).
 */
export function calendarRows(
  startISO: string,
  weeks: number,
  todayIso: string,
  phases: Phase[],
): CalendarRow[] {
  const totalDays = weeks * 7;
  const endISO = addDaysISO(startISO, totalDays - 1);
  const first = addDaysISO(startISO, -(isoWeekday(startISO) - 1));
  const last = addDaysISO(endISO, 7 - isoWeekday(endISO));
  const rows: CalendarRow[] = [];
  let lastMonth = '';
  for (let cursor = first; daysBetween(cursor, last) >= 0; cursor = addDaysISO(cursor, 7)) {
    const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysISO(cursor, i);
      const diff = daysBetween(startISO, date);
      const inPlan = diff >= 0 && diff < totalDays;
      const week = inPlan ? Math.floor(diff / 7) + 1 : null;
      const rel = daysBetween(todayIso, date);
      return {
        date,
        day: parseDate(date).getDate(),
        inPlan,
        week,
        phase: week ? phaseForWeek(phases, week) : undefined,
        state: !inPlan ? 'outside' : rel < 0 ? 'past' : rel === 0 ? 'today' : 'future',
      };
    });
    const firstInPlan = days.find((d) => d.inPlan);
    const monthStart = days.find((d) => d.day === 1);
    const month =
      rows.length === 0 ? monthName(days[0].date) : monthStart ? monthName(monthStart.date) : null;
    rows.push({ days, week: firstInPlan?.week ?? null, month: month !== lastMonth ? month : null });
    if (month) lastMonth = month;
  }
  return rows;
}

/** Fasene med datoer, for tidslinja over kalenderen. */
export function phaseSpans(
  startISO: string,
  phases: Phase[],
): { phase: Phase; startDate: string; endDate: string; days: number }[] {
  return phases.map((phase) => ({
    phase,
    startDate: addDaysISO(startISO, (phase.weeks[0] - 1) * 7),
    endDate: addDaysISO(startISO, phase.weeks[1] * 7 - 1),
    days: (phase.weeks[1] - phase.weeks[0] + 1) * 7,
  }));
}

/** Ukedagsbokstaver mandag–søndag. */
export const WEEKDAY_LETTERS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'] as const;
