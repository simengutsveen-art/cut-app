import { z } from 'zod';
import type {
  AppSettings,
  DayLog,
  Measurement,
  SeedData,
  SeedExercise,
  SeedIngredient,
  SeedMeal,
  SeedSession,
  WorkoutLog,
} from '../types';

// ---------- Byggeklosser ----------

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dato må ha formatet yyyy-mm-dd');

const nonNeg = z.number().nonnegative();
const rangeSchema = z.tuple([z.number(), z.number()]);
const intRangeSchema = z.tuple([z.number().int(), z.number().int()]);

export const slotSchema = z.enum(['frokost', 'lunsj', 'middag', 'kveldsmat']);
export const weekdayKeySchema = z.enum(['1', '2', '3', '4', '5', '6', '7']);

// ---------- Seed ----------

export const stepsRuleSchema = z.object({
  weeks: intRangeSchema,
  daily: z.number().int().nonnegative(),
  wednesday: z.number().int().nonnegative(),
});

export const seedSettingsSchema = z.object({
  startDate: isoDateSchema,
  weeks: z.number().int().positive(),
  person: z.object({
    name: z.string(),
    age: z.number(),
    heightCm: z.number(),
    sex: z.string(),
  }),
  startWeightKg: z.number().positive(),
  startWaistCm: z.number().positive(),
  goalWeightRangeKg: rangeSchema,
  goalWaistRangeCm: rangeSchema,
  kcalTarget: z.number().positive(),
  kcalTolerance: nonNeg,
  kcalFloor: nonNeg,
  maintenanceEstimateKcal: nonNeg,
  bmrKcal: nonNeg,
  proteinTargetG: rangeSchema,
  fatTargetG: rangeSchema,
  carbTargetG: rangeSchema,
  fiberMinG: nonNeg,
  waterL: rangeSchema,
  plannedLossKgPerWeek: z.number(),
  steps: z.array(stepsRuleSchema).min(1),
  dislikedFoods: z.array(z.string()),
  stores: z.array(z.string()),
  weeklySchedule: z.record(weekdayKeySchema, z.string().min(1)),
  mealPrepDays: z.array(z.number().int().min(1).max(7)),
});

export const ingredientSeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  per100g: z.object({ kcal: nonNeg, protein: nonNeg, carbs: nonNeg, fat: nonNeg }),
  pack: z.object({
    label: z.string(),
    grams: z.number().positive(),
    priceNok: nonNeg,
    store: z.string(),
    priceSource: z.string(),
  }),
  category: z.string().min(1),
  dislikeTags: z.array(z.string()).default([]),
  unit: z.object({ name: z.string().min(1), grams: z.number().positive() }).optional(),
  isPantryStaple: z.boolean().default(false),
});

export const mealSeedSchema = z.object({
  id: z.string().min(1),
  slot: slotSchema,
  name: z.string().min(1),
  description: z.string().default(''),
  isMealPrep: z.boolean().default(false),
  batchPortions: z.number().int().positive().default(1),
  ingredientsPerPortion: z
    .array(z.object({ ingredientId: z.string().min(1), grams: z.number().positive() }))
    .min(1),
  servingNote: z.string().nullable().default(null),
  steps: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const exerciseSeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageSourceId: z.string().min(1).nullable(),
  loadType: z.string().min(1),
  primaryMuscles: z.array(z.string()).default([]),
  cues: z.array(z.string()).default([]),
  alternative: z.string().nullable().default(null),
  perSide: z.boolean().default(false),
  backNote: z.string().nullable().default(null),
});

export const prescribedExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    sets: z.number().int().positive(),
    repMin: z.number().int().nonnegative(),
    repMax: z.number().int().nonnegative(),
    rir: z.string(),
    restSec: z.number().int().nonnegative(),
    startWeightNote: z.string().default(''),
    unit: z.enum(['reps', 'meter']).default('reps'),
    note: z.string().optional(),
    activeFromWeek: z.number().int().positive().optional(),
    activeUntilWeek: z.number().int().positive().optional(),
  })
  .refine((p) => p.repMin <= p.repMax, { message: 'repMin kan ikke være større enn repMax' });

export const sessionSeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  weekday: z.number().int().min(1).max(7),
  exercises: z.array(prescribedExerciseSchema),
});

export const phaseSchema = z.object({
  name: z.string(),
  weeks: intRangeSchema,
  setsDelta: z.number().int().optional(),
  setsFactor: z.number().positive().optional(),
  rirOverride: z.string().optional(),
  note: z.string().optional(),
});

export const progressionSchema = z.object({
  rule: z.string(),
  description: z.string(),
  incrementsKg: z.record(z.string(), z.number().nonnegative()),
  isolationRepsFirst: z.boolean().optional(),
  stallRule: z.string(),
});

export const coreRoutineSchema = z.object({
  when: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      imageSourceId: z.string().min(1).nullable(),
      dose: z.string(),
      cue: z.string(),
    }),
  ),
  progression: z.array(z.string()),
  painScale: z
    .array(
      z.object({
        level: z.enum(['grønn', 'gul', 'rød']),
        range: intRangeSchema,
        action: z.string(),
      }),
    )
    .min(1),
  redFlags: z.array(z.string()),
  emergency: z.string(),
});

