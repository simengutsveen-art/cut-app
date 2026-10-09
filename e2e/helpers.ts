import type { Page } from '@playwright/test';

/** Mandag 12.10.2026 kl. 08:00 – første dag i planen (Push-dag). */
export const PLAN_START = new Date('2026-10-12T08:00:00+02:00');

export async function startApp(page: Page, at: Date = PLAN_START): Promise<void> {
  await page.clock.install({ time: at });
  await page.goto('./');
  await page.getByRole('navigation', { name: 'Hovedmeny' }).waitFor();
}
