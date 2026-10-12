import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('kalender: hvor langt jeg har kommet, fasene og detaljer for en dag', async ({ page }) => {
  await startApp(page, new Date('2026-10-14T08:00:00+02:00'));

  const hero = page.getByRole('region', { name: 'Fremdrift i planen' });
  await expect(hero).toContainText('Dag 1');
  await expect(hero).toContainText('83 dager igjen');
  await expect(hero).toContainText('Ferdig 05.01.2027');
  await hero.getByRole('link').click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kalender');
  await expect(page.getByText('14.10.2026 – 05.01.2027')).toBeVisible();
  await expect(page.getByText('Lett uke (deload)')).toBeVisible();

  await page.getByRole('button', { name: /^Onsdag 14\. oktober, i dag/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Onsdag 14. oktober' });
  await expect(sheet).toContainText('Uke 1 · Oppstart');
  await expect(sheet).toContainText('Hviledag: lang tur');
  await sheet.getByRole('button', { name: 'Lukk' }).click();
  await expect(sheet).toHaveCount(0);

  // Dager utenfor planen kan ikke velges.
  await expect(page.getByRole('button', { name: /^Mandag 12\. oktober/ })).toBeDisabled();
});

test('øvelsesanimasjon: start og slutt veksler, og kan pauses', async ({ page }) => {
  await startApp(page);
  await page.getByRole('button', { name: 'Start Push' }).click();
  const bench = page.getByRole('article', { name: 'Benkpress' });
  await expect(bench.getByRole('img', { name: 'Benkpress – start' })).toBeVisible();
  await expect(bench.getByRole('img', { name: 'Benkpress – slutt' })).toBeAttached();

  await bench.getByRole('button', { name: 'Pause animasjon' }).click();
  await expect(bench.getByRole('button', { name: 'Spill animasjon' })).toBeVisible();
  const toggle = bench.getByRole('button', { name: /^Vis (slutt|start)$/ });
  if ((await toggle.textContent()) === 'Vis slutt') await toggle.click();
  await expect(bench.getByText('Slutt', { exact: true })).toBeVisible();
  await expect(bench.getByRole('img', { name: 'Benkpress – slutt' })).toHaveCSS('opacity', '1');
});
