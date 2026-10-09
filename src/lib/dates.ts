import { addDays, differenceInCalendarDays, format, getISODay, isValid, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { IsoWeekday } from '../types';

/** Lokal dato som yyyy-MM-dd */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Tolker yyyy-MM-dd som lokal midnatt. */
export function parseDate(iso: string): Date {
  return parseISO(iso);
}

export function isValidISODate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && isValid(parseISO(iso));
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseISO(iso), days));
}

export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO));
}

export function isoWeekday(iso: string): IsoWeekday {
  return getISODay(parseISO(iso)) as IsoWeekday;
}

/** Uke i planen uten begrensning (kan være < 1 eller > antall uker). */
export function rawPlanWeek(dateISO: string, startISO: string): number {
  return Math.floor(daysBetween(startISO, dateISO) / 7) + 1;
}

/** uke = floor((dato − startDate) / 7) + 1, begrenset til 1–weeks. */
export function planWeek(dateISO: string, startISO: string, weeks: number): number {
  return Math.min(weeks, Math.max(1, rawPlanWeek(dateISO, startISO)));
}

export type PlanStatus =
  | { kind: 'before'; daysUntil: number; week: 1 }
  | { kind: 'active'; week: number }
  | { kind: 'after'; week: number };

export function planStatus(dateISO: string, startISO: string, weeks: number): PlanStatus {
  const diff = daysBetween(startISO, dateISO);
  if (diff < 0) return { kind: 'before', daysUntil: -diff, week: 1 };
  const week = Math.floor(diff / 7) + 1;
  if (week > weeks) return { kind: 'after', week: weeks };
  return { kind: 'active', week };
}

export function planStatusLabel(status: PlanStatus, weeks: number): string {
  switch (status.kind) {
    case 'before':
      return `Starter om ${status.daysUntil} ${status.daysUntil === 1 ? 'dag' : 'dager'}`;
    case 'after':
      return 'Planen er ferdig';
    case 'active':
      return `Uke ${status.week} av ${weeks}`;
  }
}

/** Første dato i en planuke. */
export function weekStartISO(week: number, startISO: string): string {
  return addDaysISO(startISO, (week - 1) * 7);
}

/** De 7 datoene i en planuke. */
export function weekDates(week: number, startISO: string): string[] {
  const first = weekStartISO(week, startISO);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(first, i));
}

/** Datoen i planuka som har gitt ISO-ukedag. */
export function dateInWeek(week: number, startISO: string, weekday: number): string | undefined {
  return weekDates(week, startISO).find((d) => isoWeekday(d) === weekday);
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd.MM.yyyy');
}

export function formatDateShort(iso: string): string {
  return format(parseISO(iso), 'dd.MM');
}

export function formatWeekdayLong(iso: string): string {
  return format(parseISO(iso), 'EEEE d. MMMM', { locale: nb });
}

export function weekdayName(weekday: number, style: 'long' | 'short' = 'long'): string {
  // 2024-01-01 var en mandag.
  const date = addDays(new Date(2024, 0, 1), weekday - 1);
  return format(date, style === 'long' ? 'EEEE' : 'EEEEEE', { locale: nb });
}

export function formatTime(ms: number): string {
  return format(new Date(ms), 'HH:mm');
}
