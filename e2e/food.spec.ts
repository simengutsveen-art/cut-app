import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('bytt lunsj til L3 → dagens planlagte kcal oppdateres', async ({ page }) => {
  await startApp(page);
  await page
    .getByRole('navigation', { name: 'Hovedmeny' })
    .getByRole('link', { name: 'Mat' })
    .click();
  const planned = page.getByTestId('day-planned');
  await expect(planned).toContainText('2 347 kcal');

  await page.getByRole('button', { name: /^Lunsj: Kylling-risbowl/ }).click();
  await page
    .getByRole('dialog', { name: 'Velg lunsj' })
    .getByRole('button', { name: /L3 Kremet kyllingpasta/ })
    .click();

  await expect(planned).toContainText('2 353 kcal');
  await expect(page.getByRole('button', { name: /^Lunsj: Kremet kyllingpasta/ })).toBeVisible();

  // Valget overlever omlasting.
  await page.reload();
  await expect(page.getByTestId('day-planned')).toContainText('2 353 kcal');
});

test('kryss av måltider → ringen viser spist hittil', async ({ page }) => {
  await startApp(page);
  await page.goto('./#/mat');
  const kcal = page.getByRole('meter', { name: 'Kcal' });
  await expect(kcal).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('2 400 kcal igjen')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Frokost spist' }).check();
  await page.getByRole('checkbox', { name: 'Lunsj spist' }).check();
  await expect(kcal).toHaveAttribute('aria-valuenow', '1307');
  await expect(page.getByText('1 093 kcal igjen')).toBeVisible();

  // Bytte av et avkrysset måltid teller det nye måltidet.
  await page.getByRole('button', { name: /^Lunsj: Kylling-risbowl/ }).click();
  await page
    .getByRole('dialog', { name: 'Velg lunsj' })
    .getByRole('button', { name: /L3 Kremet kyllingpasta/ })
    .click();
  await expect(kcal).toHaveAttribute('aria-valuenow', '1313');

  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Lunsj spist' })).toBeChecked();
  await expect(page.getByRole('meter', { name: 'Kcal' })).toHaveAttribute('aria-valuenow', '1313');

  await page.getByRole('checkbox', { name: 'Frokost spist' }).uncheck();
  await expect(page.getByRole('meter', { name: 'Kcal' })).toHaveAttribute('aria-valuenow', '649');
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
  await dialog.getByLabel('Karbo (g)').fill('18');
  await dialog.getByLabel('Fett (g)').fill('7,5');
  await dialog.getByRole('button', { name: 'Legg til' }).click();
  // Fleksipotten regnes som spist med en gang.
  await expect(page.getByRole('meter', { name: 'Kcal' })).toHaveAttribute('aria-valuenow', '200');
  await expect(page.getByTestId('day-planned')).toContainText('2 547 kcal');
  await expect(page.getByTestId('day-carbs')).toHaveText('18 g');
  await expect(page.getByTestId('day-fat')).toHaveText('7,5 g');
});
