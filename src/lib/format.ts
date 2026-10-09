const formatters = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('nb-NO', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: true,
    });
    formatters.set(key, f);
  }
  return f;
}

/** Norsk tallformat: komma som desimaltegn og mellomrom som tusenskille. */
export function formatNumber(value: number, maxDecimals = 0, minDecimals = 0): string {
  return nf(minDecimals, maxDecimals)
    .format(value)
    .replace(/[\u00a0\u202f]/g, ' ');
}

export const fmtInt = (n: number) => formatNumber(Math.round(n));
export const fmt1 = (n: number) => formatNumber(n, 1, 1);
export const fmtMax1 = (n: number) => formatNumber(n, 1);
export const fmtKcal = (n: number) => `${fmtInt(n)} kcal`;
export const fmtGrams = (n: number) => `${formatNumber(n, 1)} g`;
export const fmtKg = (n: number) => `${formatNumber(n, 2)} kg`;
export const fmtNok = (n: number) => `${formatNumber(n, 2, 2)} kr`;
export const fmtNok0 = (n: number) => `${fmtInt(n)} kr`;

/** Fortegn med ekte minus: +150 / −150 */
export function fmtSigned(n: number, decimals = 0): string {
  const s = formatNumber(Math.abs(n), decimals, decimals);
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return s;
}

/** Tolker «80,2», «80.2», «9 500» → tall. Gir null for ugyldig input. */
export function parseDecimal(input: string): number | null {
  const t = input
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(',', '.')
    .replace('\u2212', '-');
  if (t === '' || !/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(input: string): number | null {
  const n = parseDecimal(input);
  return n === null ? null : Math.round(n);
}

/** Viser et tall i et input-felt med desimalkomma. */
export function toInputValue(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return formatNumber(value, decimals).replace(/ /g, '');
}

/** «2-3» → «2–3» */
export function enDash(text: string): string {
  return text.replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
