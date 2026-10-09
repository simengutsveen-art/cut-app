import { cx } from '../lib/cx';
import { painEntry } from '../lib/pain';
import type { PainLevel, PainScaleEntry } from '../types';

const levelClasses: Record<PainLevel, { on: string; off: string; text: string }> = {
  grønn: { on: 'bg-good text-on-status border-good', off: 'border-good/40', text: 'text-good' },
  gul: { on: 'bg-warn text-on-status border-warn', off: 'border-warn/50', text: 'text-warn' },
  rød: { on: 'bg-bad text-on-status border-bad', off: 'border-bad/50', text: 'text-bad' },
};

/** Smerte 0–10 med trafikklysfarger fra painScale. */
export function PainPicker({
  value,
  scale,
  onChange,
}: {
  value: number | null;
  scale: PainScaleEntry[];
  onChange: (value: number | null) => void;
}) {
  const selected = painEntry(value, scale);
  const values = Array.from({ length: 11 }, (_, i) => i);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-muted">Smerte i ryggen i dag (0–10)</legend>
      <div className="grid grid-cols-6 gap-1.5">
        {values.map((v) => {
          const level = painEntry(v, scale)?.level ?? 'grønn';
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              aria-label={`Smerte ${v} (${level})`}
              onClick={() => onChange(on ? null : v)}
              className={cx(
                'tabular h-12 rounded-xl border-2 text-lg font-bold',
                on ? levelClasses[level].on : cx('bg-surface-2', levelClasses[level].off),
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
      {selected && (
        <p
          className={cx('mt-2 text-sm font-medium', levelClasses[selected.level].text)}
          role="status"
        >
          {selected.level === 'grønn' ? 'Grønt' : selected.level === 'gul' ? 'Gult' : 'Rødt'}:{' '}
          <span className="text-fg">{selected.action}</span>
        </p>
      )}
    </fieldset>
  );
}
