import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';

/** Datoer med minst én fullført økt. */
export function useDoneWorkoutDates(): Set<string> {
  const logs = useLiveQuery(() => db.workoutLogs.where('status').equals('done').toArray(), []);
  return useMemo(() => new Set((logs ?? []).map((l) => l.date)), [logs]);
}
