import type { Ingredient, Meal, MealPrepRotationEntry } from '../types';
import { fmtNok, formatNumber } from './format';
import { ingredientCost, roundGrams } from './nutrition';
import { rotationForWeek } from './mealPrep';

export const DAYS_PER_WEEK = 7;

export interface ShoppingLine {
  ingredient: Ingredient;
  grams: number;
  /** Basisvare: bare forbruket vises, ingen pakker eller pris */
  pantry: boolean;
  packs: number | null;
  priceNok: number | null;
  /** Hva forbruket ville kostet (også for basisvarer) */
  usageCostNok: number;
}

export interface ShoppingGroup {
  category: string;
  lines: ShoppingLine[];
}

export interface ShoppingList {
  week: number;
  mealsUsed: { meal: Meal; portions: number; role: 'prep' | 'daily' }[];
  groups: ShoppingGroup[];
  /** Sum for alt som skal kjøpes (uten «har hjemme») */
  totalNok: number;
  /** Sum før «har hjemme» trekkes fra */
  fullTotalNok: number;
}

/**
 * Handleliste for en uke: prep-måltidene fra rotasjonen × batchPortions (4),
 * pluss valgt frokost og kveldsmat × 7. Pakker = ceil(gram / pack.grams).
 */
export function buildShoppingList(params: {
  week: number;
  rotation: MealPrepRotationEntry[];
  breakfastId: string;
  eveningId: string;
  meals: Map<string, Meal>;
  ingredients: Map<string, Ingredient>;
  have?: Set<string>;
}): ShoppingList {
  const { week, rotation, meals, ingredients } = params;
  const have = params.have ?? new Set<string>();
  const used: ShoppingList['mealsUsed'] = [];

  const entry = rotationForWeek(rotation, week);
  if (entry) {
    for (const id of [
      entry.sunday.lunsj,
      entry.sunday.middag,
      entry.wednesday.lunsj,
      entry.wednesday.middag,
    ]) {
      const meal = meals.get(id);
      if (meal) used.push({ meal, portions: meal.batchPortions, role: 'prep' });
    }
  }
  for (const id of [params.breakfastId, params.eveningId]) {
    const meal = meals.get(id);
    if (meal) used.push({ meal, portions: DAYS_PER_WEEK, role: 'daily' });
  }

  const gramsById = new Map<string, number>();
  for (const { meal, portions } of used) {
    for (const item of meal.ingredientsPerPortion) {
      gramsById.set(
        item.ingredientId,
        (gramsById.get(item.ingredientId) ?? 0) + item.grams * portions,
      );
    }
  }

  const groupsMap = new Map<string, ShoppingLine[]>();
  let totalNok = 0;
  let fullTotalNok = 0;
  for (const [id, grams] of gramsById) {
    const ingredient = ingredients.get(id);
    if (!ingredient) continue;
    const pantry = ingredient.isPantryStaple;
    const packs = pantry ? null : Math.ceil(grams / ingredient.pack.grams - 1e-9);
    const priceNok = packs === null ? null : packs * ingredient.pack.priceNok;
    if (priceNok !== null) {
      fullTotalNok += priceNok;
      if (!have.has(id)) totalNok += priceNok;
    }
    const line: ShoppingLine = {
      ingredient,
      grams,
      pantry,
      packs,
      priceNok,
      usageCostNok: ingredientCost(ingredient, grams),
    };
    const list = groupsMap.get(ingredient.category) ?? [];
    list.push(line);
    groupsMap.set(ingredient.category, list);
  }

  const groups = [...groupsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'nb'))
    .map(([category, lines]) => ({
      category,
      lines: lines.sort((a, b) =>
        a.pantry === b.pantry
          ? a.ingredient.name.localeCompare(b.ingredient.name, 'nb')
          : a.pantry
            ? 1
            : -1,
      ),
    }));

  return { week, mealsUsed: used, groups, totalNok, fullTotalNok };
}

function gramsText(grams: number): string {
  const g = roundGrams(grams);
  return g >= 1000 ? `${formatNumber(g / 1000, 2)} kg` : `${formatNumber(g)} g`;
}

export function shoppingLineText(line: ShoppingLine): string {
  if (line.pantry) return `${line.ingredient.name}: basisvare, forbruk ${gramsText(line.grams)}`;
  return `${line.ingredient.name}: ${line.packs} × ${line.ingredient.pack.label} (${gramsText(line.grams)}) – ${fmtNok(line.priceNok ?? 0)}`;
}

/** Handlelista som ren tekst (for Web Share). */
export function shoppingListText(list: ShoppingList, have: Set<string>): string {
  const lines: string[] = [`Handleliste uke ${list.week}`, ''];
  for (const group of list.groups) {
    const items = group.lines.filter((l) => !have.has(l.ingredient.id));
    if (items.length === 0) continue;
    lines.push(group.category.toLocaleUpperCase('nb'));
    for (const line of items) lines.push(`☐ ${shoppingLineText(line)}`);
    lines.push('');
  }
  lines.push(`Sum: ${fmtNok(list.totalNok)}`);
  return lines.join('\n');
}

export { gramsText as shoppingGramsText };
