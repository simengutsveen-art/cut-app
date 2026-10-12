import { useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { TabBar } from './TabBar';
import { UpdatePrompt } from './UpdatePrompt';
import { WorkoutDock } from './WorkoutDock';

export function AppShell() {
  const [dockVisible, setDockVisible] = useState(false);
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
