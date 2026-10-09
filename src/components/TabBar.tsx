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

export function TabBar() {
  return (
    <nav
      aria-label="Hovedmeny"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              <Icon size={24} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
