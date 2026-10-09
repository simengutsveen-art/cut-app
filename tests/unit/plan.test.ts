import { describe, expect, it } from 'vitest';
import {
  formatDate,
  isoWeekday,
  planStatus,
  planStatusFor,
  planStatusLabel,
  planWeek,
} from '../../src/lib/dates';
import { defaultMealsForDate, prepEventOnDate, prepEventsForWeek } from '../../src/lib/mealPrep';
import {
  dayPlanFor,
  parseRirTarget,
  parseStartWeight,
  phaseForWeek,
  prescriptionForWeek,
  resolveRirText,
  sessionsPerWeek,
} from '../../src/lib/prescription';
import { settingsFromSeed } from '../../src/data/seedSync';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();
const start = seed.settings.startDate;
const session = (id: string) => seed.sessions.find((s) => s.id === id)!;

describe('uke i planen', () => {
  it('beregner uke fra startdato 12.10.2026', () => {
    expect(planWeek('2026-10-12', start, 12)).toBe(1);
    expect(planWeek('2026-10-18', start, 12)).toBe(1);
    expect(planWeek('2026-10-19', start, 12)).toBe(2);
    expect(planWeek('2026-12-28', start, 12)).toBe(12);
  });

  it('før start: dager igjen beregnes, men appen viser «Klar til start»', () => {
    expect(planStatus('2026-10-11', start, 12)).toEqual({ kind: 'before', daysUntil: 1, week: 1 });
    expect(planStatus('2026-10-09', start, 12)).toEqual({ kind: 'before', daysUntil: 3, week: 1 });
    expect(planStatusLabel(planStatus('2026-10-11', start, 12), 12)).toBe('Klar til start');
    expect(planWeek('2026-10-11', start, 12)).toBe(1);
  });

  it('planen venter til «Start nå» er trykket', () => {
    const notStarted = { startDate: start, weeks: 12, planStarted: false };
    expect(planStatusFor(notStarted, '2026-10-20')).toEqual({ kind: 'waiting', week: 1 });
    const started = { startDate: '2026-10-09', weeks: 12, planStarted: true };
    expect(planStatusFor(started, '2026-10-09')).toEqual({ kind: 'active', week: 1 });
    expect(planStatusFor(started, '2026-10-16')).toEqual({ kind: 'active', week: 2 });
    expect(planStatusFor({ ...started, startDate: '2026-11-02' }, '2026-10-20').kind).toBe(
      'waiting',
    );
    expect(planStatusLabel({ kind: 'waiting', week: 1 }, 12)).toBe('Klar til start');
  });

  it('etter uke 12: «Planen er ferdig»', () => {
    expect(planStatusLabel(planStatus('2027-01-03', start, 12), 12)).toBe('Uke 12 av 12');
    expect(planStatusLabel(planStatus('2027-01-04', start, 12), 12)).toBe('Planen er ferdig');
    expect(planWeek('2027-02-01', start, 12)).toBe(12);
  });

  it('formaterer dato dd.mm.yyyy og ISO-ukedag', () => {
    expect(formatDate('2026-10-12')).toBe('12.10.2026');
    expect(isoWeekday('2026-10-12')).toBe(1);
    expect(isoWeekday('2026-10-18')).toBe(7);
  });
});

describe('dagens økt', () => {
  it('følger weeklySchedule', () => {
    const settings = settingsFromSeed(seed);
    expect(dayPlanFor(settings, 1)).toEqual({ kind: 'session', sessionId: 'okt1' });
    expect(dayPlanFor(settings, 3)).toEqual({ kind: 'rest' });
    expect(dayPlanFor(settings, 6)).toEqual({ kind: 'session', sessionId: 'okt5' });
    expect(sessionsPerWeek(settings)).toBe(5);
  });
});

