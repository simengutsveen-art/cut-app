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
