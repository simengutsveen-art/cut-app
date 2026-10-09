import { IconWarning } from '../../components/icons';
import { Badge } from '../../components/ui';
import { cx } from '../../lib/cx';
import { fmtNok, formatNumber } from '../../lib/format';
import type { Totals } from '../../lib/nutrition';

/** Kompakt linje med kcal, protein (og valgfritt karbo/fett) og pris. */
export function MacroLine({
  totals,
  full,
  className,
}: {
  totals: Totals;
  full?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('tabular text-sm text-muted', className)}>
      <span className="font-semibold text-fg">{formatNumber(totals.kcal)} kcal</span> ·{' '}
      {formatNumber(totals.protein, 1)} g protein
      {full && (
        <>
          {' '}
          · {formatNumber(totals.carbs, 1)} g karbo · {formatNumber(totals.fat, 1)} g fett
        </>
      )}{' '}
      · {fmtNok(totals.priceNok)}
    </span>
  );
}

export function DislikeWarning({ hits }: { hits: string[] }) {
  if (hits.length === 0) return null;
  return (
    <Badge tone="warn">
      <IconWarning size={14} /> Inneholder {hits.join(', ')}
    </Badge>
  );
}

export function MacroGrid({ totals }: { totals: Totals }) {
  const items = [
    { label: 'kcal', value: formatNumber(totals.kcal) },
    { label: 'protein', value: `${formatNumber(totals.protein, 1)} g` },
    { label: 'karbo', value: `${formatNumber(totals.carbs, 1)} g` },
    { label: 'fett', value: `${formatNumber(totals.fat, 1)} g` },
  ];
  return (
    <dl className="grid grid-cols-4 gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl bg-surface-2 px-2 py-2 text-center">
          <dt className="text-xs text-muted">{i.label}</dt>
          <dd className="tabular text-lg font-bold">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
