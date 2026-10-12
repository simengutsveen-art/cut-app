import { Route, Routes } from 'react-router-dom';
import { CalendarScreen } from './CalendarScreen';
import { ProgressScreen } from './ProgressScreen';

export function ProgressSection() {
  return (
    <Routes>
      <Route index element={<ProgressScreen />} />
      <Route path="kalender" element={<CalendarScreen />} />
      <Route path="*" element={<ProgressScreen />} />
    </Routes>
  );
}
