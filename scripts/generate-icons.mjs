// Lager PNG-ikoner fra public/icons/icon.svg med Playwright (WebKit).
// Kjør: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(root, 'public/icons/icon.svg'), 'utf8');

const targets = [
  { file: 'apple-touch-icon-180.png', size: 180, padding: 0 },
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  // Maskable: symbolet innenfor den trygge sonen (80 %).
  { file: 'icon-maskable-512.png', size: 512, padding: 0.1 },
];

const browser = await webkit.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { file, size, padding } of targets) {
  const inner = Math.round(size * (1 - padding * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#0b0b10;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(join(root, 'public/icons', file), png);
  console.log(`✓ ${file}`);
}
await browser.close();
