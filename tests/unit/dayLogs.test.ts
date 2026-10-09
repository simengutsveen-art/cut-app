import { describe, expect, it } from 'vitest';
import { addExtra, patchDayLog, removeExtra, setMeal } from '../../src/data/dayLogs';
import { freshDb } from '../helpers';

describe('dagslogg', () => {
  it('lager logg ved første endring og beholder resten', async () => {
    const db = freshDb();
    await patchDayLog(db, '2026-10-12', { weightKg: 80.2 });
    await patchDayLog(db, '2026-10-12', { steps: 9500 });
    await setMeal(db, '2026-10-12', 'lunsj', 'L3');
    await addExtra(db, '2026-10-12', { name: 'Proteinbar', kcal: 200, protein: 20 });
    let log = (await db.dayLogs.get('2026-10-12'))!;
    expect(log).toMatchObject({
      weightKg: 80.2,
      steps: 9500,
      meals: { lunsj: 'L3' },
      coreDone: false,
    });
    expect(log.extras).toHaveLength(1);

    await setMeal(db, '2026-10-12', 'lunsj', null);
    await removeExtra(db, '2026-10-12', log.extras[0].id);
    log = (await db.dayLogs.get('2026-10-12'))!;
    expect(log.meals).toEqual({});
    expect(log.extras).toEqual([]);
    expect(log.weightKg).toBe(80.2);
    db.close();
  });
});
