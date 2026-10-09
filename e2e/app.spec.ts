import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('første oppstart seeder, og «I dag» viser riktig uke', async ({ page }) => {
  await startApp(page, new Date('2026-10-14T09:00:00+02:00'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uke 1 av 12 · Oppstart');
  await expect(page.getByText('onsdag 14. oktober')).toBeVisible();
});

test('viser «Starter om 1 dag» dagen før start', async ({ page }) => {
  await startApp(page, new Date('2026-10-11T09:00:00+02:00'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Starter om 1 dag');
});

test('fanelinja navigerer mellom de fem fanene', async ({ page }) => {
  await startApp(page);
  const nav = page.getByRole('navigation', { name: 'Hovedmeny' });
  for (const [tab, heading] of [
    ['Trening', 'Trening'],
    ['Mat', 'Mat'],
    ['Fremgang', 'Fremgang'],
    ['Mer', 'Mer'],
  ] as const) {
    await nav.getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
  }
  await nav.getByRole('link', { name: 'I dag' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Uke 1 av 12');
});
