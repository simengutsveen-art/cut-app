import { Route, Routes } from 'react-router-dom';
import { ExerciseHistoryScreen } from './ExerciseHistoryScreen';
import { TrainingOverview } from './TrainingOverview';
import { WorkoutScreen } from './WorkoutScreen';

export function TrainingScreen() {
  return (
    <Routes>
      <Route index element={<TrainingOverview />} />
      <Route path="okt/:logId" element={<WorkoutScreen />} />
      <Route path="ovelse/:exerciseId" element={<ExerciseHistoryScreen />} />
      <Route path="*" element={<TrainingOverview />} />
    </Routes>
  );
}
