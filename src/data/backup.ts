import { z } from 'zod';
import type { CutDB } from '../db';
import { SCHEMA_VERSION } from '../db';
import type {
  Adjustment,
  AppSettings,
  DayLog,
  Exercise,
  Ingredient,
  Meal,
  Measurement,
  MetaRow,
  Session,
  WorkoutLog,
} from '../types';
import {
  adjustmentRulesSchema,
  adjustmentSchema,
  backupExerciseSchema,
  backupIngredientSchema,
  backupMeasurementSchema,
  backupMealSchema,
  backupSessionSchema,
  coreRoutineSchema,
  dayLogSchema,
  encodedBlobSchema,
  guidesSchema,
  imageSourceSchema,
  mealPrepRotationSchema,
  phaseSchema,
  progressionSchema,
  settingsRowSchema,
  slotSchema,
  workoutLogSchema,
} from './schema';

export const BACKUP_FORMAT = 'cut-backup';
export const BACKUP_VERSION = 1;

type EncodedBlob = z.infer<typeof encodedBlobSchema>;

// ---------- Blob <-> base64 ----------

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function encodeBlob(blob: Blob): Promise<EncodedBlob> {
  const bytes = await blobToBytes(blob);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { __blob: true, type: blob.type, base64: btoa(binary) };
}

export function decodeBlob(encoded: EncodedBlob): Blob {
  const binary = atob(encoded.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: encoded.type });
}

// ---------- Skjema for backup-fila ----------

const planContentSchema = z.object({
  disclaimer: z.string(),
  generatedFrom: z.string().optional(),
  standardDay: z.record(slotSchema, z.string()),
  mealPrepRotation: mealPrepRotationSchema,
  phases: z.array(phaseSchema),
  progression: progressionSchema,
  coreRoutine: coreRoutineSchema,
  adjustmentRules: adjustmentRulesSchema,
  guides: guidesSchema,
  imageSource: imageSourceSchema,
});

const metaRowBackupSchema = z.union([
  z.object({ key: z.literal('schemaVersion'), value: z.number().int() }),
  z.object({ key: z.literal('seedVersion'), value: z.string() }),
  z.object({ key: z.literal('lastBackupAt'), value: z.number().nullable() }),
  z.object({ key: z.literal('plan'), value: planContentSchema }),
  z.object({ key: z.literal('dismissedChecks'), value: z.array(z.number().int()) }),
  z.object({
    key: z.literal('shoppingHave'),
    value: z.record(z.string(), z.array(z.string())),
  }),
]);

export const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int(),
  exportedAt: z.string(),
  schemaVersion: z.number().int(),
  seedVersion: z.string(),
  tables: z.object({
    settings: z.array(settingsRowSchema),
    ingredients: z.array(backupIngredientSchema),
    meals: z.array(backupMealSchema),
    exercises: z.array(backupExerciseSchema),
    sessions: z.array(backupSessionSchema),
    dayLogs: z.array(dayLogSchema),
    workoutLogs: z.array(workoutLogSchema),
    measurements: z.array(backupMeasurementSchema),
    adjustments: z.array(adjustmentSchema),
    meta: z.array(metaRowBackupSchema),
  }),
});

export type BackupFile = z.output<typeof backupFileSchema>;

// ---------- Eksport ----------

