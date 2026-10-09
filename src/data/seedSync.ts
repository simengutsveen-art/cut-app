import type { CutDB } from '../db';
import { SCHEMA_VERSION } from '../db';
import { stableStringify } from '../lib/util';
import type {
  AppSettings,
  EntityTableName,
  Exercise,
  Ingredient,
  Meal,
  PlanContent,
  SeedData,
  SeedSettings,
  Session,
} from '../types';

// ---------- Fra seed til databaserader ----------

export function planFromSeed(seed: SeedData): PlanContent {
  return {
    disclaimer: seed.disclaimer,
    generatedFrom: seed.generatedFrom,
    standardDay: seed.standardDay,
    mealPrepRotation: seed.mealPrepRotation,
    phases: seed.phases,
    progression: seed.progression,
    coreRoutine: seed.coreRoutine,
    adjustmentRules: seed.adjustmentRules,
    guides: seed.guides,
    imageSource: seed.imageSource,
  };
}

export function settingsFromSeed(seed: SeedData): AppSettings {
  return {
    ...seed.settings,
    id: 'app',
    currentKcalTarget: seed.settings.kcalTarget,
    stepsBonus: 0,
    standardMeals: { ...seed.standardDay },
    weekMealChoices: {},
    theme: 'dark',
    userModified: false,
    planStarted: false,
  };
}

const seedMarks = { source: 'seed' as const, userModified: false };

export function seedIngredient(seed: SeedData, id: string): Ingredient | undefined {
  const i = seed.ingredients.find((x) => x.id === id);
  return i && { ...structuredClone(i), ...seedMarks, active: true };
}
export function seedMeal(seed: SeedData, id: string): Meal | undefined {
  const m = seed.meals.find((x) => x.id === id);
  return m && { ...structuredClone(m), ...seedMarks, active: m.active };
}
export function seedExercise(seed: SeedData, id: string): Exercise | undefined {
  const e = seed.exercises.find((x) => x.id === id);
  return e && { ...structuredClone(e), ...seedMarks, active: true };
}
export function seedSession(seed: SeedData, id: string): Session | undefined {
  const s = seed.sessions.find((x) => x.id === id);
  return s && { ...structuredClone(s), ...seedMarks, active: true };
}

const seedLookup = {
  ingredients: seedIngredient,
  meals: seedMeal,
  exercises: seedExercise,
  sessions: seedSession,
} as const;

function seedIds(seed: SeedData, table: EntityTableName): string[] {
  return seed[table].map((x) => x.id);
}

// ---------- Første oppstart ----------

export type InitResult = { status: 'seeded' | 'existing'; seedVersion: string };

/** Fyller databasen fra seed hvis den er tom. Trygg å kalle flere ganger. */
export async function initDatabase(db: CutDB, seed: SeedData): Promise<InitResult> {
  return db.transaction('rw', db.allTables, async () => {
    const existing = await db.getMeta('seedVersion');
    if (existing) return { status: 'existing', seedVersion: existing };

    await db.settings.put(settingsFromSeed(seed));
    await db.ingredients.bulkPut(
      seedIds(seed, 'ingredients').map((id) => seedIngredient(seed, id)!),
    );
    await db.meals.bulkPut(seedIds(seed, 'meals').map((id) => seedMeal(seed, id)!));
    await db.exercises.bulkPut(seedIds(seed, 'exercises').map((id) => seedExercise(seed, id)!));
    await db.sessions.bulkPut(seedIds(seed, 'sessions').map((id) => seedSession(seed, id)!));
    await db.setMeta('plan', planFromSeed(seed));
    await db.setMeta('schemaVersion', SCHEMA_VERSION);
    await db.setMeta('seedVersion', seed.seedVersion);
    if ((await db.getMeta('lastBackupAt')) === undefined) await db.setMeta('lastBackupAt', null);
    return { status: 'seeded', seedVersion: seed.seedVersion };
  });
}

// ---------- «Oppdater plan» ----------

/** seedVersion er en ISO-dato (eller annen sorterbar streng). */
export function isNewerSeed(bundled: string, installed: string | undefined): boolean {
  if (!installed) return true;
  return bundled.localeCompare(installed, 'en', { numeric: true }) > 0;
}

export interface SeedUpdateItem {
  table: EntityTableName;
  id: string;
  name: string;
}

export interface SeedUpdateSummary {
  fromVersion: string | undefined;
  toVersion: string;
  added: SeedUpdateItem[];
  updated: SeedUpdateItem[];
  keptUserModified: SeedUpdateItem[];
  settingsUpdated: boolean;
}

