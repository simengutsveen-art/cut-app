// Laster ned øvelsesbilder fra Free Exercise DB (Unlicense / public domain)
// til public/exercises/{id}/0.jpg og 1.jpg.
//
// - henter bare bilder som brukes i seed-data.json (øvelser og core-rutinen)
// - hopper over bilder som allerede finnes
// - skriver en tydelig feilmelding hvis en ID ikke finnes
//
// Kjør: npm run images

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/';
const FILES = ['0.jpg', '1.jpg'];
const CONCURRENCY = 6;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'seed-data.json');
const outDir = join(root, 'public', 'exercises');

const seed = JSON.parse(await readFile(seedPath, 'utf8'));

/** @type {Map<string, string[]>} imageSourceId → hvem som bruker den */
const ids = new Map();
const use = (id, who) => {
  if (!id) return;
  ids.set(id, [...(ids.get(id) ?? []), who]);
};
for (const ex of seed.exercises ?? []) use(ex.imageSourceId, `øvelse «${ex.name}»`);
for (const item of seed.coreRoutine?.items ?? []) use(item.imageSourceId, `core «${item.name}»`);

const jobs = [];
for (const id of ids.keys()) {
  if (!/^[A-Za-z0-9_\-()',.]+$/.test(id)) {
    console.error(`✗ Ugyldig imageSourceId «${id}» (brukt av ${ids.get(id).join(', ')})`);
    process.exitCode = 1;
    continue;
  }
  for (const file of FILES) jobs.push({ id, file });
}

let downloaded = 0;
let skipped = 0;
/** @type {Map<string, string>} */
const failures = new Map();

async function run({ id, file }) {
  const target = join(outDir, id, file);
  if (existsSync(target)) {
    skipped++;
    return;
  }
  const url = `${BASE_URL}exercises/${encodeURIComponent(id)}/${file}`;
  let res;
  try {
    res = await fetch(url);
  } catch (error) {
    failures.set(`${id}/${file}`, `nettverksfeil: ${error.message}`);
    return;
  }
  if (res.status === 404) {
    failures.set(
      `${id}/${file}`,
      `ID-en «${id}» finnes ikke i Free Exercise DB (${url}). Brukt av ${ids.get(id).join(', ')}.`,
    );
    return;
  }
  if (!res.ok) {
    failures.set(`${id}/${file}`, `HTTP ${res.status} for ${url}`);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  downloaded++;
  console.log(`✓ ${id}/${file} (${Math.round(buffer.length / 1024)} kB)`);
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await run(queue.shift());
  }),
);

console.log(
  `\n${ids.size} bilde-ID-er i seed-fila · ${downloaded} lastet ned · ${skipped} fantes fra før`,
);
if (failures.size) {
  console.error(`\n${failures.size} bilder mangler:`);
  for (const [key, message] of failures) console.error(`  ✗ ${key}: ${message}`);
  process.exitCode = 1;
}