export const adjustmentRulesSchema = z.object({
  startFromWeek: z.number().int().positive(),
  windowWeeks: z.number().int().positive(),
  rules: z
    .array(
      z.object({
        id: z.string().min(1),
        when: z.string(),
        condition: z.string().min(1),
        action: z.string(),
        kcalDelta: z.number(),
        stepsDelta: z.number().optional(),
        stepsFirst: z.boolean().optional(),
      }),
    )
    .min(1),
  notes: z.array(z.string()).default([]),
});

export const guidesSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string())]),
);

const prepSlotsSchema = z.object({ lunsj: z.string().min(1), middag: z.string().min(1) });

export const mealPrepRotationSchema = z.array(
  z.object({
    weeks: z.array(z.number().int().positive()).min(1),
    sunday: prepSlotsSchema,
    wednesday: prepSlotsSchema,
  }),
);

export const imageSourceSchema = z.object({
  name: z.string(),
  license: z.string(),
  repo: z.string(),
  pathPattern: z.string(),
});

const seedObjectSchema = z.object({
  schemaVersion: z.number().int().positive(),
  seedVersion: z.string().min(1),
  generatedFrom: z.string().optional(),
  disclaimer: z.string(),
  settings: seedSettingsSchema,
  ingredients: z.array(ingredientSeedSchema),
  meals: z.array(mealSeedSchema),
  standardDay: z.record(slotSchema, z.string().min(1)),
  mealPrepRotation: mealPrepRotationSchema,
  exercises: z.array(exerciseSeedSchema),
  sessions: z.array(sessionSeedSchema),
  phases: z.array(phaseSchema),
  progression: progressionSchema,
  coreRoutine: coreRoutineSchema,
  adjustmentRules: adjustmentRulesSchema,
  guides: guidesSchema,
  imageSource: imageSourceSchema,
});

type SeedObject = z.output<typeof seedObjectSchema>;

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
}

/** Kryssjekker referanser i seed-fila. Returnerer en liste med feilmeldinger. */
export function checkSeedReferences(
  seed: SeedObject,
): { path: (string | number)[]; message: string }[] {
  const issues: { path: (string | number)[]; message: string }[] = [];
  const add = (path: (string | number)[], message: string) => issues.push({ path, message });

  const lists = {
    ingredients: seed.ingredients,
    meals: seed.meals,
    exercises: seed.exercises,
    sessions: seed.sessions,
  } as const;
  for (const [name, list] of Object.entries(lists)) {
    for (const id of findDuplicates(list.map((x) => x.id))) {
      add([name], `Duplisert ID «${id}» i ${name}`);
    }
  }

  const ingredientIds = new Set(seed.ingredients.map((i) => i.id));
  const mealsById = new Map(seed.meals.map((m) => [m.id, m]));
  const exerciseIds = new Set(seed.exercises.map((e) => e.id));
  const sessionIds = new Set(seed.sessions.map((s) => s.id));
  const loadTypes = new Set(Object.keys(seed.progression.incrementsKg));

  seed.meals.forEach((meal, mi) => {
    meal.ingredientsPerPortion.forEach((ing, ii) => {
      if (!ingredientIds.has(ing.ingredientId)) {
        add(
          ['meals', mi, 'ingredientsPerPortion', ii, 'ingredientId'],
          `Måltid ${meal.id}: ukjent ingrediens «${ing.ingredientId}»`,
        );
      }
    });
  });

  seed.exercises.forEach((ex, ei) => {
    if (ex.alternative && !exerciseIds.has(ex.alternative)) {
      add(
        ['exercises', ei, 'alternative'],
        `Øvelse ${ex.id}: ukjent alternativ «${ex.alternative}»`,
      );
    }
    if (!loadTypes.has(ex.loadType)) {
      add(
        ['exercises', ei, 'loadType'],
        `Øvelse ${ex.id}: lasttypen «${ex.loadType}» finnes ikke i progression.incrementsKg`,
      );
    }
  });

  seed.sessions.forEach((s, si) => {
    s.exercises.forEach((p, pi) => {
      if (!exerciseIds.has(p.exerciseId)) {
        add(
          ['sessions', si, 'exercises', pi, 'exerciseId'],
          `Økt ${s.id}: ukjent øvelse «${p.exerciseId}»`,
        );
      }
    });
  });

  for (const [day, value] of Object.entries(seed.settings.weeklySchedule)) {
    if (value !== 'hvile' && !sessionIds.has(value)) {
      add(['settings', 'weeklySchedule', day], `Ukeplan dag ${day}: ukjent økt «${value}»`);
    }
  }

  for (const [slot, mealId] of Object.entries(seed.standardDay)) {
    const meal = mealsById.get(mealId);
    if (!meal) add(['standardDay', slot], `standardDay.${slot}: ukjent måltid «${mealId}»`);
    else if (meal.slot !== slot)
      add(['standardDay', slot], `standardDay.${slot}: «${mealId}» er et ${meal.slot}-måltid`);
  }

  seed.mealPrepRotation.forEach((entry, ri) => {
    for (const day of ['sunday', 'wednesday'] as const) {
      for (const slot of ['lunsj', 'middag'] as const) {
        const mealId = entry[day][slot];
        const meal = mealsById.get(mealId);
        if (!meal) {
          add(['mealPrepRotation', ri, day, slot], `Rotasjon: ukjent måltid «${mealId}»`);
        } else if (meal.slot !== slot) {
          add(['mealPrepRotation', ri, day, slot], `Rotasjon: «${mealId}» er ikke ${slot}`);
        }
      }
    }
  });

  return issues;
}

