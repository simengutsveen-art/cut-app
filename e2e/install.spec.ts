import { expect, test } from '@playwright/test';
import { startApp } from './helpers';

test('banner på I dag viser veien til Hjem-skjermen, og kan skjules', async ({ page }, info) => {
  await startApp(page);
  const banner = page.getByRole('region', { name: 'Installer appen' });
  await expect(banner).toContainText('Legg Cut på Hjem-skjermen');

  await banner.getByRole('button', { name: 'Slik gjør du' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Installer appen');
  // Veiledningen for telefonen man bruker, står først.
  const first = info.project.name === 'android-chrome' ? 'Android' : 'iPhone';
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(first);
  await expect(page.getByText(/\/$/).filter({ hasText: 'http' })).toBeVisible();

  await page.goto('./#/');
  await banner.getByRole('button', { name: 'Skjul' }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Uke 1');
  await expect(banner).toHaveCount(0);
});

test('Android: «Installer» åpner telefonens egen installeringsdialog', async ({ page }, info) => {
  test.skip(info.project.name !== 'android-chrome', 'Bare Android sender beforeinstallprompt');
  await startApp(page);
  // Chrome sender beforeinstallprompt når appen kan installeres. Her lages en falsk.
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = async () => {
      (window as unknown as { prompted: boolean }).prompted = true;
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  const banner = page.getByRole('region', { name: 'Installer appen' });
  await banner.getByRole('button', { name: 'Installer' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted))
    .toBe(true);
  await expect(banner).toHaveCount(0);

  await page.goto('./#/mer');
  await expect(page.getByRole('link', { name: /Installer på Hjem-skjermen/ })).toContainText(
    'Installert',
  );
});

test.describe('innebygd nettleser (Instagram på Android)', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0',
  });

  test('ber om å åpne lenka i Chrome', async ({ page }) => {
    await startApp(page);
    const banner = page.getByRole('region', { name: 'Installer appen' });
    await expect(banner).toContainText('Åpne Cut i nettleseren');
    await expect(banner.getByRole('link', { name: 'Åpne i Chrome' })).toHaveAttribute(
      'href',
      /^intent:\/\/localhost:\d+\/.*#Intent;scheme=http;package=com\.android\.chrome;S\.browser_fallback_url=.+;end$/,
    );
  });
});

test('ingen banner når appen kjører fra Hjem-skjermen', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes('display-mode: standalone')
        ? ({ ...original(query), matches: true, media: query } as MediaQueryList)
        : original(query);
  });
  await startApp(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Uke 1');
  await expect(page.getByRole('region', { name: 'Installer appen' })).toHaveCount(0);
});

test.describe('Samsung Internet', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  });

  test('sender til Chrome i stedet for å installere (Play Protect blokkerer)', async ({ page }) => {
    await startApp(page);
    // Samsung Internet sender også beforeinstallprompt, men den appen blokkeres av Play Protect.
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      event.prompt = async () => {};
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    const banner = page.getByRole('region', { name: 'Installer appen' });
    await expect(banner).toContainText('Installer Cut fra Chrome');
    await expect(banner.getByRole('link', { name: 'Åpne i Chrome' })).toHaveAttribute(
      'href',
      /^intent:\/\/.*package=com\.android\.chrome/,
    );
    await expect(banner.getByRole('button', { name: 'Installer' })).toHaveCount(0);

    await banner.getByRole('button', { name: 'Slik gjør du' }).click();
    await expect(page.getByText('Du bruker Samsung Internet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Installer Cut' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'En utrygg app er blokkert' })).toContainText(
      'åpne lenka i Chrome',
    );
  });
});
