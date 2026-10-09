import { describe, expect, it } from 'vitest';
import {
  amountLines,
  dayTotals,
  dislikedHits,
  kcalStatus,
  mealTotals,
  rangeStatus,
  roundGrams,
} from '../../src/lib/nutrition';
import type { Ingredient, Meal } from '../../src/types';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();
const ingredients = new Map<string, Ingredient>(
  seed.ingredients.map((i) => [i.id, { ...i, source: 'seed', userModified: false, active: true }]),
);
const meals = new Map<string, Meal>(
  seed.meals.map((m) => [m.id, { ...m, source: 'seed', userModified: false }]),
);
const meal = (id: string) => meals.get(id)!;

const expected = [
  { id: 'F1', kcal: 664, protein: 46.2, carbs: 80.0, fat: 15.5, price: 22.22 },
  { id: 'L1', kcal: 643, protein: 52.0, carbs: 75.2, fat: 13.9, price: 33.21 },
  { id: 'L2', kcal: 696, protein: 54.4, carbs: 86.1, fat: 14.1, price: 40.6 },
  { id: 'D1', kcal: 658, protein: 50.4, carbs: 78.7, fat: 14.6, price: 35.16 },
  { id: 'D2', kcal: 675, protein: 40.9, carbs: 79.7, fat: 20.1, price: 29.07 },
  { id: 'K1', kcal: 382, protein: 37.8, carbs: 44.6, fat: 5.2, price: 26.8 },
  { id: 'K3', kcal: 427, protein: 38.9, carbs: 55.9, fat: 4.8, price: 21.08 },
];

describe('makroer og pris per måltid (fixture)', () => {
  it.each(expected)('$id', ({ id, kcal, protein, carbs, fat, price }) => {
    const t = mealTotals(meal(id), ingredients);
    expect(Math.abs(t.kcal - kcal)).toBeLessThanOrEqual(1);
    expect(t.protein).toBeCloseTo(protein, 0);
    expect(Math.abs(t.protein - protein)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(t.carbs - carbs)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(t.fat - fat)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(t.priceNok - price)).toBeLessThanOrEqual(0.5);
  });

  it('standarddag F1 + L1 + D1 + K1', () => {
    const day = seed.standardDay;
    const t = dayTotals(
      [meal(day.frokost), meal(day.lunsj), meal(day.middag), meal(day.kveldsmat)],
      [],
      ingredients,
    );
    expect(Math.abs(t.kcal - 2347)).toBeLessThanOrEqual(1);
    expect(Math.abs(t.protein - 186.3)).toBeLessThanOrEqual(0.15);
    expect(Math.abs(t.carbs - 278.4)).toBeLessThanOrEqual(0.15);
    expect(Math.abs(t.fat - 49.1)).toBeLessThanOrEqual(0.15);
    expect(Math.abs(t.priceNok - 117.4)).toBeLessThanOrEqual(0.5);
  });

  it('alle 180 kombinasjoner ligger mellom 2 193 og 2 465 kcal', () => {
    const bySlot = (slot: string) => seed.meals.filter((m) => m.slot === slot).map((m) => m.id);
    const combos: number[] = [];
    for (const f of bySlot('frokost'))
      for (const l of bySlot('lunsj'))
        for (const d of bySlot('middag'))
          for (const k of bySlot('kveldsmat')) {
            combos.push(dayTotals([meal(f), meal(l), meal(d), meal(k)], [], ingredients).kcal);
          }
    expect(combos).toHaveLength(180);
    expect(Math.round(Math.min(...combos))).toBeGreaterThanOrEqual(2193 - 1);
    expect(Math.round(Math.max(...combos))).toBeLessThanOrEqual(2465 + 1);
    expect(Math.abs(Math.min(...combos) - 2193)).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.max(...combos) - 2465)).toBeLessThanOrEqual(1);
  });

  it('ekstra poster legges til dagen', () => {
    const t = dayTotals([meal('F1')], [{ kcal: 200, protein: 10 }], ingredients);
    expect(Math.round(t.kcal)).toBe(864);
  });
});

describe('batch-mengder', () => {
  it('ganger med batchPortions og runder fornuftig', () => {
    const lines = amountLines(meal('L1'), ingredients, 4);
    const chicken = lines.find((l) => l.ingredient.id === 'kyllingfilet')!;
    expect(chicken.roundedGrams).toBe(680);
    const D1 = amountLines(meal('D1'), ingredients, 4);
    const onion = D1.find((l) => l.ingredient.id === 'lok')!;
    expect(onion.roundedGrams).toBe(200);
    expect(onion.units).toEqual({ count: 1.5, name: 'stk' });
  });

  it('runder gram', () => {
    expect(roundGrams(683)).toBe(680);
    expect(roundGrams(42)).toBe(40);
    expect(roundGrams(7)).toBe(7);
  });
});

describe('mislikt mat', () => {
  it('finner treff i ingrediensnavn', () => {
    const custom = new Map(ingredients);
    custom.set('tomater', {
      ...ingredients.get('mais')!,
      id: 'tomater',
      name: 'Hermetiske tomater',
    });
    const m = { ingredientsPerPortion: [{ ingredientId: 'tomater', grams: 100 }] };
    expect(dislikedHits(m, custom, seed.settings.dislikedFoods)).toEqual(['tomat']);
    expect(dislikedHits(meal('L1'), ingredients, seed.settings.dislikedFoods)).toEqual([]);
  });
});

describe('mål', () => {
  it('kcal ± toleranse', () => {
    expect(kcalStatus(2347, 2400, 100)).toBe('ok');
    expect(kcalStatus(2290, 2400, 100)).toBe('under');
    expect(kcalStatus(2510, 2400, 100)).toBe('over');
  });
  it('protein i området', () => {
    expect(rangeStatus(186.3, [170, 190])).toBe('ok');
    expect(rangeStatus(150, [170, 190])).toBe('under');
  });
});
