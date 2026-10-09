// Typer som speiler seed-data.json, pluss radene i IndexedDB.
// zod-skjemaene i src/data/schema.ts holdes i synk med disse (sjekkes ved typecheck).

export type Slot = 'frokost' | 'lunsj' | 'middag' | 'kveldsmat';
export const SLOTS: readonly Slot[] = ['frokost', 'lunsj', 'middag', 'kveldsmat'];

/** ISO-ukedag: 1 = mandag … 7 = søndag */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type WeekdayKey = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export const WEEKDAY_KEYS: readonly WeekdayKey[] = ['1', '2', '3', '4', '5', '6', '7'];

export type NumRange = [number, number];

// ---------- Seed ----------

export interface Person {
  name: string;
  age: number;
  heightCm: number;
  sex: string;
}

export interface StepsRule {
  weeks: NumRange;
  daily: number;
  wednesday: number;
}

export interface SeedSettings {
  startDate: string;
  weeks: number;
  person: Person;
  startWeightKg: number;
  startWaistCm: number;
  goalWeightRangeKg: NumRange;
  goalWaistRangeCm: NumRange;
  kcalTarget: number;
  kcalTolerance: number;
  kcalFloor: number;
  maintenanceEstimateKcal: number;
  bmrKcal: number;
  proteinTargetG: NumRange;
  fatTargetG: NumRange;
  carbTargetG: NumRange;
  fiberMinG: number;
  waterL: NumRange;
  plannedLossKgPerWeek: number;
  steps: StepsRule[];
  dislikedFoods: string[];
  stores: string[];
  /** ISO-ukedag → økt-ID eller 'hvile' */
  weeklySchedule: Record<WeekdayKey, string>;
  mealPrepDays: number[];
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Pack {
  label: string;
  grams: number;
  priceNok: number;
  store: string;
  priceSource: string;
}

export interface IngredientUnit {
  name: string;
  grams: number;
}

export interface SeedIngredient {
  id: string;
  name: string;
  per100g: Macros;
  pack: Pack;
  category: string;
  dislikeTags: string[];
  unit?: IngredientUnit;
  isPantryStaple: boolean;
}

export interface MealIngredient {
  ingredientId: string;
  grams: number;
}

export interface SeedMeal {
  id: string;
  slot: Slot;
  name: string;
  description: string;
  isMealPrep: boolean;
  batchPortions: number;
  ingredientsPerPortion: MealIngredient[];
  servingNote: string | null;
  steps: string[];
  tags: string[];
  active: boolean;
}

export interface SeedExercise {
  id: string;
  name: string;
  imageSourceId: string | null;
  loadType: string;
  primaryMuscles: string[];
  cues: string[];
  alternative: string | null;
  perSide: boolean;
  backNote: string | null;
}

export type RepUnit = 'reps' | 'meter';

export interface PrescribedExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  rir: string;
  restSec: number;
  startWeightNote: string;
  unit: RepUnit;
  note?: string;
  activeFromWeek?: number;
  activeUntilWeek?: number;
}

export interface SeedSession {
  id: string;
  name: string;
  weekday: number;
  exercises: PrescribedExercise[];
}

export interface Phase {
  name: string;
  weeks: NumRange;
  setsDelta?: number;
  setsFactor?: number;
  rirOverride?: string;
  note?: string;
}

export interface Progression {
  rule: string;
  description: string;
  incrementsKg: Record<string, number>;
  isolationRepsFirst?: boolean;
  stallRule: string;
}

export interface CoreItem {
  name: string;
  imageSourceId: string | null;
  dose: string;
  cue: string;
}

export type PainLevel = 'grønn' | 'gul' | 'rød';

export interface PainScaleEntry {
  level: PainLevel;
  range: NumRange;
  action: string;
}

export interface CoreRoutine {
  when: string;
  items: CoreItem[];
  progression: string[];
  painScale: PainScaleEntry[];
  redFlags: string[];
  emergency: string;
}

export interface AdjustmentRule {
  id: string;
  when: string;
  condition: string;
  action: string;
  kcalDelta: number;
  stepsDelta?: number;
  stepsFirst?: boolean;
}

export interface AdjustmentRules {
  startFromWeek: number;
  windowWeeks: number;
  rules: AdjustmentRule[];
  notes: string[];
}

export type GuideValue = string | string[] | Record<string, string>;
export type Guides = Record<string, GuideValue>;

export interface PrepSlots {
  lunsj: string;
  middag: string;
}

