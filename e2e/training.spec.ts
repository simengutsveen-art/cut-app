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

test('feiltrykk på Start: økta kan stoppes med ett trykk når ingen sett er logget', async ({
  page,
}) => {
  await startApp(page);
  // Fra selve økta (Stopp øverst)
  await page.getByRole('button', { name: 'Start Push' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push');
  await page.getByRole('button', { name: 'Avbryt økta' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trening');
  await expect(page.getByRole('button', { name: 'Start Push' })).toBeVisible();
  await expect(page.getByText('Økt pågår')).toHaveCount(0);

  // Fra «I dag» (Stopp ved siden av «Fortsett økta»)
  await page.getByRole('button', { name: 'Start Push' }).click();
  await page
    .getByRole('navigation', { name: 'Hovedmeny' })
    .getByRole('link', { name: 'I dag' })
    .click();
  await expect(page.getByRole('button', { name: 'Fortsett økta' })).toBeVisible();
  await page.getByRole('button', { name: 'Avbryt økta' }).click();
  await expect(page.getByRole('button', { name: 'Start Push' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fortsett økta' })).toHaveCount(0);
});

test('stopp med loggede sett: velg å fullføre eller slette', async ({ page }) => {
  await startApp(page);
  await page.getByRole('button', { name: 'Start Push' }).click();
  await page.getByRole('button', { name: 'Sett 1 ferdig' }).click();
  await page.getByRole('button', { name: 'Stopp økta' }).click();

  const sheet = page.getByRole('dialog', { name: 'Stoppe økta?' });
  await expect(sheet).toContainText('Du har logget 1 sett');
  await sheet.getByRole('button', { name: 'Fortsett økta' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Push');

  await page.getByRole('button', { name: 'Stopp økta' }).click();
  await page
    .getByRole('dialog', { name: 'Stoppe økta?' })
    .getByRole('button', { name: 'Fullfør med 1 sett' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trening');
  await expect(page.getByText('Fullført i dag')).toBeVisible();

  // Ny økt, og denne gangen slettes den
  await page.getByRole('button', { name: 'Start økta Pull nå' }).click();
  await page.getByRole('button', { name: 'Sett 1 ferdig' }).click();
  await page.getByRole('button', { name: 'Stopp økta' }).click();
  await page
    .getByRole('dialog', { name: 'Stoppe økta?' })
    .getByRole('button', { name: 'Slett økta og settene' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trening');
  await expect(page.getByRole('link', { name: /^Pull/ })).toHaveCount(0);
});
