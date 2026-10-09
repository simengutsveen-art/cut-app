import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { FoodScreen } from './screens/food/FoodScreen';
import { MoreScreen } from './screens/more/MoreScreen';
import { ProgressScreen } from './screens/progress/ProgressScreen';
import { LogShortcutScreen } from './screens/today/LogShortcutScreen';
import { TodayScreen } from './screens/today/TodayScreen';
import { TrainingScreen } from './screens/training/TrainingScreen';
import { AppDataProvider } from './state/AppDataProvider';

const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/logg', element: <LogShortcutScreen /> },
      { path: '/trening/*', element: <TrainingScreen /> },
      { path: '/mat/*', element: <FoodScreen /> },
      { path: '/fremgang/*', element: <ProgressScreen /> },
      { path: '/mer/*', element: <MoreScreen /> },
      { path: '*', element: <TodayScreen /> },
    ],
  },
]);

export function App() {
  return (
    <AppDataProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AppDataProvider>
  );
}
