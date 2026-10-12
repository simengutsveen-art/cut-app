import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('første oppstart seeder, og «I dag» viser riktig uke', async ({ page }) => {
  await startApp(page, new Date('2026-10-14T09:00:00+02:00'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uke 1 av 12 · Oppstart');
  await expect(page.getByText('onsdag 14. oktober', { exact: true })).toBeVisible();
});

test('planen venter på «Start nå», og uke 1 starter den dagen', async ({ page }) => {
  await startApp(page, new Date('2026-10-09T09:00:00+02:00'), { start: false });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Klar til start');
  await expect(page.getByText(/Starter om/)).toHaveCount(0);
  const card = page.getByRole('region', { name: 'Start planen' });
  await expect(card).toContainText('til og med 31.12.2026');
  // «Er du sikker?»: «Ikke ennå» lar planen vente.
  await card.getByRole('button', { name: 'Start nå' }).click();
  const confirm = page.getByRole('dialog', { name: 'Starte planen i dag?' });
  await expect(confirm).toContainText('til og med torsdag 31. desember 2026');
  await confirm.getByRole('button', { name: 'Ikke ennå' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Klar til start');

  await card.getByRole('button', { name: 'Start nå' }).click();
  await confirm.getByRole('button', { name: 'Ja, start planen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uke 1 av 12 · Oppstart');
  await expect(card).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uke 1 av 12 · Oppstart');
  await page.goto('./#/mer/innstillinger');
  await expect(page.getByLabel('Startdato')).toHaveValue('2026-10-09');
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
