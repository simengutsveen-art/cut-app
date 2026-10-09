import { cx } from '../lib/cx';

const barColor = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad', accent: 'bg-accent' };
const textColor = { good: 'text-good', warn: 'text-warn', bad: 'text-bad', accent: 'text-accent' };

/** Stolpe med verdi mot mål (og valgfritt et målområde). */
export function Meter({
  label,
  value,
  valueText,
  targetText,
  max,
  range,
  tone,
}: {
  label: string;
  value: number;
  valueText: string;
  targetText: string;
  /** Verdien som tilsvarer full stolpe */
  max: number;
  range?: [number, number];
  tone: 'good' | 'warn' | 'bad' | 'accent';
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm text-muted">{targetText}</span>
      </div>
      <div className={cx('tabular text-3xl font-bold', textColor[tone])}>{valueText}</div>
      <div
        className="relative mt-1 h-3 overflow-hidden rounded-full bg-surface-3"
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
      >
        {range && (
          <div
            className="absolute inset-y-0 bg-fg/15"
            style={{
              left: `${(range[0] / max) * 100}%`,
              width: `${((range[1] - range[0]) / max) * 100}%`,
            }}
            aria-hidden="true"
          />
        )}
        <div
          className={cx('absolute inset-y-0 left-0 rounded-full', barColor[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
