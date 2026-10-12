import { describe, expect, it } from 'vitest';
import { dayLabel, groupByPhase, planProgress, planWeeks } from '../../src/lib/calendar';
import { formatDayMonthRange } from '../../src/lib/dates';
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

describe('kalender uke for uke', () => {
  it('start på mandag: 12 uker fra mandag til søndag', () => {
    const weeks = planWeeks('2026-10-12', 12, '2026-10-14', seed.phases);
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toMatchObject({
      week: 1,
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      state: 'current',
    });
    expect(weeks[0].days.map((d) => d.state)).toEqual([
      'past',
      'past',
      'today',
      'future',
      'future',
      'future',
      'future',
    ]);
    expect(weeks[1].state).toBe('future');
    expect(weeks[6].phase?.name).toBe('Lett uke (deload)');
    expect(weeks[11]).toMatchObject({ week: 12, endDate: '2027-01-03' });
  });

  it('start på fredag: uke 1 starter på fredag, ingen dager utenfor planen', () => {
    const weeks = planWeeks('2026-10-09', 12, '2026-10-09', seed.phases);
    expect(weeks[0].days[0]).toMatchObject({ date: '2026-10-09', weekday: 5, state: 'today' });
    expect(weeks[0].endDate).toBe('2026-10-15');
    expect(weeks[1].startDate).toBe('2026-10-16');
    expect(weeks.flatMap((w) => w.days)).toHaveLength(84);
  });

  it('ukene samlet per fase, med status', () => {
    const groups = groupByPhase(planWeeks('2026-10-12', 12, '2026-11-15', seed.phases));
    expect(groups.map((g) => [g.phase?.name, g.weeks.length])).toEqual([
      ['Oppstart', 2],
      ['Bygg 1', 4],
      ['Lett uke (deload)', 1],
      ['Bygg 2', 4],
      ['Test', 1],
    ]);
    expect(groups[0]).toMatchObject({
      startDate: '2026-10-12',
      endDate: '2026-10-25',
      state: 'past',
    });
    expect(groups[1].state).toBe('current'); // 15.11 er i uke 5
    expect(groups[2]).toMatchObject({
      startDate: '2026-11-23',
      endDate: '2026-11-29',
      state: 'future',
    });
  });

  it('datoer og skjermlesertekst', () => {
    expect(formatDayMonthRange('2026-10-12', '2026-10-18')).toBe('12.–18. okt.');
    expect(formatDayMonthRange('2026-10-26', '2026-11-01')).toBe('26. okt. – 1. nov.');
    expect(formatDayMonthRange('2026-12-28', '2027-01-03')).toBe('28. des. – 3. jan.');
    expect(dayLabel('2026-10-14', '2026-10-14', false, false)).toBe(
      'Onsdag 14. oktober, i dag, hviledag',
    );
    expect(dayLabel('2026-10-12', '2026-10-14', true, true)).toBe(
      'Mandag 12. oktober, økt fullført',
    );
  });
});
