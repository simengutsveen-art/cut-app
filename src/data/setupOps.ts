import type { CutDB } from '../db';
import { sessionWithExercises, settingsFromAnswers, type SetupAnswers } from '../lib/setup';
import type { SeedData } from '../types';
import { saveEntity } from './editOps';

/**
 * Lagrer oppsettet: innstillinger og øvelsene i øktene. Økter som er i ukeplanen,
 * får ukedagen sin fra den. Det som er logget, røres ikke.
 */
export async function saveSetup(
  db: CutDB,
  seed: SeedData,
  answers: SetupAnswers,
  exercisesBySession: Record<string, string[]>,
): Promise<void> {
  await db.transaction('rw', db.settings, db.sessions, db.exercises, async () => {
    const settings = await db.settings.get('app');
    if (!settings) return;
    await db.settings.put(settingsFromAnswers(settings, answers, seed.settings.kcalTarget));

    const exercises = await db.exercises.toArray();
    const loadType = new Map(exercises.map((e) => [e.id, e.loadType]));
    for (const session of await db.sessions.toArray()) {
      const ids = exercisesBySession[session.id];
      const firstDay = Object.entries(answers.schedule).find(([, id]) => id === session.id)?.[0];
      const next = {
        ...(ids ? sessionWithExercises(session, ids, (id) => loadType.get(id) ?? '') : session),
        weekday: firstDay ? Number(firstDay) : session.weekday,
      };
      if (JSON.stringify(next) !== JSON.stringify(session)) await saveEntity(db, 'sessions', next);
    }
  });
}

/** «Bruk standardplanen»: hopper over oppsettet og beholder planen fra seed-fila. */
export async function skipSetup(db: CutDB): Promise<void> {
  await db.settings.update('app', { onboarded: true });
}
