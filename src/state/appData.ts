import { createContext, useContext } from 'react';
import type {
  AppSettings,
  Exercise,
  Ingredient,
  Meal,
  Phase,
  PlanContent,
  SeedData,
  Session,
} from '../types';

export interface AppData {
  settings: AppSettings;
  /** Planen. Fasene er tilpasset planens lengde (settings.weeks). */
  plan: PlanContent;
  /** Fasene slik de står i planen (malen for andre lengder) */
  phaseTemplate: Phase[];
  ingredients: Ingredient[];
  /** Måltidene med porsjoner tilpasset kalorimålet (settings.portionScale) */
  meals: Meal[];
  /** Måltidene slik de er lagret (brukes når de redigeres) */
  rawMeals: Meal[];
  exercises: Exercise[];
  sessions: Session[];
  ingredientsById: Map<string, Ingredient>;
  mealsById: Map<string, Meal>;
  rawMealsById: Map<string, Meal>;
  exercisesById: Map<string, Exercise>;
  sessionsById: Map<string, Session>;
  /** seed-data.json bygget inn i appen */
  seed: SeedData;
  /** seedVersion lagret i databasen */
  installedSeedVersion: string;
  lastBackupAt: number | null;
}

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData må brukes inne i AppDataProvider');
  return value;
}