function comparable(row: object): string {
  // Sammenlign uten markeringsfeltene.
  const copy = { ...(row as Record<string, unknown>) };
  delete copy.source;
  delete copy.userModified;
  delete copy.customImages;
  return stableStringify(copy);
}

function pickSeedSettings(s: AppSettings | SeedSettings): SeedSettings {
  const {
    startDate,
    weeks,
    person,
    startWeightKg,
    startWaistCm,
    goalWeightRangeKg,
    goalWaistRangeCm,
    kcalTarget,
    kcalTolerance,
    kcalFloor,
    maintenanceEstimateKcal,
    bmrKcal,
    proteinTargetG,
    fatTargetG,
    carbTargetG,
    fiberMinG,
    waterL,
    plannedLossKgPerWeek,
    steps,
    dislikedFoods,
    stores,
    weeklySchedule,
    mealPrepDays,
  } = s;
  return {
    startDate,
    weeks,
    person,
    startWeightKg,
    startWaistCm,
    goalWeightRangeKg,
    goalWaistRangeCm,
    kcalTarget,
    kcalTolerance,
    kcalFloor,
    maintenanceEstimateKcal,
    bmrKcal,
    proteinTargetG,
    fatTargetG,
    carbTargetG,
    fiberMinG,
    waterL,
    plannedLossKgPerWeek,
    steps,
    dislikedFoods,
    stores,
    weeklySchedule,
    mealPrepDays,
  };
}

/**
 * Oppdaterer planen fra en nyere seed-fil:
 * - elementer Simen har endret (userModified) røres ikke
 * - nye elementer legges til
 * - ingenting slettes, og logger røres aldri
 */
export async function applySeedUpdate(db: CutDB, seed: SeedData): Promise<SeedUpdateSummary> {
  return db.transaction(
    'rw',
    [db.settings, db.ingredients, db.meals, db.exercises, db.sessions, db.meta, db.adjustments],
    async () => {
      const summary: SeedUpdateSummary = {
        fromVersion: await db.getMeta('seedVersion'),
        toVersion: seed.seedVersion,
        added: [],
        updated: [],
        keptUserModified: [],
        settingsUpdated: false,
      };

      const tables: EntityTableName[] = ['ingredients', 'meals', 'exercises', 'sessions'];
      for (const table of tables) {
        const dbTable = db[table];
        for (const id of seedIds(seed, table)) {
          const fresh = seedLookup[table](seed, id)!;
          const existing = await dbTable.get(id);
          const item = { table, id, name: fresh.name };
          if (!existing) {
            await (dbTable as typeof db.ingredients).put(fresh as Ingredient);
            summary.added.push(item);
          } else if (existing.userModified || existing.source === 'user') {
            summary.keptUserModified.push({ ...item, name: existing.name });
          } else {
            const next = { ...fresh, active: existing.active } as typeof existing;
            if (comparable(next) !== comparable(existing)) {
              await (dbTable as typeof db.ingredients).put(next as Ingredient);
              summary.updated.push(item);
            }
          }
        }
      }

      const settings = await db.settings.get('app');
      if (!settings) {
        await db.settings.put(settingsFromSeed(seed));
        summary.settingsUpdated = true;
      } else if (!settings.userModified) {
        const keepStart = settings.planStarted ? { startDate: settings.startDate } : {};
        const before = stableStringify(pickSeedSettings(settings));
        const after = stableStringify({ ...pickSeedSettings(seed.settings), ...keepStart });
        if (before !== after) {
          const adjustments = await db.adjustments.toArray();
          const kcalAdj = adjustments.reduce((sum, a) => sum + a.kcalDelta, 0);
          await db.settings.put({
            ...settings,
            ...pickSeedSettings(seed.settings),
            // Startdatoen Simen valgte med «Start nå», flyttes aldri av en plan-oppdatering.
            ...(settings.planStarted ? { startDate: settings.startDate } : {}),
            currentKcalTarget: seed.settings.kcalTarget + kcalAdj,
            standardMeals: { ...seed.standardDay },
          });
          summary.settingsUpdated = true;
        }
      }

      await db.setMeta('plan', planFromSeed(seed));
      await db.setMeta('seedVersion', seed.seedVersion);
      return summary;
    },
  );
}

// ---------- «Tilbakestill til standard» ----------

export async function resetToSeed(
  db: CutDB,
  seed: SeedData,
  table: EntityTableName,
  id: string,
): Promise<boolean> {
  const fresh = seedLookup[table](seed, id);
  if (!fresh) return false;
  await (db[table] as typeof db.ingredients).put(fresh as Ingredient);
  return true;
}

export function hasSeedVersion(seed: SeedData, table: EntityTableName, id: string): boolean {
  return seed[table].some((x) => x.id === id);
}
