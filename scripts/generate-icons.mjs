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
  const scale = 1 - padding * 2;
  // Bakgrunnen fyller alltid hele flaten; bare symbolet krympes (trygg sone for maskable).
  const art = svg.replace(
    '<g id="glyph">',
    `<g id="glyph" transform="translate(256 256) scale(${scale}) translate(-256 -256)">`,
  );
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#090b0f;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
      <div style="width:${size}px;height:${size}px">${art.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    </body></html>`,
  );
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(join(root, 'public/icons', file), png);
  console.log(`✓ ${file}`);
}
await browser.close();
