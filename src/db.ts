import Dexie, { type Table } from 'dexie';
import type {
  Adjustment,
  AppSettings,
  DayLog,
  Exercise,
  Ingredient,
  Meal,
  Measurement,
  MetaKey,
  MetaRow,
  MetaValues,
  Session,
  WorkoutLog,
} from './types';

/** Øk denne og legg til en ny db.version(n) under når tabellene endres. */
export const SCHEMA_VERSION = 1;

export const DB_NAME = 'cut';

export class CutDB extends Dexie {
  settings!: Table<AppSettings, string>;
  ingredients!: Table<Ingredient, string>;
  meals!: Table<Meal, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  dayLogs!: Table<DayLog, string>;
  workoutLogs!: Table<WorkoutLog, string>;
  measurements!: Table<Measurement, string>;
  adjustments!: Table<Adjustment, number>;
  meta!: Table<MetaRow, MetaKey>;

  constructor(name = DB_NAME) {
    super(name);

    // Versjon 1: første skjema. Endre aldri denne blokken etter at appen er i bruk.
    this.version(1).stores({
      settings: 'id',
      ingredients: 'id, category',
      meals: 'id, slot',
      exercises: 'id',
      sessions: 'id',
      dayLogs: 'date',
      workoutLogs: 'id, date, sessionId, status',
      measurements: 'date',
      adjustments: '++id, date, ruleId',
      meta: 'key',
    });

    // Eksempel på en framtidig migrasjon (data beholdes):
    // this.version(2)
    //   .stores({ dayLogs: 'date, weightKg' })
    //   .upgrade((tx) =>
    //     tx.table('dayLogs').toCollection().modify((log) => {
    //       log.extras ??= [];
    //     }),
    //   );
  }

  get allTables(): Table[] {
    return [
      this.settings,
      this.ingredients,
      this.meals,
      this.exercises,
      this.sessions,
      this.dayLogs,
      this.workoutLogs,
      this.measurements,
      this.adjustments,
      this.meta,
    ];
  }

  async getMeta<K extends MetaKey>(key: K): Promise<MetaValues[K] | undefined> {
    const row = await this.meta.get(key);
    return row?.value as MetaValues[K] | undefined;
  }

  async setMeta<K extends MetaKey>(key: K, value: MetaValues[K]): Promise<void> {
    await this.meta.put({ key, value } as MetaRow);
  }
}

export const db = new CutDB();

/** Ber nettleseren om varig lagring, så iOS ikke rydder bort data. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted?.()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Ikke støttet – appen fungerer likevel.
  }
  return false;
}
