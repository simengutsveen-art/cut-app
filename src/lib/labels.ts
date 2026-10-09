import type { Slot } from '../types';

export const SLOT_LABELS: Record<Slot, string> = {
  frokost: 'Frokost',
  lunsj: 'Lunsj',
  middag: 'Middag',
  kveldsmat: 'Kveldsmat',
};

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('nb') + text.slice(1);
}

/** Henter en undertekst fra guides, f.eks. guideText(guides, 'maaling', 'livvidde'). */
export function guideText(
  guides: Record<string, string | string[] | Record<string, string>>,
  key: string,
  subKey?: string,
): string | undefined {
  const value = guides[key];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return subKey ? undefined : value;
  if (Array.isArray(value)) return subKey ? undefined : value.join(' ');
  return subKey ? value[subKey] : undefined;
}

export const TABLE_SLUGS = {
  ingredienser: 'ingredients',
  maltider: 'meals',
  ovelser: 'exercises',
  okter: 'sessions',
} as const;

export type TableSlug = keyof typeof TABLE_SLUGS;

export const TABLE_LABELS: Record<
  (typeof TABLE_SLUGS)[TableSlug],
  { plural: string; singular: string; slug: TableSlug }
> = {
  ingredients: { plural: 'Ingredienser', singular: 'ingrediens', slug: 'ingredienser' },
  meals: { plural: 'Måltider', singular: 'måltid', slug: 'maltider' },
  exercises: { plural: 'Øvelser', singular: 'øvelse', slug: 'ovelser' },
  sessions: { plural: 'Økter', singular: 'økt', slug: 'okter' },
};

const GUIDE_LABELS: Record<string, string> = {
  sovn: 'Søvn',
  tilskudd: 'Tilskudd',
  alkohol: 'Alkohol',
  skritt: 'Skritt',
  ryggTeknikk: 'Ryggteknikk',
  maaling: 'Måling',
  vekt: 'Vekt',
  livvidde: 'Livvidde',
  bilder: 'Bilder',
};

export function guideLabel(key: string): string {
  return (
    GUIDE_LABELS[key] ?? capitalize(key.replace(/([a-z])([A-Z])/g, '$1 $2').toLocaleLowerCase('nb'))
  );
}
