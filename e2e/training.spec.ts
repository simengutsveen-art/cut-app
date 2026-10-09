import { expect, test } from '@playwright/test';
import { PLAN_START, startApp } from './helpers';

test('Push-økt: logg 3 sett, lukk siden midt i, åpne igjen og fullfør', async ({
  page,
  context,
}) => {
  await startApp(page, PLAN_START);
  await page
    .getByRole('navigation', { name: 'Hovedmeny' })
    .getByRole('link', { name: 'Trening' })
    .click();
  await page.getByRole('button', { name: 'Start Push' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push');

  const bench = page.getByRole('article', { name: 'Benkpress' });
  await expect(bench.getByText('3 × 5–8 · RIR 3')).toBeVisible();
  for (const n of [1, 2, 3]) {
    await page.getByRole('button', { name: `Sett ${n} ferdig` }).click();
  }
  await expect(page.getByText('3 av 15 sett ferdig')).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Pausetimer' })).toBeVisible();

  // Lukk siden midt i økta og åpne appen på nytt.
  await page.close();
  const again = await context.newPage();
  await again.clock.install({ time: new Date(PLAN_START.getTime() + 5 * 60_000) });
  await again.goto('./');
  await again.getByRole('link', { name: /Push pågår/ }).click();
  await expect(again.getByText('3 av 15 sett ferdig')).toBeVisible();
  await expect(again.getByRole('article', { name: 'Benkpress' }).getByText('3/3')).toBeVisible();

  await again.getByRole('button', { name: 'Fullfør økt' }).click();
  await expect(again.getByRole('heading', { level: 1 })).toHaveText('Trening');
  await expect(again.getByText('Fullført i dag')).toBeVisible();
  await expect(again.getByRole('link', { name: /Benkpress/ })).toBeVisible();
});
