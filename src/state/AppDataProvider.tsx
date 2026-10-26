import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, type ReactNode } from 'react';
import { getBundledSeed } from '../data/seed';
import { db } from '../db';
import { scaleMeal } from '../lib/nutrition';
import { phasesForWeeks } from '../lib/phases';
import { AppDataContext, type AppData } from './appData';

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'nb');
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const meta = useLiveQuery(() => db.meta.toArray(), []);
  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []);
  const meals = useLiveQuery(() => db.meals.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);

  const value = useMemo<AppData | null>(() => {
    if (!settings || !meta || !ingredients || !meals || !exercises || !sessions) return null;
    const metaMap = new Map(meta.map((m) => [m.key, m.value]));
    const storedPlan = metaMap.get('plan') as AppData['plan'] | undefined;
    if (!storedPlan) return null;
    // Fasene følger planens lengde (seed-fila har 12 uker).
    const plan = { ...storedPlan, phases: phasesForWeeks(storedPlan.phases, settings.weeks) };
    const sortedIngredients = [...ingredients].sort(byName);
    const sortedRawMeals = [...meals].sort((a, b) =>
      a.id.localeCompare(b.id, 'nb', { numeric: true }),
    );
    const portionScale = settings.portionScale ?? 1;
    const sortedMeals = sortedRawMeals.map((m) => scaleMeal(m, portionScale));
    const sortedExercises = [...exercises].sort(byName);
    const sortedSessions = [...sessions].sort(
      (a, b) => a.weekday - b.weekday || a.id.localeCompare(b.id),
    );
    return {
      settings,
      plan,
      phaseTemplate: storedPlan.phases,
      ingredients: sortedIngredients,
      meals: sortedMeals,
      rawMeals: sortedRawMeals,
      exercises: sortedExercises,
      sessions: sortedSessions,
      ingredientsById: new Map(ingredients.map((i) => [i.id, i])),
      mealsById: new Map(sortedMeals.map((m) => [m.id, m])),
      rawMealsById: new Map(sortedRawMeals.map((m) => [m.id, m])),
      exercisesById: new Map(exercises.map((e) => [e.id, e])),
      sessionsById: new Map(sessions.map((s) => [s.id, s])),
      seed: getBundledSeed(),
      installedSeedVersion: (metaMap.get('seedVersion') as string | undefined) ?? '',
      lastBackupAt: (metaMap.get('lastBackupAt') as number | null | undefined) ?? null,
    };
  }, [settings, meta, ingredients, meals, exercises, sessions]);

  const theme = settings?.theme ?? 'dark';
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia?.('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : theme;
      root.dataset.theme = resolved;
      const color = getComputedStyle(root).getPropertyValue('--c-bg').trim();
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', color || (resolved === 'light' ? '#f2f2f4' : '#111113'));
    };
    apply();
    if (theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
        Laster …
      </div>
    );
  }
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
