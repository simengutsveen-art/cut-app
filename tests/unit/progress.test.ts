import { describe, expect, it } from 'vitest';
import { fmtKcal, fmtKg, formatNumber, parseDecimal, toInputValue } from '../../src/lib/format';
import { backAlert, painEntry } from '../../src/lib/pain';
import {
  averageLossPerWeek,
  forecastWeight,
  lossPerWeek,
  sessionsCompletedByWeek,
  stepGoal,
  targetWeight,
  waistByWeek,
  waistDrop,
  weeklyStepAverages,
  weeklyWeightAverages,
} from '../../src/lib/progress';
import { buildShoppingList, shoppingListText } from '../../src/lib/shopping';
import type { Ingredient, Meal } from '../../src/types';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();
const start = seed.settings.startDate;

describe('norsk tallformat', () => {
  it('komma og mellomrom', () => {
    expect(fmtKcal(2400)).toBe('2 400 kcal');
    expect(fmtKg(80.2)).toBe('80,2 kg');
    expect(formatNumber(9500)).toBe('9 500');
    expect(parseDecimal('80,2')).toBe(80.2);
    expect(parseDecimal('9 500')).toBe(9500);
    expect(parseDecimal('abc')).toBeNull();
    expect(toInputValue(80.2, 1)).toBe('80,2');
  });
});

describe('skrittmål', () => {
  it('per uke, eget mål onsdag og justeringer i tillegg', () => {
    const rules = seed.settings.steps;
    expect(stepGoal(rules, 1, 1)).toBe(7000);
    expect(stepGoal(rules, 1, 3)).toBe(8000);
    expect(stepGoal(rules, 2, 2)).toBe(8500);
    expect(stepGoal(rules, 5, 3)).toBe(12000);
    expect(stepGoal(rules, 5, 1, 2000)).toBe(12000);
  });
});

describe('vekt', () => {
  const logs = [
    { date: '2026-10-11', weightKg: 81 }, // før start – telles ikke
    { date: '2026-10-12', weightKg: 80.2 },
    { date: '2026-10-14', weightKg: 79.8 },
    { date: '2026-10-26', weightKg: 79.4 },
    { date: '2026-10-28', weightKg: 79.0 },
    { date: '2026-10-20', weightKg: null },
  ];

  it('ukesnitt i ISO-uka i planen', () => {
    const avg = weeklyWeightAverages(logs, start, 12);
    expect(avg.get(1)).toBeCloseTo(80.0, 5);
    expect(avg.has(2)).toBe(false);
    expect(avg.get(3)).toBeCloseTo(79.2, 5);
  });

  it('tap per uke fra uke 3', () => {
    const avg = weeklyWeightAverages(logs, start, 12);
    expect(lossPerWeek(avg, 3)).toBe(0.4);
    expect(lossPerWeek(avg, 2)).toBeNull();
  });

  it('målkurve og prognose', () => {
    expect(targetWeight(80.2, 0.4, 12)).toBeCloseTo(75.4, 5);
    const avg = weeklyWeightAverages(logs, start, 12);
    const a = averageLossPerWeek(avg, 80.2)!;
    expect(a.week).toBe(3);
    expect(a.perWeek).toBeCloseTo(1 / 3, 5);
    expect(forecastWeight(80.2, a.perWeek, 12)).toBeCloseTo(76.2, 5);
  });
});

describe('livvidde', () => {
  it('siste måling i hver uke, startmål i uke 1', () => {
    const w = waistByWeek(
      [
        { date: '2026-10-25', waistCm: 91 },
        { date: '2026-11-01', waistCm: 90.5 },
        { date: '2026-10-31', waistCm: 90.8 },
      ],
      start,
      12,
    );
    expect(w.get(2)).toBe(91);
    expect(w.get(3)).toBe(90.5);
    expect(waistDrop(w, 3, 92)).toBe(1.5);
    expect(waistDrop(w, 4, 92)).toBe(0.5);
  });
});

describe('skritt og oppmøte', () => {
  it('ukesnitt og fullførte økter', () => {
    const steps = weeklyStepAverages(
      [
        { date: '2026-10-12', steps: 8000 },
        { date: '2026-10-13', steps: 10000 },
      ],
      start,
      12,
    );
    expect(steps.get(1)).toBe(9000);
    const done = sessionsCompletedByWeek(
      [
        { date: '2026-10-12', status: 'done' },
        { date: '2026-10-13', status: 'done' },
        { date: '2026-10-15', status: 'active' },
      ],
      start,
      12,
    );
    expect(done.get(1)).toBe(2);
  });
});

describe('smerte', () => {
  const scale = seed.coreRoutine.painScale;
  it('trafikklys', () => {
    expect(painEntry(2, scale)?.level).toBe('grønn');
    expect(painEntry(5, scale)?.level).toBe('gul');
    expect(painEntry(6, scale)?.level).toBe('rød');
  });
  it('kort ved smerte ≥ 6 eller to dager på rad med gult', () => {
    expect(backAlert([{ date: '2026-10-12', pain: 6 }], '2026-10-12', scale).show).toBe(true);
    expect(
      backAlert(
        [
          { date: '2026-10-11', pain: 4 },
          { date: '2026-10-12', pain: 5 },
        ],
        '2026-10-12',
        scale,
      ),
    ).toEqual({ show: true, reason: 'two-yellow' });
    expect(backAlert([{ date: '2026-10-12', pain: 4 }], '2026-10-12', scale).show).toBe(false);
  });
});

describe('handleliste', () => {
  const ingredients = new Map<string, Ingredient>(
    seed.ingredients.map((i) => [
      i.id,
      { ...i, source: 'seed', userModified: false, active: true },
    ]),
  );
  const meals = new Map<string, Meal>(
    seed.meals.map((m) => [m.id, { ...m, source: 'seed', userModified: false }]),
  );

  it('uke 1 med F1 og K1: kyllingfilet 2 000 g → 2 pakker, proteinpulver som basisvare', () => {
    const list = buildShoppingList({
      week: 1,
      rotation: seed.mealPrepRotation,
      breakfastId: 'F1',
      eveningId: 'K1',
      meals,
      ingredients,
    });
    const lines = list.groups.flatMap((g) => g.lines);
    const chicken = lines.find((l) => l.ingredient.id === 'kyllingfilet')!;
    expect(chicken.grams).toBe(2000);
    expect(chicken.packs).toBe(2);
    expect(chicken.priceNok).toBeCloseTo(329.6, 5);
    const whey = lines.find((l) => l.ingredient.id === 'whey')!;
    expect(whey.pantry).toBe(true);
    expect(whey.grams).toBe(210);
    expect(whey.packs).toBeNull();
    expect(list.mealsUsed.map((m) => `${m.meal.id}×${m.portions}`)).toEqual([
      'L1×4',
      'D1×4',
      'L3×4',
      'D2×4',
      'F1×7',
      'K1×7',
    ]);
  });

  it('«har hjemme» trekkes fra summen', () => {
    const params = {
      week: 1,
      rotation: seed.mealPrepRotation,
      breakfastId: 'F1',
      eveningId: 'K1',
      meals,
      ingredients,
    };
    const full = buildShoppingList(params);
    const have = new Set(['kyllingfilet']);
    const less = buildShoppingList({ ...params, have });
    expect(full.totalNok - less.totalNok).toBeCloseTo(329.6, 5);
    expect(less.fullTotalNok).toBeCloseTo(full.totalNok, 5);
    expect(shoppingListText(less, have)).not.toContain('Kyllingfilet:');
    expect(shoppingListText(full, new Set())).toContain('Kyllingfilet: 2 ×');
  });
});
