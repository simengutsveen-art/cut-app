// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  dayLogsToCsv,
  exportBackup,
  importBackup,
  parseBackup,
  type BackupFile,
} from '../../src/data/backup';
import { addPhotos, acceptAdjustment, setWaist } from '../../src/data/progressOps';
import { initDatabase } from '../../src/data/seedSync';
import { startWorkout, completeSet, finishWorkout } from '../../src/data/workouts';
import type { Exercise, Session } from '../../src/types';
import { fixtureSeed, freshDb } from '../helpers';

const seed = fixtureSeed();

async function populated() {
  const db = freshDb();
  await initDatabase(db, seed);
  await db.dayLogs.bulkPut([
    {
      date: '2026-10-12',
      weightKg: 80.2,
      steps: 9500,
      meals: { lunsj: 'L3' },
      extras: [],
      coreDone: true,
      pain: 2,
    },
    {
      date: '2026-10-13',
      weightKg: 80.0,
      meals: {},
      extras: [{ id: 'x1', name: 'Bar', kcal: 200, protein: 20 }],
      coreDone: false,
      note: 'Sliten; "lang dag"',
    },
  ]);
  await setWaist(db, '2026-10-18', 91.5);
  await addPhotos(db, '2026-10-18', [
    new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }),
  ]);
  await acceptAdjustment(db, {
    date: '2026-11-01',
    week: 3,
    ruleId: 'stopp',
    kcalDelta: 0,
    stepsDelta: 2000,
  });
  const ex = (await db.exercises.get('benkpress'))!;
  await db.exercises.put({
    ...ex,
    userModified: true,
    customImages: [new Blob(['bilde'], { type: 'image/png' })],
  });
  const exercisesById = new Map<string, Exercise>(
    (await db.exercises.toArray()).map((e) => [e.id, e]),
  );
  const session = (await db.sessions.get('okt1')) as Session;
  const id = await startWorkout(db, session, '2026-10-12', {
    settings: seed.settings,
    phases: seed.phases,
    progression: seed.progression,
    exercisesById,
  });
  await completeSet(db, id, 0, 0, 0);
  await finishWorkout(db, id);
  await db.setMeta('shoppingHave', { '1': ['kyllingfilet'] });
  return db;
}

function withoutTimestamp(b: BackupFile) {
  return { ...b, exportedAt: '' };
}

describe('backup', () => {
  it('eksport → import gir identisk database', async () => {
    const source = await populated();
    const backup = await exportBackup(source);
    const text = JSON.stringify(backup);

    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.preview.counts.dayLogs).toBe(2);
    expect(parsed.preview.photoCount).toBe(1);
    expect(parsed.preview.firstDate).toBe('2026-10-12');

    const target = freshDb();
    await initDatabase(target, seed);
    await target.dayLogs.put({ date: '2030-01-01', meals: {}, extras: [], coreDone: false });
    await importBackup(target, parsed.backup);

    const again = await exportBackup(target);
    expect(withoutTimestamp(again)).toEqual(withoutTimestamp(backup));
    expect(await target.dayLogs.get('2030-01-01')).toBeUndefined();

    const photo = (await target.measurements.get('2026-10-18'))!.photos[0];
    expect(photo.type).toBe('image/jpeg');
    source.close();
    target.close();
  });

  it('avviser ugyldige filer med forklaring', () => {
    expect(parseBackup('ikke json')).toEqual({ ok: false, error: 'Fila er ikke gyldig JSON.' });
    const r = parseBackup(JSON.stringify({ format: 'noe annet' }));
    expect(r.ok).toBe(false);
    const newer = parseBackup(
      JSON.stringify({
        format: 'cut-backup',
        version: 1,
        exportedAt: '',
        schemaVersion: 99,
        seedVersion: 'x',
        tables: {
          settings: [],
          ingredients: [],
          meals: [],
          exercises: [],
          sessions: [],
          dayLogs: [],
          workoutLogs: [],
          measurements: [],
          adjustments: [],
          meta: [],
        },
      }),
    );
    expect(newer.ok).toBe(false);
    expect(!newer.ok && newer.error).toMatch(/nyere versjon/);
  });

  it('CSV med semikolon og desimalkomma', () => {
    const csv = dayLogsToCsv([
      {
        date: '2026-10-12',
        weightKg: 80.2,
        steps: 9500,
        kcal: 2347.4,
        protein: 186.3,
        coreDone: true,
        pain: 2,
      },
    ]);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Dato;Vekt (kg);Skritt;Kcal;Protein (g);Core;Smerte;Notat');
    expect(lines[1]).toBe('12.10.2026;80,2;9500;2347;186,3;ja;2;');
  });
});
