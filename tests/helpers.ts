import fixtureJson from './fixtures/seed-2026-10-09.json';
import realSeedJson from '../seed-data.json';
import { parseSeed } from '../src/data/schema';
import { CutDB } from '../src/db';
import type { SeedData } from '../src/types';

/** Fast kopi av seed-fila (9. okt. 2026) – brukes til tester med eksakte tall. */
export function fixtureSeed(): SeedData {
  return parseSeed(structuredClone(fixtureJson));
}

export function realSeed(): SeedData {
  return parseSeed(structuredClone(realSeedJson));
}

export function rawFixture(): unknown {
  return structuredClone(fixtureJson);
}

let counter = 0;
export function freshDb(): CutDB {
  counter += 1;
  return new CutDB(`test-${Date.now()}-${counter}-${Math.random().toString(36).slice(2)}`);
}
