import { Outlet, ScrollRestoration } from 'react-router-dom';
import { TabBar } from './TabBar';
import { UpdatePrompt } from './UpdatePrompt';

export function AppShell() {
  return (
    <div className="safe-top min-h-dvh">
      <main className="pb-tabbar">
        <Outlet />
      </main>
      <TabBar />
      <UpdatePrompt />
      <ScrollRestoration />
    </div>
  );
}
