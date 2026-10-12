import type { Page } from '@playwright/test';

/** Mandag 12.10.2026 kl. 08:00 – første dag i planen (Push-dag). */
export const PLAN_START = new Date('2026-10-12T08:00:00+02:00');

/** Åpner appen på et fast tidspunkt og trykker «Start nå» + «Ja, start planen» (uke 1 = den dagen). */
export async function startApp(
  page: Page,
  at: Date = PLAN_START,
  { start = true }: { start?: boolean } = {},
): Promise<void> {
  await page.clock.install({ time: at });
  await page.goto('./');
  await page.getByRole('navigation', { name: 'Hovedmeny' }).waitFor();
  if (start) {
    await page.getByRole('button', { name: 'Start nå' }).click();
    await page
      .getByRole('dialog', { name: 'Starte planen i dag?' })
      .getByRole('button', { name: 'Ja, start planen' })
      .click();
  }
}
