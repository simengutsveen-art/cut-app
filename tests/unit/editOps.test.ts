import { describe, expect, it } from 'vitest';
import {
  canDelete,
  deleteEntity,
  nextMealId,
  saveEntity,
  setActive,
  slugId,
  usageOf,
} from '../../src/data/editOps';
import { initDatabase } from '../../src/data/seedSync';
import { fixtureSeed, freshDb } from '../helpers';

const seed = fixtureSeed();

describe('redigering', () => {
  it('endring av seed-element merkes userModified', async () => {
    const db = freshDb();
    await initDatabase(db, seed);
    const chicken = (await db.ingredients.get('kyllingfilet'))!;
    await saveEntity(db, 'ingredients', { ...chicken, per100g: { ...chicken.per100g, kcal: 110 } });
    expect(await db.ingredients.get('kyllingfilet')).toMatchObject({
      userModified: true,
      per100g: { kcal: 110 },
    });
    db.close();
  });

  it('kan ikke slette noe som brukes i logger – deaktiver i stedet', async () => {
    const db = freshDb();
    await initDatabase(db, seed);
    const own = { ...(await db.meals.get('K2'))!, id: 'K9', name: 'Egen', source: 'user' as const };
    await saveEntity(db, 'meals', own);
    await db.dayLogs.put({
      date: '2026-10-12',
      meals: { kveldsmat: 'K9' },
      extras: [],
      coreDone: false,
    });

    const usage = await usageOf(db, 'meals', 'K9');
    expect(usage.inLogs).toBe(1);
    expect(canDelete('user', usage)).toBe(false);
    expect(await deleteEntity(db, 'meals', 'K9')).toBe(false);
    expect(await db.meals.get('K9')).toBeDefined();

    await setActive(db, 'meals', 'K9', false);
    expect((await db.meals.get('K9'))!.active).toBe(false);

    await db.dayLogs.clear();
    expect(await deleteEntity(db, 'meals', 'K9')).toBe(true);
    db.close();
  });

  it('seed-elementer kan bare deaktiveres', async () => {
    const db = freshDb();
    await initDatabase(db, seed);
    expect(await deleteEntity(db, 'exercises', 'pec_deck')).toBe(false);
    const usage = await usageOf(db, 'ingredients', 'kyllingfilet');
    expect(usage.references.length).toBeGreaterThan(0);
    db.close();
  });

  it('lager ledige ID-er', () => {
    expect(nextMealId('lunsj', ['L1', 'L2', 'L3', 'L4'])).toBe('L5');
    expect(slugId('Bulgarsk utfall på bøy', ['bulgarsk_utfall'])).toBe('bulgarsk_utfall_pa_boy');
    expect(slugId('Benkpress', ['benkpress'])).toBe('benkpress_2');
  });
});
