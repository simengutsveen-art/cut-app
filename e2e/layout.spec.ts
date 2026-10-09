import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

const routes = [
  '/',
  '/trening',
  '/trening/ovelse/benkpress',
  '/mat',
  '/mat/bibliotek',
  '/mat/bibliotek/L2',
  '/mat/prep',
  '/mat/handleliste',
  '/fremgang',
  '/mer',
  '/mer/core',
  '/mer/guide',
  '/mer/data',
  '/mer/data/ingredienser',
  '/mer/data/ingredienser/kyllingfilet',
  '/mer/data/maltider/L2',
  '/mer/data/ovelser/skulderpress_sittende',
  '/mer/data/okter/okt1',
  '/mer/innstillinger',
  '/mer/backup',
  '/mer/oppdater',
  '/mer/om',
  '/mer/nullstill',
];

test.use({ viewport: { width: 375, height: 740 } });

test('ingen horisontal scrolling på 375 px bredde', async ({ page }) => {
  await startApp(page);
  for (const route of routes) {
    await page.goto(`./#${route}`);
    await page.waitForTimeout(250);
    const { scroll, width, offenders } = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return {
        scroll: document.documentElement.scrollWidth,
        width: w,
        offenders: [...document.querySelectorAll('main *')]
          .filter((e) => e.getBoundingClientRect().right > w + 0.5)
          .slice(0, 3)
          .map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}`),
      };
    });
    expect(offenders, `${route}: elementer utenfor skjermen`).toEqual([]);
    expect(scroll, `${route}: horisontal scrolling`).toBeLessThanOrEqual(width);
  }
});

test('trykkflater er minst 44 × 44 px i fanelinja og økta', async ({ page }) => {
  await startApp(page);
  const tabs = page.getByRole('navigation', { name: 'Hovedmeny' }).getByRole('link');
  for (const box of await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Start Push' }).click();
  for (const name of ['Kg minus 2,5', 'Kg pluss 2,5', 'Sett 1 ferdig']) {
    const box = (await page.getByRole('button', { name }).first().boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});
