import type { DayLog, PainScaleEntry } from '../types';
import { addDaysISO } from './dates';

export function painEntry(
  pain: number | null | undefined,
  scale: PainScaleEntry[],
): PainScaleEntry | undefined {
  if (pain === null || pain === undefined) return undefined;
  return scale.find((s) => pain >= s.range[0] && pain <= s.range[1]);
}

/** Laveste smerte som regnes som rød (fra painScale). */
function redThreshold(scale: PainScaleEntry[]): number {
  return scale.find((s) => s.level === 'rød')?.range[0] ?? Infinity;
}

function isYellowOrWorse(pain: number | null | undefined, scale: PainScaleEntry[]): boolean {
  const level = painEntry(pain, scale)?.level;
  return level === 'gul' || level === 'rød';
}

/**
 * Vis kortet med råd og røde flagg hvis smerte ≥ rød-grensen (i dag eller i går),
 * eller to dager på rad med gult.
 */
export function backAlert(
  logs: Pick<DayLog, 'date' | 'pain'>[],
  today: string,
  scale: PainScaleEntry[],
): { show: boolean; reason: 'red' | 'two-yellow' | null } {
  const byDate = new Map(logs.map((l) => [l.date, l.pain]));
  const d0 = byDate.get(today);
  const d1 = byDate.get(addDaysISO(today, -1));
  const d2 = byDate.get(addDaysISO(today, -2));
  const red = redThreshold(scale);
  if ((d0 ?? -1) >= red || (d1 ?? -1) >= red) return { show: true, reason: 'red' };
  if (
    (isYellowOrWorse(d0, scale) && isYellowOrWorse(d1, scale)) ||
    (isYellowOrWorse(d1, scale) && isYellowOrWorse(d2, scale))
  ) {
    return { show: true, reason: 'two-yellow' };
  }
  return { show: false, reason: null };
}
