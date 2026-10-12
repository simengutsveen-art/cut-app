import type { CSSProperties, ReactNode } from 'react';

type RingTone = 'accent' | 'good' | 'warn' | 'bad';

const toneColor: Record<RingTone, string> = {
  accent: 'var(--c-accent)',
  good: 'var(--c-good)',
  warn: 'var(--c-warn)',
  bad: 'var(--c-bad)',
};

/**
 * Fremdriftsring (som aktivitetsringene på iPhone). Eksponeres som en «meter» for
 * skjermlesere, med verdien og maksimum.
 */
export function Ring({
  value,
  max,
  label,
  tone = 'accent',
  size = 112,
  stroke = 11,
  children,
  valueNow,
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: RingTone;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  /** Verdien som rapporteres til skjermlesere (standard: avrundet value) */
  valueNow?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const style = { '--ring-circumference': `${c}` } as CSSProperties;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={valueNow ?? Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      className={className}
      style={{ width: size, height: size, position: 'relative' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-surface-3)"
          strokeWidth={stroke}
        />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneColor[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ ...style, transition: 'stroke-dashoffset 600ms var(--ease-out)' }}
          opacity={fraction === 0 ? 0 : 1}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
