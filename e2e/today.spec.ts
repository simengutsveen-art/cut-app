import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('registrer vekt 80,2 og skritt 9 500 → verdiene vises igjen etter omlasting', async ({
  page,
}) => {
  await startApp(page);
  const weight = page.getByRole('textbox', { name: 'Morgenvekt' });
  const steps = page.getByRole('textbox', { name: 'Skritt' });
  await weight.fill('80,2');
  await weight.press('Enter');
  await steps.fill('9 500');
  await steps.press('Enter');
  await expect(steps).toHaveValue('9 500');

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Morgenvekt' })).toHaveValue('80,2');
  await expect(page.getByRole('textbox', { name: 'Skritt' })).toHaveValue('9 500');
});

test('core-rutine og smerte med trafikklys', async ({ page }) => {
  await startApp(page);
  await page.getByRole('checkbox', { name: /Core-rutinen er gjort/ }).check();
  await page.getByRole('button', { name: 'Smerte 6 (rød)' }).click();
  await expect(page.getByRole('alert', { name: 'Ryggvarsel' })).toBeVisible();
  await expect(page.getByText('116 117')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Core-rutinen er gjort/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Smerte 6 (rød)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
