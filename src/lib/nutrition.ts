import type { ExtraFood, Ingredient, Macros, Meal, MealIngredient, SeedIngredient } from '../types';
import { round } from './util';

export interface Totals extends Macros {
  priceNok: number;
}

export const ZERO_TOTALS: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, priceNok: 0 };

type IngredientLookup = Map<string, Pick<SeedIngredient, 'per100g' | 'pack'>>;

export function ingredientMacros(
  ingredient: Pick<SeedIngredient, 'per100g'>,
  grams: number,
): Macros {
  const f = grams / 100;
  return {
    kcal: ingredient.per100g.kcal * f,
    protein: ingredient.per100g.protein * f,
    carbs: ingredient.per100g.carbs * f,
    fat: ingredient.per100g.fat * f,
  };
}

/** Pris = pack.priceNok / pack.grams × gram */
export function ingredientCost(ingredient: Pick<SeedIngredient, 'pack'>, grams: number): number {
  return (ingredient.pack.priceNok / ingredient.pack.grams) * grams;
}

export function addTotals(a: Totals, b: Partial<Totals>): Totals {
  return {
    kcal: a.kcal + (b.kcal ?? 0),
    protein: a.protein + (b.protein ?? 0),
    carbs: a.carbs + (b.carbs ?? 0),
    fat: a.fat + (b.fat ?? 0),
    priceNok: a.priceNok + (b.priceNok ?? 0),
  };
}

/** Makroer og pris for en liste ingredienser (f.eks. én porsjon). */
export function totalsForIngredients(
  items: MealIngredient[],
  ingredients: IngredientLookup,
): Totals {
  let totals = ZERO_TOTALS;
  for (const item of items) {
    const ing = ingredients.get(item.ingredientId);
    if (!ing) continue;
    totals = addTotals(totals, {
      ...ingredientMacros(ing, item.grams),
      priceNok: ingredientCost(ing, item.grams),
    });
  }
  return totals;
}

/** Makroer og pris per porsjon. */
export function mealTotals(
  meal: Pick<Meal, 'ingredientsPerPortion'>,
  ingredients: IngredientLookup,
): Totals {
  return totalsForIngredients(meal.ingredientsPerPortion, ingredients);
}

/** Runder gram «fornuftig» for handle- og batchmengder. */
export function roundGrams(grams: number): number {
  if (grams >= 100) return Math.round(grams / 10) * 10;
  if (grams >= 20) return Math.round(grams / 5) * 5;
  return Math.max(1, Math.round(grams));
}

/** Runder antall enheter til nærmeste halve (minst ½). */
export function roundUnits(count: number): number {
  return Math.max(0.5, Math.round(count * 2) / 2);
}

export interface AmountLine {
  ingredient: Ingredient;
  grams: number;
  roundedGrams: number;
  /** Antall enheter (stk, ss, skive …) når ingrediensen har en enhet */
  units?: { count: number; name: string };
}

/** Ingrediensmengder for et antall porsjoner (1 = per porsjon, batchPortions = batch). */
export function amountLines(
  meal: Pick<Meal, 'ingredientsPerPortion'>,
  ingredients: Map<string, Ingredient>,
  portions: number,
): AmountLine[] {
  const lines: AmountLine[] = [];
  for (const item of meal.ingredientsPerPortion) {
    const ingredient = ingredients.get(item.ingredientId);
    if (!ingredient) continue;
    const grams = item.grams * portions;
    lines.push({
      ingredient,
      grams,
      roundedGrams: portions === 1 ? grams : roundGrams(grams),
      units: ingredient.unit
        ? { count: roundUnits(grams / ingredient.unit.grams), name: ingredient.unit.name }
        : undefined,
    });
  }
  return lines;
}

/** Hvilke mislikte matvarer finnes i måltidet? Sjekker ingrediensnavn og dislikeTags. */
export function dislikedHits(
  meal: Pick<Meal, 'ingredientsPerPortion'>,
  ingredients: Map<string, Pick<SeedIngredient, 'name' | 'dislikeTags'>>,
  dislikedFoods: string[],
): string[] {
  const hits = new Set<string>();
  for (const item of meal.ingredientsPerPortion) {
    const ing = ingredients.get(item.ingredientId);
    if (!ing) continue;
    const haystack = [ing.name, ...ing.dislikeTags].map((s) => s.toLocaleLowerCase('nb'));
    for (const word of dislikedFoods) {
      const w = word.trim().toLocaleLowerCase('nb');
      if (!w) continue;
      const stem = w.endsWith('er') && w.length > 4 ? w.slice(0, -2) : w;
      if (haystack.some((h) => h.includes(w) || h.includes(stem))) hits.add(word);
    }
  }
  return [...hits];
}

/** Sum for en dag: valgte måltider + ekstra poster. */
export function dayTotals(
  meals: (Pick<Meal, 'ingredientsPerPortion'> | undefined)[],
  extras: Pick<ExtraFood, 'kcal' | 'protein'>[],
  ingredients: IngredientLookup,
): Totals {
  let totals = ZERO_TOTALS;
  for (const meal of meals) {
    if (meal) totals = addTotals(totals, mealTotals(meal, ingredients));
  }
  for (const extra of extras) {
    totals = addTotals(totals, { kcal: extra.kcal, protein: extra.protein });
  }
  return totals;
}

export type TargetStatus = 'under' | 'ok' | 'over';

/** Sammenligner med kcal-mål ± toleranse. */
export function kcalStatus(kcal: number, target: number, tolerance: number): TargetStatus {
  const k = round(kcal);
  if (k < target - tolerance) return 'under';
  if (k > target + tolerance) return 'over';
  return 'ok';
}

export function rangeStatus(value: number, [min, max]: [number, number]): TargetStatus {
  const v = round(value, 1);
  if (v < min) return 'under';
  if (v > max) return 'over';
  return 'ok';
}

/** Fargetone for status mot mål: grønn = i rute, gul = under, rød = over. */
export const statusTone: Record<TargetStatus, 'good' | 'warn' | 'bad'> = {
  ok: 'good',
  under: 'warn',
  over: 'bad',
};
