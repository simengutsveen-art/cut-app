import { NavLink } from 'react-router-dom';
import { cx } from '../lib/cx';
import { IconChart, IconDumbbell, IconFood, IconMore, IconToday } from './icons';

const tabs = [
  { to: '/', label: 'I dag', Icon: IconToday, end: true },
  { to: '/trening', label: 'Trening', Icon: IconDumbbell, end: false },
  { to: '/mat', label: 'Mat', Icon: IconFood, end: false },
  { to: '/fremgang', label: 'Fremgang', Icon: IconChart, end: false },
  { to: '/mer', label: 'Mer', Icon: IconMore, end: false },
];

/** Fanelinje langs bunnen. Aktiv fane får aksentfarge. */
export function TabBar() {
  return (
    <nav
      aria-label="Hovedmeny"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--c-hairline)] bg-bg"
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-xl items-stretch">
        {tabs.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={isActive ? 2.1 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