export const seedFileSchema = seedObjectSchema.superRefine((seed, ctx) => {
  for (const issue of checkSeedReferences(seed)) {
    ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
  }
});

// ---------- Database-rader (brukes også til backup) ----------

export const editableShape = {
  source: z.enum(['seed', 'user']),
  userModified: z.boolean(),
  active: z.boolean(),
};

/** Blob kodet som tekst i backup-fila */
export const encodedBlobSchema = z.object({
  __blob: z.literal(true),
  type: z.string(),
  base64: z.string(),
});

export const backupIngredientSchema = ingredientSeedSchema.extend(editableShape);
export const backupMealSchema = mealSeedSchema.extend(editableShape);
export const backupExerciseSchema = exerciseSeedSchema.extend({
  ...editableShape,
  customImages: z.array(encodedBlobSchema).optional(),
});
export const backupSessionSchema = sessionSeedSchema.extend(editableShape);

export const settingsRowSchema = seedSettingsSchema.extend({
  id: z.literal('app'),
  currentKcalTarget: z.number(),
  stepsBonus: z.number(),
  standardMeals: z.record(slotSchema, z.string()),
  weekMealChoices: z.record(
    z.string(),
    z.object({ frokost: z.string().optional(), kveldsmat: z.string().optional() }),
  ),
  theme: z.enum(['dark', 'light', 'system']),
  userModified: z.boolean(),
});

export const dayLogSchema = z.object({
  date: isoDateSchema,
  weightKg: z.number().positive().nullable().optional(),
  steps: z.number().int().nonnegative().nullable().optional(),
  meals: z.partialRecord(slotSchema, z.string()),
  extras: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kcal: z.number(),
      protein: z.number(),
    }),
  ),
  coreDone: z.boolean(),
  pain: z.number().int().min(0).max(10).nullable().optional(),
  note: z.string().optional(),
  prepDone: z.boolean().optional(),
});

export const setLogSchema = z.object({
  kg: z.number(),
  reps: z.number(),
  rir: z.number().nullable().optional(),
  done: z.boolean(),
});

export const workoutLogSchema = z.object({
  id: z.string().min(1),
  date: isoDateSchema,
  sessionId: z.string(),
  week: z.number().int(),
  status: z.enum(['active', 'done']),
  startedAt: z.number(),
  finishedAt: z.number().nullable().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      plannedExerciseId: z.string(),
      sets: z.array(setLogSchema),
    }),
  ),
  rest: z.object({ endsAt: z.number(), durationSec: z.number() }).nullable().optional(),
});

export const backupMeasurementSchema = z.object({
  date: isoDateSchema,
  waistCm: z.number().positive().nullable().optional(),
  photos: z.array(encodedBlobSchema),
});

export const adjustmentSchema = z.object({
  id: z.number().int().optional(),
  date: isoDateSchema,
  week: z.number().int(),
  ruleId: z.string(),
  kcalDelta: z.number(),
  stepsDelta: z.number(),
});

export const metaRowSchema = z.object({ key: z.string(), value: z.unknown() });

// ---------- Kompileringssjekk: skjemaene skal speile typene i src/types.ts ----------

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type SchemaTypeChecks = [
  Assert<MutuallyAssignable<z.output<typeof seedObjectSchema>, SeedData>>,
  Assert<MutuallyAssignable<z.output<typeof ingredientSeedSchema>, SeedIngredient>>,
  Assert<MutuallyAssignable<z.output<typeof mealSeedSchema>, SeedMeal>>,
  Assert<MutuallyAssignable<z.output<typeof exerciseSeedSchema>, SeedExercise>>,
  Assert<MutuallyAssignable<z.output<typeof sessionSeedSchema>, SeedSession>>,
  Assert<MutuallyAssignable<z.output<typeof settingsRowSchema>, AppSettings>>,
  Assert<MutuallyAssignable<z.output<typeof dayLogSchema>, DayLog>>,
  Assert<MutuallyAssignable<z.output<typeof workoutLogSchema>, WorkoutLog>>,
  Assert<
    MutuallyAssignable<
      Omit<z.output<typeof backupMeasurementSchema>, 'photos'>,
      Omit<Measurement, 'photos'>
    >
  >,
];

/** Validerer seed-data og gir en lesbar feilmelding. */
export function parseSeed(raw: unknown): SeedData {
  const result = seedFileSchema.safeParse(raw);
  if (!result.success) {
    throw new SeedValidationError(z.prettifyError(result.error));
  }
  return result.data;
}

export class SeedValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedValidationError';
  }
}
