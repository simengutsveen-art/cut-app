import type { AppSettings, Phase, PrescribedExercise, Session, WeekdayKey } from '../types';
import { enDash } from './format';

export function phaseForWeek(phases: Phase[], week: number): Phase | undefined {
  return phases.find((p) => week >= p.weeks[0] && week <= p.weeks[1]);
}

/**
 * Antall sett for en uke: setsDelta legges til, setsFactor ganges med og rundes opp.
 * Minimum er 1 sett.
 */
export function setsForPhase(baseSets: number, phase: Phase | undefined): number {
  let sets = baseSets + (phase?.setsDelta ?? 0);
  if (phase?.setsFactor !== undefined) sets = Math.ceil(sets * phase.setsFactor);
  return Math.max(1, sets);
}

/**
 * Tolker RIR-teksten for en gitt uke. Støtter «2», «1-2», «3-4», «–» og
 * «3 (uke 1–4), deretter 2».
 */
export function resolveRirText(rir: string, week: number): string {
  const m = rir.match(/^\s*(\S+)\s*\(uke\s*(\d+)\s*[–-]\s*(\d+)\)\s*,?\s*deretter\s+(\S+)\s*$/i);
  if (m) {
    const [, first, from, to, after] = m;
    return week >= Number(from) && week <= Number(to) ? first : after;
  }
  return rir.trim();
}

/** RIR-mål som tallområde, eller null hvis det ikke finnes et mål («–»). */
export function parseRirTarget(rir: string): { min: number; max: number } | null {
  const m = rir.match(/(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] !== undefined ? Number(m[2]) : a;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export interface WeekPrescription extends PrescribedExercise {
  /** Sett fra økta før fasejustering */
  baseSets: number;
  /** RIR som gjelder denne uka (fasens rirOverride eller øvelsens RIR) */
  rir: string;
  rirLabel: string;
}

export function isActiveInWeek(p: PrescribedExercise, week: number): boolean {
  if (p.activeFromWeek !== undefined && week < p.activeFromWeek) return false;
  if (p.activeUntilWeek !== undefined && week > p.activeUntilWeek) return false;
  return true;
}

/** Forskrivningen for en økt i en gitt uke (fase, sett, RIR og aktive øvelser). */
export function prescriptionForWeek(
  session: Pick<Session, 'exercises'>,
  phases: Phase[],
  week: number,
): WeekPrescription[] {
  const phase = phaseForWeek(phases, week);
  return session.exercises
    .filter((p) => isActiveInWeek(p, week))
    .map((p) => {
      const rir = phase?.rirOverride ?? resolveRirText(p.rir, week);
      return {
        ...p,
        baseSets: p.sets,
        sets: setsForPhase(p.sets, phase),
        rir,
        rirLabel: enDash(rir),
      };
    });
}

export type DayPlan = { kind: 'rest' } | { kind: 'session'; sessionId: string };

/** Dagens økt fra ukeplanen (ISO-ukedag → økt-ID eller «hvile»). */
export function dayPlanFor(
  settings: Pick<AppSettings, 'weeklySchedule'>,
  isoWeekday: number,
): DayPlan {
  const value = settings.weeklySchedule[String(isoWeekday) as WeekdayKey];
  if (!value || value === 'hvile') return { kind: 'rest' };
  return { kind: 'session', sessionId: value };
}

/** Antall treningsdager i ukeplanen (brukes som «av 5» i oppmøte). */
export function sessionsPerWeek(settings: Pick<AppSettings, 'weeklySchedule'>): number {
  return Object.values(settings.weeklySchedule).filter((v) => v && v !== 'hvile').length;
}

/** Tolker første vekt fra startWeightNote: «60 kg» → 60, «22–24 kg» → 22, «2×8 kg» → 8. */
export function parseStartWeight(note: string): number | null {
  const m = note.match(/(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*\d+(?:[.,]\d+)?\s*)?kg/i);
  if (!m) return null;
  return Number(m[1].replace(',', '.'));
}
