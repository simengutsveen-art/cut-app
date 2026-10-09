import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('bytt lunsj til L3 → dagens kcal oppdateres', async ({ page }) => {
  await startApp(page);
  await page
    .getByRole('navigation', { name: 'Hovedmeny' })
    .getByRole('link', { name: 'Mat' })
    .click();
  const kcal = page.getByRole('meter', { name: 'Kcal' });
  await expect(kcal).toHaveAttribute('aria-valuenow', '2347');

  await page.getByRole('button', { name: /^Lunsj: Kylling-risbowl/ }).click();
  await page
    .getByRole('dialog', { name: 'Velg lunsj' })
    .getByRole('button', { name: /L3 Kremet kyllingpasta/ })
    .click();

  await expect(kcal).toHaveAttribute('aria-valuenow', '2353');
  await expect(page.getByRole('button', { name: /^Lunsj: Kremet kyllingpasta/ })).toBeVisible();

  // Valget overlever omlasting.
  await page.reload();
  await expect(page.getByRole('meter', { name: 'Kcal' })).toHaveAttribute('aria-valuenow', '2353');
});

test('handleliste for uke 1 og fleksipott', async ({ page }) => {
  await startApp(page);
  await page.goto('./#/mat/handleliste');
  await expect(page.getByText('2 × Kyllingfilet First Price 1,4 kg')).toBeVisible();
  await expect(page.getByText('Basisvare · forbruk 210 g')).toBeVisible();
  const total = page.getByTestId('shopping-total');
  const before = await total.textContent();
  await page.getByRole('checkbox', { name: 'Kyllingfilet: har hjemme' }).check();
  await expect(total).not.toHaveText(before ?? '');

  await page.goto('./#/mat');
  await page.getByRole('button', { name: 'Legg til' }).click();
  const dialog = page.getByRole('dialog', { name: 'Legg til i fleksipotten' });
  await dialog.getByLabel('Navn').fill('Proteinbar');
  await dialog.getByLabel('Kcal').fill('200');
  await dialog.getByLabel('Protein (g)').fill('20');
  await dialog.getByRole('button', { name: 'Legg til' }).click();
  await expect(page.getByRole('meter', { name: 'Kcal' })).toHaveAttribute('aria-valuenow', '2547');
});
