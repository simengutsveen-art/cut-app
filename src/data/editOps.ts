import type { CutDB } from '../db';
import type {
  EntityTableName,
  Exercise,
  Ingredient,
  Meal,
  PlanContent,
  Session,
  Slot,
} from '../types';

export interface Usage {
  /** Brukes i logger (dagslogger eller økter) – kan ikke slettes */
  inLogs: number;
  /** Brukes av andre elementer (måltider, økter, ukeplan …) */
  references: string[];
}

export async function usageOf(
  db: CutDB,
  table: EntityTableName,
  id: string,
  plan?: PlanContent,
): Promise<Usage> {
  const references: string[] = [];
  let inLogs = 0;
  const settings = await db.settings.get('app');

  if (table === 'ingredients') {
    const meals = await db.meals.toArray();
    for (const m of meals) {
      if (m.ingredientsPerPortion.some((i) => i.ingredientId === id))
        references.push(`måltid ${m.id} ${m.name}`);
    }
  }

  if (table === 'meals') {
    inLogs = await db.dayLogs.filter((l) => Object.values(l.meals).includes(id)).count();
    if (settings && Object.values(settings.standardMeals).includes(id))
      references.push('standardmåltider');
    if (
      settings &&
      Object.values(settings.weekMealChoices).some((c) => Object.values(c).includes(id))
    ) {
      references.push('ukevalg i handlelista');
    }
    if (
      plan?.mealPrepRotation.some((r) =>
        [r.sunday.lunsj, r.sunday.middag, r.wednesday.lunsj, r.wednesday.middag].includes(id),
      )
    ) {
      references.push('meal prep-rotasjonen');
    }
  }

  if (table === 'exercises') {
    inLogs = await db.workoutLogs
      .filter((l) => l.exercises.some((e) => e.exerciseId === id || e.plannedExerciseId === id))
      .count();
    const sessions = await db.sessions.toArray();
    for (const s of sessions) {
      if (s.exercises.some((e) => e.exerciseId === id)) references.push(`økt ${s.name}`);
    }
    const exercises = await db.exercises.toArray();
    for (const e of exercises)
      if (e.alternative === id) references.push(`alternativ for ${e.name}`);
  }

  if (table === 'sessions') {
    inLogs = await db.workoutLogs.where('sessionId').equals(id).count();
    if (settings && Object.values(settings.weeklySchedule).includes(id))
      references.push('ukeplanen');
  }

  return { inLogs, references };
}

/** Bare egne elementer som ikke brukes noe sted kan slettes. Seed-elementer deaktiveres. */
export function canDelete(source: 'seed' | 'user', usage: Usage): boolean {
  return source === 'user' && usage.inLogs === 0 && usage.references.length === 0;
}

type EntityMap = {
  ingredients: Ingredient;
  meals: Meal;
  exercises: Exercise;
  sessions: Session;
};

/** Lagrer et element. Endringer i seed-elementer merkes som userModified. */
export async function saveEntity<T extends EntityTableName>(
  db: CutDB,
  table: T,
  entity: EntityMap[T],
): Promise<void> {
  const next = { ...entity, userModified: entity.source === 'seed' ? true : entity.userModified };
  await (db[table] as unknown as { put: (e: EntityMap[T]) => Promise<unknown> }).put(next);
}

export async function setActive(
  db: CutDB,
  table: EntityTableName,
  id: string,
  active: boolean,
): Promise<void> {
  await db.transaction('rw', db[table], async () => {
    const existing = await db[table].get(id);
    if (!existing) return;
    await (db[table] as unknown as { put: (e: unknown) => Promise<unknown> }).put({
      ...existing,
      active,
      userModified: existing.source === 'seed' ? true : existing.userModified,
    });
  });
}

export async function deleteEntity(
  db: CutDB,
  table: EntityTableName,
  id: string,
  plan?: PlanContent,
): Promise<boolean> {
  const existing = await db[table].get(id);
  if (!existing) return false;
  const usage = await usageOf(db, table, id, plan);
  if (!canDelete(existing.source, usage)) return false;
  await db[table].delete(id);
  return true;
}

/** Lager en ledig ID av typen «L5» for et nytt måltid. */
export function nextMealId(slot: Slot, existingIds: string[]): string {
  const prefix = { frokost: 'F', lunsj: 'L', middag: 'D', kveldsmat: 'K' }[slot];
  let n = 1;
  const taken = new Set(existingIds);
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Lager en ledig ID fra et navn: «Bulgarsk utfall» → «bulgarsk_utfall». */
export function slugId(name: string, existingIds: string[]): string {
  const base =
    name
      .toLocaleLowerCase('nb')
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'element';
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