export async function exportBackup(db: CutDB, now = new Date()): Promise<BackupFile> {
  return db.transaction('r', db.allTables, async () => {
    const exercises = await db.exercises.toArray();
    const measurements = await db.measurements.toArray();
    const meta = await db.meta.toArray();
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      schemaVersion: (await db.getMeta('schemaVersion')) ?? SCHEMA_VERSION,
      seedVersion: (await db.getMeta('seedVersion')) ?? '',
      tables: {
        settings: await db.settings.toArray(),
        ingredients: await db.ingredients.toArray(),
        meals: await db.meals.toArray(),
        exercises: await Promise.all(
          exercises.map(async (e) => {
            const { customImages, ...rest } = e;
            return customImages && customImages.length
              ? { ...rest, customImages: await Promise.all(customImages.map(encodeBlob)) }
              : rest;
          }),
        ),
        sessions: await db.sessions.toArray(),
        dayLogs: await db.dayLogs.toArray(),
        workoutLogs: await db.workoutLogs.toArray(),
        measurements: await Promise.all(
          measurements.map(async (m) => ({
            ...m,
            photos: await Promise.all(m.photos.map(encodeBlob)),
          })),
        ),
        adjustments: await db.adjustments.toArray(),
        meta: meta.filter((m) =>
          [
            'schemaVersion',
            'seedVersion',
            'lastBackupAt',
            'plan',
            'dismissedChecks',
            'shoppingHave',
          ].includes(m.key),
        ),
      },
    } as BackupFile;
  });
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `cut-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// ---------- Import ----------

export type ParseResult =
  { ok: true; backup: BackupFile; preview: BackupPreview } | { ok: false; error: string };

export interface BackupPreview {
  exportedAt: string;
  seedVersion: string;
  counts: Record<keyof BackupFile['tables'], number>;
  firstDate: string | null;
  lastDate: string | null;
  photoCount: number;
}

/** Leser og validerer en backup-fil (tekst) med zod. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Fila er ikke gyldig JSON.' };
  }
  const result = backupFileSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: `Fila er ikke en gyldig backup:\n${z.prettifyError(result.error)}` };
  }
  const backup = result.data;
  if (backup.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Backupen er laget med en nyere versjon av appen (skjema ${backup.schemaVersion}). Oppdater appen først.`,
    };
  }
  const dates = backup.tables.dayLogs.map((d) => d.date).sort();
  const counts = Object.fromEntries(
    Object.entries(backup.tables).map(([k, v]) => [k, v.length]),
  ) as BackupPreview['counts'];
  return {
    ok: true,
    backup,
    preview: {
      exportedAt: backup.exportedAt,
      seedVersion: backup.seedVersion,
      counts,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      photoCount: backup.tables.measurements.reduce((n, m) => n + m.photos.length, 0),
    },
  };
}

/** Erstatter hele databasen med innholdet i backupen. */
export async function importBackup(db: CutDB, backup: BackupFile): Promise<void> {
  const t = backup.tables;
  const exercises: Exercise[] = t.exercises.map((e) => {
    const { customImages, ...rest } = e;
    return customImages ? { ...rest, customImages: customImages.map(decodeBlob) } : rest;
  });
  const measurements: Measurement[] = t.measurements.map((m) => ({
    ...m,
    photos: m.photos.map(decodeBlob),
  }));
  await db.transaction('rw', db.allTables, async () => {
    await Promise.all(db.allTables.map((table) => table.clear()));
    await db.settings.bulkPut(t.settings as AppSettings[]);
    await db.ingredients.bulkPut(t.ingredients as Ingredient[]);
    await db.meals.bulkPut(t.meals as Meal[]);
    await db.exercises.bulkPut(exercises);
    await db.sessions.bulkPut(t.sessions as Session[]);
    await db.dayLogs.bulkPut(t.dayLogs as DayLog[]);
    await db.workoutLogs.bulkPut(t.workoutLogs as WorkoutLog[]);
    await db.measurements.bulkPut(measurements);
    await db.adjustments.bulkPut(t.adjustments as Adjustment[]);
    await db.meta.bulkPut(t.meta as MetaRow[]);
  });
}

// ---------- CSV (åpnes i Excel) ----------

export interface CsvRow {
  date: string;
  weightKg?: number | null;
  steps?: number | null;
  kcal: number;
  protein: number;
  coreDone: boolean;
  pain?: number | null;
  note?: string;
}

function csvNumber(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return '';
  return n.toFixed(decimals).replace('.', ',');
}

function csvText(s: string | undefined): string {
  if (!s) return '';
  return `"${s.replace(/"/g, '""')}"`;
}

/** Semikolonseparert med desimalkomma og BOM, så norsk Excel åpner den riktig. */
export function dayLogsToCsv(rows: CsvRow[]): string {
  const header = ['Dato', 'Vekt (kg)', 'Skritt', 'Kcal', 'Protein (g)', 'Core', 'Smerte', 'Notat'];
  const lines = rows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) =>
      [
        r.date.split('-').reverse().join('.'),
        csvNumber(r.weightKg, 1),
        r.steps ?? '',
        Math.round(r.kcal),
        csvNumber(r.protein, 1),
        r.coreDone ? 'ja' : 'nei',
        r.pain ?? '',
        csvText(r.note),
      ].join(';'),
    );
  return String.fromCharCode(0xfeff) + [header.join(';'), ...lines].join('\r\n');
}
