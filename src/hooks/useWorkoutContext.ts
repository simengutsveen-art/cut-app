import { useMemo } from 'react';
import type { WorkoutContext } from '../data/workouts';
import { useAppData } from '../state/appData';

export function useWorkoutContext(): WorkoutContext {
  const { settings, plan, exercisesById } = useAppData();
  return useMemo(
    () => ({
      settings: { startDate: settings.startDate, weeks: settings.weeks },
      phases: plan.phases,
      progression: plan.progression,
      exercisesById,
    }),
    [settings.startDate, settings.weeks, plan.phases, plan.progression, exercisesById],
  );
}