describe('forskrivning per uke (faser)', () => {
  const bench = (week: number) =>
    prescriptionForWeek(session('okt1'), seed.phases, week).find(
      (p) => p.exerciseId === 'benkpress',
    )!;

  it('uke 1: benkpress = 3 sett, RIR 3', () => {
    expect(phaseForWeek(seed.phases, 1)?.name).toBe('Oppstart');
    expect(bench(1).sets).toBe(3);
    expect(bench(1).rir).toBe('3');
  });

  it('uke 7: benkpress = 2 sett, RIR 3–4', () => {
    expect(bench(7).sets).toBe(2);
    expect(bench(7).rirLabel).toBe('3–4');
  });

  it('uke 3: fullt volum med øvelsens RIR', () => {
    expect(bench(3).sets).toBe(4);
    expect(bench(3).rir).toBe('2');
  });

  it('minimum 1 sett', () => {
    const oh = prescriptionForWeek(session('okt1'), seed.phases, 1).find(
      (p) => p.exerciseId === 'oh_triceps',
    )!;
    expect(oh.sets).toBe(1);
    const hammer = prescriptionForWeek(session('okt2'), seed.phases, 7).find(
      (p) => p.exerciseId === 'hammercurl',
    )!;
    expect(hammer.sets).toBe(1);
  });

  it('uke 8: knebøy dukker opp i Bein-økta', () => {
    const ids = (w: number) =>
      prescriptionForWeek(session('okt3'), seed.phases, w).map((p) => p.exerciseId);
    expect(ids(7)).not.toContain('kneboy');
    expect(ids(8)).toContain('kneboy');
  });

  it('uke 1–2: dead bug, fra uke 3 hengende kneløft', () => {
    const ids = (w: number) =>
      prescriptionForWeek(session('okt5'), seed.phases, w).map((p) => p.exerciseId);
    expect(ids(1)).toContain('dead_bug');
    expect(ids(2)).toContain('dead_bug');
    expect(ids(2)).not.toContain('hengende_kneloft');
    expect(ids(3)).toContain('hengende_kneloft');
    expect(ids(3)).not.toContain('dead_bug');
  });

  it('RIR «3 (uke 1–4), deretter 2»', () => {
    expect(resolveRirText('3 (uke 1–4), deretter 2', 4)).toBe('3');
    expect(resolveRirText('3 (uke 1–4), deretter 2', 5)).toBe('2');
    const rdl = (w: number) =>
      prescriptionForWeek(session('okt3'), seed.phases, w).find(
        (p) => p.exerciseId === 'rumensk_markloft',
      )!;
    expect(rdl(3).rir).toBe('3');
    expect(rdl(5).rir).toBe('2');
    expect(parseRirTarget('1-2')).toEqual({ min: 1, max: 2 });
    expect(parseRirTarget('–')).toBeNull();
  });

  it('tolker startvekt', () => {
    expect(parseStartWeight('60 kg')).toBe(60);
    expect(parseStartWeight('22–24 kg')).toBe(22);
    expect(parseStartWeight('16–17,5 kg')).toBe(16);
    expect(parseStartWeight('2×8 kg')).toBe(8);
    expect(parseStartWeight('40 kg / 2×16 kg')).toBe(40);
    expect(parseStartWeight('Test')).toBeNull();
  });
});

describe('meal prep-rotasjon', () => {
  it('uke 1: søndag før uka og onsdag', () => {
    const events = prepEventsForWeek(seed.mealPrepRotation, 1, start);
    expect(events).toEqual([
      { key: 'sunday', date: '2026-10-11', forWeek: 1, meals: { lunsj: 'L1', middag: 'D1' } },
      { key: 'wednesday', date: '2026-10-14', forWeek: 1, meals: { lunsj: 'L3', middag: 'D2' } },
    ]);
  });

  it('påminnelse søndag gjelder neste uke', () => {
    expect(prepEventOnDate(seed.mealPrepRotation, '2026-10-18', start, 12)).toMatchObject({
      key: 'sunday',
      forWeek: 2,
      meals: { lunsj: 'L2', middag: 'D3' },
    });
    expect(prepEventOnDate(seed.mealPrepRotation, '2026-10-13', start, 12)).toBeUndefined();
  });

  it('standardmåltider per dag', () => {
    const settings = settingsFromSeed(seed);
    expect(defaultMealsForDate('2026-10-12', settings, seed.mealPrepRotation)).toEqual({
      frokost: 'F1',
      lunsj: 'L1',
      middag: 'D1',
      kveldsmat: 'K1',
    });
    expect(defaultMealsForDate('2026-10-15', settings, seed.mealPrepRotation)).toEqual({
      frokost: 'F1',
      lunsj: 'L3',
      middag: 'D2',
      kveldsmat: 'K1',
    });
  });
});
