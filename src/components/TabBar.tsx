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

/** Flytende fanelinje i glass, over innholdet. */
export function TabBar() {
  return (
    <nav
      aria-label="Hovedmeny"
      className="tabbar-position pointer-events-none fixed inset-x-0 z-40 px-3"
    >
      <ul className="glass pointer-events-auto mx-auto flex h-[var(--tabbar-h)] max-w-md items-stretch rounded-[26px] px-1.5">
        {tabs.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'pressable group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[20px] text-[10.5px] font-semibold tracking-[0.01em]',
                  isActive ? 'text-accent' : 'text-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute inset-x-1.5 inset-y-1.5 rounded-[18px] transition-opacity duration-300',
                      isActive ? 'bg-accent/12 opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon size={23} strokeWidth={isActive ? 2.2 : 1.8} className="relative" />
                  <span className="relative">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
