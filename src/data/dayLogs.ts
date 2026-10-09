import type { CutDB } from '../db';
import { newId } from '../lib/util';
import type { DayLog, ExtraFood, Slot } from '../types';

export function emptyDayLog(date: string): DayLog {
  return { date, meals: {}, extras: [], coreDone: false };
}

/** Oppdaterer (eller lager) dagsloggen for en dato. */
export async function updateDayLog(
  db: CutDB,
  date: string,
  fn: (log: DayLog) => void,
): Promise<void> {
  await db.transaction('rw', db.dayLogs, async () => {
    const log = (await db.dayLogs.get(date)) ?? emptyDayLog(date);
    fn(log);
    await db.dayLogs.put(log);
  });
}

export function patchDayLog(db: CutDB, date: string, patch: Partial<DayLog>): Promise<void> {
  return updateDayLog(db, date, (log) => Object.assign(log, patch));
}

/** Velg måltid for en slot. null = tilbake til standard. */
export function setMeal(db: CutDB, date: string, slot: Slot, mealId: string | null) {
  return updateDayLog(db, date, (log) => {
    if (mealId) log.meals[slot] = mealId;
    else delete log.meals[slot];
  });
}

export function addExtra(db: CutDB, date: string, extra: Omit<ExtraFood, 'id'>) {
  return updateDayLog(db, date, (log) => {
    log.extras.push({ ...extra, id: newId('x') });
  });
}

export function removeExtra(db: CutDB, date: string, id: string) {
  return updateDayLog(db, date, (log) => {
    log.extras = log.extras.filter((e) => e.id !== id);
  });
}
