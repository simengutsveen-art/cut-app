import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('rediger Kyllingfilet til 110 kcal → L1 får ny kcal, og «Tilbakestill til standard» gir 643', async ({
  page,
}) => {
  await startApp(page);
  await page.goto('./#/mat/bibliotek/L1');
  await expect(page.getByText('643', { exact: true })).toBeVisible();

  await page.goto('./#/mer/data/ingredienser');
  await page.getByRole('link', { name: /^Kyllingfilet/ }).click();
  await page.getByRole('textbox', { name: 'Kcal', exact: true }).fill('110');
  await page.getByRole('button', { name: 'Lagre', exact: true }).click();
  await expect(page.getByText('Lagret.')).toBeVisible();
  await expect(page.getByText('Endret av deg')).toBeVisible();

  await page.goto('./#/mat/bibliotek/L1');
  await expect(page.getByText('652', { exact: true })).toBeVisible();

  await page.goto('./#/mer/data/ingredienser/kyllingfilet');
  await page.getByRole('button', { name: 'Tilbakestill til standard' }).click();
  await expect(page.getByText('Tilbakestilt til standard.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Kcal', exact: true })).toHaveValue('105');

  await page.goto('./#/mat/bibliotek/L1');
  await expect(page.getByText('643', { exact: true })).toBeVisible();
});

test('lag en ny øvelse og legg den i økt 4', async ({ page }) => {
  await startApp(page);
  await page.goto('./#/mer/data/ovelser/ny');
  await page.getByLabel('Navn', { exact: true }).fill('Kabelcurl');
  await page.getByLabel('Lasttype').selectOption('kabel');
  await page.getByLabel('Muskler (kommaseparert)').fill('biceps');
  await page.getByRole('button', { name: 'Lagre', exact: true }).click();
  await expect(page).toHaveURL(/ovelser\/kabelcurl$/);
  await expect(page.getByText('Lagret.')).toBeVisible();

  await page.goto('./#/mer/data/okter/okt4');
  await page.getByRole('button', { name: 'Legg til øvelse' }).click();
  await page.getByLabel('Øvelse 8', { exact: true }).selectOption({ label: 'Kabelcurl' });
  await page.getByRole('button', { name: 'Lagre', exact: true }).click();
  await expect(page.getByText('Lagret.')).toBeVisible();

  await page.goto('./#/trening');
  await page.getByRole('button', { name: 'Start økta Overkropp nå' }).click();
  await expect(page.getByRole('article', { name: 'Kabelcurl' })).toBeVisible();
});

test('eksporter → nullstill → importer → dataene er tilbake', async ({ page }) => {
  await startApp(page);
  const weight = page.getByRole('textbox', { name: 'Morgenvekt' });
  await weight.fill('80,2');
  await weight.press('Enter');
  await expect(weight).toHaveValue('80,2');
  await expect(page.getByRole('status').filter({ hasText: 'Lagret' })).toBeVisible();

  await page.goto('./#/mer/backup');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksporter alt' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^cut-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = test.info().outputPath('backup.json');
  await download.saveAs(file);
  await expect(page.getByText('Backup eksportert.')).toBeVisible();

  await page.goto('./#/mer/nullstill');
  await page.getByRole('button', { name: 'Nullstill app' }).click();
  await page.getByRole('button', { name: 'Ja, gå videre' }).click();
  await page.getByLabel('Skriv NULLSTILL for å bekrefte').fill('NULLSTILL');
  await page.getByRole('button', { name: 'Slett alt' }).click();
  await expect(page.getByRole('textbox', { name: 'Morgenvekt' })).toHaveValue('');

  await page.goto('./#/mer/backup');
  await page.getByLabel('Backup-fil').setInputFiles(file);
  const preview = page.getByLabel('Forhåndsvisning av backup');
  await expect(preview).toBeVisible();
  await expect(preview.getByText('Dagslogger', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Erstatt alle data med backupen' }).click();
  await page.getByRole('button', { name: 'Erstatt', exact: true }).click();
  await expect(page.getByText('Dataene er gjenopprettet fra backupen.')).toBeVisible();

  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'Morgenvekt' })).toHaveValue('80,2');
});

test('ny seedVersion gir «Oppdater plan» med oppsummering', async ({ page }) => {
  await startApp(page);
  // Lat som om databasen har en eldre plan installert.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('cut');
        req.onsuccess = () => {
          const tx = req.result.transaction('meta', 'readwrite');
          tx.objectStore('meta').put({ key: 'seedVersion', value: '2026-01-01' });
          tx.oncomplete = () => {
            req.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      }),
  );
  await page.reload();
  await page.getByRole('link', { name: /Ny versjon av planen/ }).click();
  await page.getByRole('button', { name: 'Oppdater plan' }).click();
  await expect(page.getByText(/Planen er oppdatert til \d{4}-\d{2}-\d{2}/)).toBeVisible();
  await page.goto('./');
  await expect(page.getByRole('link', { name: /Ny versjon av planen/ })).toHaveCount(0);
});
