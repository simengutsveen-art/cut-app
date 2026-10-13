import { useState } from 'react';
import { Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useAppData } from '../state/appData';
import { TabBar } from './TabBar';
import { UpdatePrompt } from './UpdatePrompt';
import { WorkoutDock } from './WorkoutDock';

export function AppShell() {
  const { settings } = useAppData();
  const { pathname } = useLocation();
  const [dockVisible, setDockVisible] = useState(false);
  // Ny installasjon: oppsettet først (men en backup kan hentes inn i stedet).
  if (settings.onboarded === false && pathname !== '/mer/backup') {
    return <Navigate to="/oppsett" replace />;
  }
  return (
    <div className="safe-top min-h-dvh">
      <div className="app-backdrop" aria-hidden="true" />
      <main className={dockVisible ? 'pb-tabbar-timer relative z-[1]' : 'pb-tabbar relative z-[1]'}>
        <Outlet />
      </main>
      <WorkoutDock onVisibleChange={setDockVisible} />
      <TabBar />
      <UpdatePrompt />
      <ScrollRestoration />
    </div>
  );
}