export interface MealPrepRotationEntry {
  weeks: number[];
  sunday: PrepSlots;
  wednesday: PrepSlots;
}

export interface ImageSource {
  name: string;
  license: string;
  repo: string;
  pathPattern: string;
}

export interface SeedData {
  schemaVersion: number;
  seedVersion: string;
  generatedFrom?: string;
  disclaimer: string;
  settings: SeedSettings;
  ingredients: SeedIngredient[];
  meals: SeedMeal[];
  standardDay: Record<Slot, string>;
  mealPrepRotation: MealPrepRotationEntry[];
  exercises: SeedExercise[];
  sessions: SeedSession[];
  phases: Phase[];
  progression: Progression;
  coreRoutine: CoreRoutine;
  adjustmentRules: AdjustmentRules;
  guides: Guides;
  imageSource: ImageSource;
}

// ---------- Database ----------

export type EntitySource = 'seed' | 'user';

export interface Editable {
  source: EntitySource;
  userModified: boolean;
  active: boolean;
}

export type Ingredient = SeedIngredient & Editable;
export type Meal = SeedMeal & Editable;
export type Exercise = SeedExercise & Editable & { customImages?: Blob[] };
export type Session = SeedSession & Editable;

export type EntityTableName = 'ingredients' | 'meals' | 'exercises' | 'sessions';

export type ThemePref = 'dark' | 'light' | 'system';

export type WeekMealChoice = Partial<Record<'frokost' | 'kveldsmat', string>>;

export interface AppSettings extends SeedSettings {
  id: 'app';
  /** Gjeldende kcal-mål etter godtatte justeringer */
  currentKcalTarget: number;
  /** Ekstra skritt per dag fra godtatte justeringer */
  stepsBonus: number;
  /** Simens standardmåltider (starter som standardDay i seed) */
  standardMeals: Record<Slot, string>;
  /** Valgt frokost/kveldsmat per planuke (nøkkel = ukenummer) */
  weekMealChoices: Record<string, WeekMealChoice>;
  theme: ThemePref;
  userModified: boolean;
}

export interface ExtraFood {
  id: string;
  name: string;
  kcal: number;
  protein: number;
}

export interface DayLog {
  /** yyyy-MM-dd */
  date: string;
  weightKg?: number | null;
  steps?: number | null;
  meals: Partial<Record<Slot, string>>;
  extras: ExtraFood[];
  coreDone: boolean;
  /** Smerte 0–10 */
  pain?: number | null;
  note?: string;
  /** Meal prep laget denne dagen */
  prepDone?: boolean;
}

export interface SetLog {
  kg: number;
  reps: number;
  rir?: number | null;
  done: boolean;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  /** Øvelsen som stod i økta (forskjellig fra exerciseId hvis byttet) */
  plannedExerciseId: string;
  sets: SetLog[];
}

export type WorkoutStatus = 'active' | 'done';

export interface RestTimerState {
  /** Tidsstempel (ms) da pausen er ferdig */
  endsAt: number;
  durationSec: number;
}

export interface WorkoutLog {
  id: string;
  date: string;
  sessionId: string;
  week: number;
  status: WorkoutStatus;
  startedAt: number;
  finishedAt?: number | null;
  exercises: WorkoutExerciseLog[];
  rest?: RestTimerState | null;
}

export interface Measurement {
  date: string;
  waistCm?: number | null;
  photos: Blob[];
}

export interface Adjustment {
  id?: number;
  date: string;
  week: number;
  ruleId: string;
  kcalDelta: number;
  stepsDelta: number;
}

/** Plan-innhold som ikke redigeres i appen, men byttes ut ved «Oppdater plan». */
export interface PlanContent {
  disclaimer: string;
  generatedFrom?: string;
  standardDay: Record<Slot, string>;
  mealPrepRotation: MealPrepRotationEntry[];
  phases: Phase[];
  progression: Progression;
  coreRoutine: CoreRoutine;
  adjustmentRules: AdjustmentRules;
  guides: Guides;
  imageSource: ImageSource;
}

export interface MetaValues {
  schemaVersion: number;
  seedVersion: string;
  lastBackupAt: number | null;
  plan: PlanContent;
  /** Uker der Simen har trykket «Ikke nå» i ukessjekken */
  dismissedChecks: number[];
  /** Ingrediens-ID-er som er krysset av som «har hjemme», per uke */
  shoppingHave: Record<string, string[]>;
}

export type MetaKey = keyof MetaValues;

export interface MetaRow<K extends MetaKey = MetaKey> {
  key: K;
  value: MetaValues[K];
}
