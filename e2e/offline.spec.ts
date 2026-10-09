import { devices, expect, test, type Page } from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { PLAN_START } from './helpers';

// Playwrights context.setOffline() stopper også svarene fra service workeren i WebKit på
// Windows/Linux, så vi «går offline» ved å stoppe serveren appen ble lastet fra. Da kan
// ingenting hentes fra nett, og alt må komme fra service workerens cache.

const PORT = 4175;
const base = process.env.VITE_BASE ?? '/';
const url = `http://localhost:${PORT}${base}`;

test.use({ ...devices['iPhone 14'] });

async function allImagesLoaded(page: Page): Promise<{ total: number; broken: string[] }> {
  return page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    imgs.forEach((img) => (img.loading = 'eager'));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? null
          : new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            }),
      ),
    );
    return {
      total: imgs.length,
      broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
    };
  });
}

test('offline: alle faner og øvelsesbilder fungerer etter første lasting', async ({ page }) => {
  let server: PreviewServer | null = await preview({
    preview: { port: PORT, strictPort: true },
    logLevel: 'silent',
  });
  try {
    await page.clock.install({ time: PLAN_START });
    await page.goto(url);
    await page.getByRole('navigation', { name: 'Hovedmeny' }).waitFor();

    // Vent til service workeren er installert (precache ferdig) og styrer siden.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 })
      .toBe(true);

    // Gå offline.
    await server.close();
    server = null;
    await expect(
      fetch(url).then(
        () => 'online',
        () => 'offline',
      ),
    ).resolves.toBe('offline');

    await page.reload();
    const nav = page.getByRole('navigation', { name: 'Hovedmeny' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uke 1 av 12 · Oppstart');

    for (const [tab, heading] of [
      ['Trening', 'Trening'],
      ['Mat', 'Mat'],
      ['Fremgang', 'Fremgang'],
      ['Mer', 'Mer'],
      ['I dag', 'Uke 1 av 12'],
    ] as const) {
      await nav.getByRole('link', { name: tab }).click();
      await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
    }

    // Øvelsesbilder i en økt og i core-rutinen.
    await page.getByRole('button', { name: 'Start Push' }).click();
    await expect(page.getByRole('img', { name: 'Benkpress – start' })).toBeVisible();
    let images = await allImagesLoaded(page);
    expect(images.total).toBeGreaterThanOrEqual(2);
    expect(images.broken).toEqual([]);

    await page.goto(`${url}#/mer/core`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core og rygg');
    images = await allImagesLoaded(page);
    expect(images.total).toBeGreaterThanOrEqual(8);
    expect(images.broken).toEqual([]);

    // Logging fungerer også offline.
    await page.goto(`${url}#/`);
    const weight = page.getByRole('textbox', { name: 'Morgenvekt' });
    await weight.fill('79,9');
    await weight.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Lagret' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Morgenvekt' })).toHaveValue('79,9');
  } finally {
    await server?.close();
  }
});
