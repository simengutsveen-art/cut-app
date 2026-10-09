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
