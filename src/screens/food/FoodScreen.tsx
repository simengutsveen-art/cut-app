import type { ReactNode } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Page, PageHeader } from '../../components/ui';
import { cx } from '../../lib/cx';
import { FoodToday } from './FoodToday';
import { MealDetail } from './MealDetail';
import { MealLibrary } from './MealLibrary';
import { MealPrepScreen } from './MealPrepScreen';
import { ShoppingScreen } from './ShoppingScreen';

const tabs = [
  { to: '/mat', label: 'Dagens plan', end: true },
  { to: '/mat/bibliotek', label: 'Bibliotek', end: false },
  { to: '/mat/prep', label: 'Meal prep', end: false },
  { to: '/mat/handleliste', label: 'Handleliste', end: false },
];

function FoodLayout({ children }: { children: ReactNode }) {
  return (
    <Page>
      <PageHeader title="Mat" />
      <nav aria-label="Mat" className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cx(
                'flex min-h-11 items-center justify-center rounded-lg px-1 text-center text-[13px] leading-tight font-semibold',
                isActive ? 'bg-surface text-fg shadow-sm' : 'text-muted',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </Page>
  );
}

export function FoodScreen() {
  return (
    <Routes>
      <Route
        index
        element={
          <FoodLayout>
            <FoodToday />
          </FoodLayout>
        }
      />
      <Route
        path="bibliotek"
        element={
          <FoodLayout>
            <MealLibrary />
          </FoodLayout>
        }
      />
      <Route path="bibliotek/:mealId" element={<MealDetail />} />
      <Route
        path="prep"
        element={
          <FoodLayout>
            <MealPrepScreen />
          </FoodLayout>
        }
      />
      <Route
        path="handleliste"
        element={
          <FoodLayout>
            <ShoppingScreen />
          </FoodLayout>
        }
      />
      <Route
        path="*"
        element={
          <FoodLayout>
            <FoodToday />
          </FoodLayout>
        }
      />
    </Routes>
  );
}
