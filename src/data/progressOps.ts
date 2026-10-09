import type { CutDB } from '../db';
import type { Adjustment, Measurement } from '../types';

/** Godtar en justering: oppdaterer kcal-/skrittmålet og logger den i adjustments. */
export async function acceptAdjustment(db: CutDB, adjustment: Omit<Adjustment, 'id'>) {
  await db.transaction('rw', db.adjustments, db.settings, async () => {
    const settings = await db.settings.get('app');
    if (!settings) return;
    await db.adjustments.add({ ...adjustment });
    await db.settings.put({
      ...settings,
      currentKcalTarget: settings.currentKcalTarget + adjustment.kcalDelta,
      stepsBonus: settings.stepsBonus + adjustment.stepsDelta,
    });
  });
}

export async function dismissCheck(db: CutDB, week: number) {
  const current = (await db.getMeta('dismissedChecks')) ?? [];
  if (!current.includes(week)) await db.setMeta('dismissedChecks', [...current, week]);
}

export async function undismissCheck(db: CutDB, week: number) {
  const current = (await db.getMeta('dismissedChecks')) ?? [];
  await db.setMeta(
    'dismissedChecks',
    current.filter((w) => w !== week),
  );
}

async function updateMeasurement(db: CutDB, date: string, fn: (m: Measurement) => void) {
  await db.transaction('rw', db.measurements, async () => {
    const m = (await db.measurements.get(date)) ?? { date, waistCm: null, photos: [] };
    fn(m);
    if ((m.waistCm === null || m.waistCm === undefined) && m.photos.length === 0) {
      await db.measurements.delete(date);
    } else {
      await db.measurements.put(m);
    }
  });
}

export function setWaist(db: CutDB, date: string, waistCm: number | null) {
  return updateMeasurement(db, date, (m) => {
    m.waistCm = waistCm;
  });
}

export function addPhotos(db: CutDB, date: string, photos: Blob[]) {
  return updateMeasurement(db, date, (m) => {
    m.photos = [...m.photos, ...photos];
  });
}

export function removePhoto(db: CutDB, date: string, index: number) {
  return updateMeasurement(db, date, (m) => {
    m.photos = m.photos.filter((_, i) => i !== index);
  });
}
