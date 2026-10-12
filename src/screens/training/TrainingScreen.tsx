import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Lazy } from '../../components/Lazy';
import { TrainingOverview } from './TrainingOverview';
import { WorkoutScreen } from './WorkoutScreen';

// Historikken har grafer og lastes først når den åpnes.
const ExerciseHistoryScreen = lazy(() =>
  import('./ExerciseHistoryScreen').then((m) => ({ default: m.ExerciseHistoryScreen })),
);

export function TrainingScreen() {
  return (
    <Routes>
      <Route index element={<TrainingOverview />} />
      <Route path="okt/:logId" element={<WorkoutScreen />} />
      <Route
        path="ovelse/:exerciseId"
        element={
          <Lazy>
            <ExerciseHistoryScreen />
          </Lazy>
        }
      />
      <Route path="*" element={<TrainingOverview />} />
    </Routes>
  );
}
