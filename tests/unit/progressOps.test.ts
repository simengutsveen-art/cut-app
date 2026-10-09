import { describe, expect, it } from 'vitest';
import { acceptAdjustment, addPhotos, removePhoto, setWaist } from '../../src/data/progressOps';
import { initDatabase } from '../../src/data/seedSync';
import { fixtureSeed, freshDb } from '../helpers';

describe('justeringer og målinger', () => {
  it('godtatt justering oppdaterer kcal-/skrittmål og logges', async () => {
    const db = freshDb();
    await initDatabase(db, fixtureSeed());
    await acceptAdjustment(db, {
      date: '2026-11-01',
      week: 3,
      ruleId: 'stopp',
      kcalDelta: 0,
      stepsDelta: 2000,
    });
    await acceptAdjustment(db, {
      date: '2026-11-15',
      week: 5,
      ruleId: 'stopp',
      kcalDelta: -150,
      stepsDelta: 0,
    });
    const settings = (await db.settings.get('app'))!;
    expect(settings.currentKcalTarget).toBe(2250);
    expect(settings.stepsBonus).toBe(2000);
    expect(await db.adjustments.count()).toBe(2);
    db.close();
  });

  it('livvidde og bilder per dato', async () => {
    const db = freshDb();
    await setWaist(db, '2026-10-18', 91.5);
    await addPhotos(db, '2026-10-18', [new Blob(['a'], { type: 'image/jpeg' })]);
    expect(await db.measurements.get('2026-10-18')).toMatchObject({ waistCm: 91.5 });
    await removePhoto(db, '2026-10-18', 0);
    await setWaist(db, '2026-10-18', null);
    expect(await db.measurements.get('2026-10-18')).toBeUndefined();
    db.close();
  });
});
