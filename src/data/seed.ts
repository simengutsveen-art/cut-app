import rawSeed from '../../seed-data.json';
import type { SeedData } from '../types';
import { parseSeed } from './schema';

let cached: SeedData | null = null;

/** seed-data.json som ble bygget inn i appen, validert med zod. Kaster SeedValidationError. */
export function getBundledSeed(): SeedData {
  cached ??= parseSeed(rawSeed);
  return cached;
}
