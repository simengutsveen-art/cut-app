import { describe, expect, it } from 'vitest';
import { startPlan } from '../../src/data/progressOps';
import { parseSeed } from '../../src/data/schema';
import { applySeedUpdate, initDatabase, isNewerSeed, resetToSeed } from '../../src/data/seedSync';
import { fixtureSeed, freshDb, rawFixture } from '../helpers';

function newerSeed() {
  const raw = rawFixture() as ReturnType<typeof fixtureSeed>;
  raw.seedVersion = '2026-11-01';
  // Endring i et element Simen har endret, og i et han ikke har endret:
  raw.ingredients.find((i) => i.id === 'kyllingfilet')!.pack.priceNok = 179.9;
  raw.ingredients.find((i) => i.id === 'ris')!.pack.priceNok = 39.9;
  // Nytt element:
  raw.meals.push({
    ...raw.meals.find((m) => m.id === 'K2')!,
    id: 'K4',
    name: 'Kesam med bær',
  });
  return parseSeed(raw);
}

describe('seed-oppdatering', () => {
  it('sammenligner versjoner', () => {
    expect(isNewerSeed('2026-11-01', '2026-10-09')).toBe(true);
    expect(isNewerSeed('2026-10-09', '2026-10-09')).toBe(false);
    expect(isNewerSeed('2026-10-09', undefined)).toBe(true);
  });

  it('overskriver ikke brukerendrede elementer, legger til nye og sletter ingenting', async () => {
    const db = freshDb();
    await initDatabase(db, fixtureSeed());

    // Simen endrer kyllingfilet og logger litt.
    const chicken = (await db.ingredients.get('kyllingfilet'))!;
    await db.ingredients.put({
      ...chicken,
      per100g: { ...chicken.per100g, kcal: 110 },
      userModified: true,
    });
    await db.ingredients.add({ ...chicken, id: 'min_egen', name: 'Min egen', source: 'user' });
    await db.dayLogs.put({
      date: '2026-10-12',
      weightKg: 80.2,
      meals: {},
      extras: [],
      coreDone: true,
    });

    const summary = await applySeedUpdate(db, newerSeed());

    expect(summary.added.map((a) => a.id)).toEqual(['K4']);
    expect(summary.updated.map((a) => a.id)).toEqual(['ris']);
    expect(summary.keptUserModified.map((a) => a.id)).toContain('kyllingfilet');

    const after = (await db.ingredients.get('kyllingfilet'))!;
    expect(after.per100g.kcal).toBe(110);
    expect(after.pack.priceNok).toBe(164.8);
    expect((await db.ingredients.get('ris'))!.pack.priceNok).toBe(39.9);
    expect(await db.meals.get('K4')).toMatchObject({ name: 'Kesam med bær', source: 'seed' });
    expect(await db.ingredients.get('min_egen')).toBeDefined();
    expect(await db.dayLogs.get('2026-10-12')).toMatchObject({ weightKg: 80.2 });
    expect(await db.getMeta('seedVersion')).toBe('2026-11-01');
    db.close();
  });

  it('startdatoen fra «Start nå» flyttes ikke av en plan-oppdatering', async () => {
    const db = freshDb();
    await initDatabase(db, fixtureSeed());
    await startPlan(db, '2026-10-09');
    const summary = await applySeedUpdate(db, newerSeed());
    expect(summary.settingsUpdated).toBe(false);
    expect(await db.settings.get('app')).toMatchObject({
      startDate: '2026-10-09',
      planStarted: true,
      userModified: false,
    });
    db.close();
  });

  it('«Tilbakestill til standard» gir seed-versjonen igjen', async () => {
    const db = freshDb();
    const seed = fixtureSeed();
    await initDatabase(db, seed);
    const chicken = (await db.ingredients.get('kyllingfilet'))!;
    await db.ingredients.put({
      ...chicken,
      per100g: { ...chicken.per100g, kcal: 110 },
      userModified: true,
    });
    await resetToSeed(db, seed, 'ingredients', 'kyllingfilet');
    expect(await db.ingredients.get('kyllingfilet')).toMatchObject({
      per100g: { kcal: 105 },
      userModified: false,
      source: 'seed',
    });
    db.close();
  });
});
