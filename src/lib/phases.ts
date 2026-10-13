import type { Phase } from '../types';

/** Korteste og lengste plan som kan velges. */
export const MIN_WEEKS = 4;
export const MAX_WEEKS = 24;

/** En bygg-blokk er maks fem uker før det kommer en lett uke. */
const BUILD_BLOCK_WEEKS = 5;

function templateWeeks(template: Phase[]): number {
  return Math.max(0, ...template.map((p) => p.weeks[1]));
}

function isDeload(phase: Phase): boolean {
  return phase.setsFactor !== undefined && phase.setsFactor < 1;
}

/** Fordeler `total` uker på `parts` blokker, de første blokkene får en uke ekstra. */
function split(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Fasene tilpasset planens lengde. Malen (fra seed) har oppstart først, test sist, en lett uke
 * (deload) og bygg-faser. Er lengden lik malen, brukes den som den er. Ellers lages samme oppsett:
 * oppstart (1–2 uker), bygg-blokker på maks fem uker med en lett uke imellom, og test til slutt.
 */
export function phasesForWeeks(template: Phase[], weeks: number): Phase[] {
  if (template.length === 0 || weeks === templateWeeks(template)) return template;
  const startup = template[0];
  const test = template[template.length - 1];
  const deload = template.find(isDeload);
  const builds = template.filter((p) => p !== startup && p !== test && !isDeload(p));
  const buildBase = (builds[0]?.name ?? 'Bygg').replace(/\s*\d+$/, '');

  const startupWeeks = weeks >= 8 ? 2 : 1;
  const middle = Math.max(0, weeks - startupWeeks - 1);
  const deloads = deload ? Math.floor(Math.max(0, middle - 1) / BUILD_BLOCK_WEEKS) : 0;
  const blocks = split(middle - deloads, deloads + 1).filter((n) => n > 0);

  const out: Phase[] = [{ ...startup, weeks: [1, startupWeeks] }];
  let week = startupWeeks + 1;
  blocks.forEach((length, i) => {
    const source = builds[Math.min(i, builds.length - 1)] ?? startup;
    out.push({
      ...source,
      name: blocks.length > 1 ? `${buildBase} ${i + 1}` : buildBase,
      weeks: [week, week + length - 1],
    });
    week += length;
    if (deload && i < blocks.length - 1) {
      out.push({ ...deload, weeks: [week, week] });
      week += 1;
    }
  });
  out.push({ ...test, weeks: [weeks, weeks] });
  return out;
}
