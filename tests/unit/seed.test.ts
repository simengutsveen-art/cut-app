import { describe, expect, it } from 'vitest';
import { checkSeedReferences, parseSeed, SeedValidationError } from '../../src/data/schema';
import { initDatabase } from '../../src/data/seedSync';
import { fixtureSeed, freshDb, rawFixture, realSeed } from '../helpers';

describe('seed-data.json (den ekte fila)', () => {
  it('validerer med zod', () => {
    expect(() => realSeed()).not.toThrow();
  });

  it('har ingen dupliserte ID-er', () => {
    const seed = realSeed();
    for (const list of [seed.ingredients, seed.meals, seed.exercises, seed.sessions]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('har gyldige referanser', () => {
    const seed = realSeed();
    expect(checkSeedReferences(seed)).toEqual([]);
    const ingredientIds = new Set(seed.ingredients.map((i) => i.id));
    const exerciseIds = new Set(seed.exercises.map((e) => e.id));
    const sessionIds = new Set(seed.sessions.map((s) => s.id));
    const mealIds = new Set(seed.meals.map((m) => m.id));
    for (const meal of seed.meals) {
      for (const ing of meal.ingredientsPerPortion)
        expect(ingredientIds).toContain(ing.ingredientId);
    }
    for (const session of seed.sessions) {
      for (const p of session.exercises) expect(exerciseIds).toContain(p.exerciseId);
    }
    for (const value of Object.values(seed.settings.weeklySchedule)) {
      if (value !== 'hvile') expect(sessionIds).toContain(value);
    }
    for (const mealId of Object.values(seed.standardDay)) expect(mealIds).toContain(mealId);
    for (const entry of seed.mealPrepRotation) {
      for (const id of [
        entry.sunday.lunsj,
        entry.sunday.middag,
        entry.wednesday.lunsj,
        entry.wednesday.middag,
      ]) {
        expect(mealIds).toContain(id);
      }
    }
  });
});

describe('zod-validering', () => {
  it('avviser ukjent ingrediens i et måltid med lesbar melding', () => {
    const raw = rawFixture() as { meals: { ingredientsPerPortion: { ingredientId: string }[] }[] };
    raw.meals[0].ingredientsPerPortion[0].ingredientId = 'finnes_ikke';
    expect(() => parseSeed(raw)).toThrow(SeedValidationError);
    expect(() => parseSeed(raw)).toThrow(/finnes_ikke/);
  });

  it('avviser dupliserte ID-er', () => {
    const raw = rawFixture() as { exercises: { id: string }[] };
    raw.exercises[1].id = raw.exercises[0].id;
    expect(() => parseSeed(raw)).toThrow(/Duplisert ID/);
  });

  it('avviser feil datatype', () => {
    const raw = rawFixture() as { ingredients: { per100g: { kcal: unknown } }[] };
    raw.ingredients[0].per100g.kcal = 'mye';
    expect(() => parseSeed(raw)).toThrow(SeedValidationError);
  });
});

describe('første oppstart', () => {
  it('seeder databasen én gang', async () => {
    const db = freshDb();
    const seed = fixtureSeed();
    const first = await initDatabase(db, seed);
    expect(first.status).toBe('seeded');
    expect(await db.ingredients.count()).toBe(seed.ingredients.length);
    expect(await db.meals.count()).toBe(seed.meals.length);
    expect(await db.exercises.count()).toBe(seed.exercises.length);
    expect(await db.sessions.count()).toBe(seed.sessions.length);
    const settings = await db.settings.get('app');
    expect(settings?.currentKcalTarget).toBe(2400);
    expect(settings?.standardMeals).toEqual(seed.standardDay);
    expect(await db.getMeta('seedVersion')).toBe('2026-10-09');
    expect(await db.getMeta('schemaVersion')).toBe(1);

    const meal = await db.meals.get('L1');
    expect(meal).toMatchObject({ source: 'seed', userModified: false, active: true });

    const second = await initDatabase(db, seed);
    expect(second.status).toBe('existing');
    expect(await db.meals.count()).toBe(seed.meals.length);
    db.close();
  });
});
