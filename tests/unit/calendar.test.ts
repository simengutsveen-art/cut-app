import { describe, expect, it } from 'vitest';
import { calendarRows, phaseSpans, planProgress } from '../../src/lib/calendar';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();

describe('fremdrift i planen', () => {
  it('dag 1 av 84 på startdagen', () => {
    expect(planProgress('2026-10-12', 12, '2026-10-12', true)).toMatchObject({
      dayNumber: 1,
      totalDays: 84,
      daysLeft: 83,
      finished: false,
      endDate: '2027-01-03',
    });
  });

  it('midt i planen og siste dag', () => {
    const mid = planProgress('2026-10-12', 12, '2026-11-15', true);
    expect(mid.dayNumber).toBe(35);
    expect(mid.daysLeft).toBe(49);
    expect(mid.fraction).toBeCloseTo(35 / 84, 5);
    expect(planProgress('2026-10-12', 12, '2027-01-03', true)).toMatchObject({
      dayNumber: 84,
      daysLeft: 0,
    });
    expect(planProgress('2026-10-12', 12, '2027-01-04', true)).toMatchObject({
      finished: true,
      fraction: 1,
    });
  });

  it('ikke startet', () => {
    expect(planProgress('2026-10-12', 12, '2026-10-20', false)).toMatchObject({
      started: false,
      dayNumber: 0,
      daysLeft: 84,
      fraction: 0,
    });
  });
});

describe('kalender', () => {
  it('start på mandag gir 12 hele uker', () => {
    const rows = calendarRows('2026-10-12', 12, '2026-10-14', seed.phases);
    expect(rows).toHaveLength(12);
    expect(rows[0].days[0]).toMatchObject({
      date: '2026-10-12',
      inPlan: true,
      week: 1,
      state: 'past',
    });
    expect(rows[0].days[2].state).toBe('today');
    expect(rows[0].days[3].state).toBe('future');
    expect(rows[0].month).toBe('oktober');
    expect(rows[2].month).toBe('november'); // 1. november er søndag i rad 3
    expect(rows[3].month).toBeNull();
    expect(rows[6].days[0].phase?.name).toBe('Lett uke (deload)');
    expect(rows[11].days[6]).toMatchObject({ date: '2027-01-03', week: 12 });
  });

  it('start på fredag: uker fra mandag, dagene før start er utenfor planen', () => {
    const rows = calendarRows('2026-10-09', 12, '2026-10-09', seed.phases);
    expect(rows).toHaveLength(13);
    expect(rows[0].days[0]).toMatchObject({ date: '2026-10-05', inPlan: false, state: 'outside' });
    expect(rows[0].days[4]).toMatchObject({
      date: '2026-10-09',
      inPlan: true,
      week: 1,
      state: 'today',
    });
    expect(rows[1].days[0]).toMatchObject({ date: '2026-10-12', week: 1 });
    expect(rows[1].days[4]).toMatchObject({ date: '2026-10-16', week: 2 });
    const last = rows[12].days;
    expect(last.filter((d) => d.inPlan).map((d) => d.date)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
    ]);
  });

  it('faser med datoer', () => {
    const spans = phaseSpans('2026-10-12', seed.phases);
    expect(spans[0]).toMatchObject({ startDate: '2026-10-12', endDate: '2026-10-25', days: 14 });
    expect(spans[2]).toMatchObject({ startDate: '2026-11-23', endDate: '2026-11-29', days: 7 });
  });
});
