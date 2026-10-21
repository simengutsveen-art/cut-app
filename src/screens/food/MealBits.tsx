import { IconCheck, IconWarning } from '../../components/icons';
import { Badge } from '../../components/ui';
import { useOptimistic } from '../../hooks/useOptimistic';
import { cx } from '../../lib/cx';
import { fmtNok, formatNumber } from '../../lib/format';
import { SLOT_LABELS } from '../../lib/labels';
import type { Totals } from '../../lib/nutrition';
import { SLOTS, type Slot } from '../../types';

/** Rund avkrysning for «spist», med trykkflate på 44 × 44 px. */
export function EatenCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const [shown, setShown] = useOptimistic(checked);
  return (
    <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        checked={shown}
        onChange={(e) => {
          setShown(e.target.checked);
          onChange(e.target.checked);
        }}
        className="peer pressable h-8 w-8 cursor-pointer appearance-none rounded-full bg-surface-2 shadow-[inset_0_0_0_2px_var(--c-surface-3)] checked:bg-good checked:shadow-[0_6px_18px_-8px_var(--c-good)]"
      />
      <IconCheck
        size={18}
        strokeWidth={3}
        className="pointer-events-none absolute text-on-status opacity-0 transition-opacity peer-checked:opacity-100"
      />
    </label>
  );
}

/** Fire avkrysninger (ett per måltid) for å føre det som er spist. */
export function EatenChips({
  eaten,
  onChange,
}: {
  eaten: Partial<Record<Slot, boolean>> | undefined;
  onChange: (slot: Slot, eaten: boolean) => void;
}) {
  return (
    <div role="group" aria-label="Spist" className="mt-3 grid grid-cols-2 gap-2">
      {SLOTS.map((slot) => (
        <EatenChip
          key={slot}
          slot={slot}
          checked={!!eaten?.[slot]}
          onChange={(v) => onChange(slot, v)}
        />
      ))}
    </div>
  );
}

function EatenChip({
  slot,
  checked,
  onChange,
}: {
  slot: Slot;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const [shown, setShown] = useOptimistic(checked);
  return (
    <label
      className={cx(
        'pressable flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[16px] px-3 text-[15px] font-medium',
        shown ? 'bg-good/15' : 'bg-surface-2',
      )}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          aria-label={`${SLOT_LABELS[slot]} spist`}
          checked={shown}
          onChange={(e) => {
            setShown(e.target.checked);
            onChange(e.target.checked);
          }}
          className="peer h-6 w-6 cursor-pointer appearance-none rounded-full bg-surface shadow-[inset_0_0_0_2px_var(--c-surface-3)] checked:bg-good checked:shadow-none"
        />
        <IconCheck
          size={14}
          strokeWidth={3}
          className="pointer-events-none absolute text-on-status opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      {SLOT_LABELS[slot]}
    </label>
  );
}
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
