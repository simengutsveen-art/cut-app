import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Lazy } from './components/Lazy';
import { FoodScreen } from './screens/food/FoodScreen';
import { SetupScreen } from './screens/setup/SetupScreen';
import { LogShortcutScreen } from './screens/today/LogShortcutScreen';
import { TodayScreen } from './screens/today/TodayScreen';
import { TrainingScreen } from './screens/training/TrainingScreen';
import { AppDataProvider } from './state/AppDataProvider';

// Grafer (Recharts) og redigering lastes først når de trengs, så appen starter raskere.
const ProgressSection = lazy(() =>
  import('./screens/progress/ProgressSection').then((m) => ({ default: m.ProgressSection })),
);
const MoreScreen = lazy(() =>
  import('./screens/more/MoreScreen').then((m) => ({ default: m.MoreScreen })),
);

const router = createHashRouter([
  // Oppsettet for en ny bruker vises uten fanelinje.
  { path: '/oppsett', element: <SetupScreen /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/logg', element: <LogShortcutScreen /> },
      { path: '/trening/*', element: <TrainingScreen /> },
      { path: '/mat/*', element: <FoodScreen /> },
      {
        path: '/fremgang/*',
        element: (
          <Lazy>
            <ProgressSection />
          </Lazy>
        ),
      },
      {
        path: '/mer/*',
        element: (
          <Lazy>
            <MoreScreen />
          </Lazy>
        ),
      },
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
