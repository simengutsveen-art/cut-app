import { createContext, useContext } from 'react';
import type {
  AppSettings,
  Exercise,
  Ingredient,
  Meal,
  PlanContent,
  SeedData,
  Session,
} from '../types';

export interface AppData {
  settings: AppSettings;
  plan: PlanContent;
  ingredients: Ingredient[];
  meals: Meal[];
  exercises: Exercise[];
  sessions: Session[];
  ingredientsById: Map<string, Ingredient>;
  mealsById: Map<string, Meal>;
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
