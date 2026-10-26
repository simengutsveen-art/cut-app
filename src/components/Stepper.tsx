import { useEffect, useRef, useState } from 'react';
import { formatNumber, parseDecimal, toInputValue } from '../lib/format';
import { IconMinus, IconPlus } from './icons';

/** Stort tall med − og + (minst 48 px trykkflater). Tallet kan også skrives inn. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  label,
  unit,
  decimals = 2,
}: {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  decimals?: number;
}) {
  const [text, setText] = useState(toInputValue(value, decimals));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(toInputValue(value, decimals));
  }, [value, decimals]);

  const commit = (n: number) => {
    const clamped = Math.min(max, Math.max(min, Math.round(n * 100) / 100));
    if (clamped !== value) onChange(clamped);
    setText(toInputValue(clamped, decimals));
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-xl bg-surface shadow-[inset_0_0_0_1px_var(--c-hairline)] focus-within:shadow-[inset_0_0_0_2px_var(--c-accent)]">
        <button
          type="button"
          aria-label={`${label} minus ${formatNumber(step, 2)}`}
          className="flex h-14 w-12 shrink-0 items-center justify-center text-fg transition-colors active:bg-surface-3"
          onClick={() => commit(value - step)}
        >
          <IconMinus />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            aria-label={label}
            type="text"
            inputMode={decimals === 0 ? 'numeric' : 'decimal'}
            enterKeyHint="done"
            value={text}
            onFocus={(e) => {
              focused.current = true;
              e.target.select();
            }}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              focused.current = false;
              const n = parseDecimal(text);
              if (n === null) setText(toInputValue(value, decimals));
              else commit(n);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="num h-14 w-full min-w-0 bg-transparent text-center text-[26px] font-bold text-fg focus:outline-none"
          />
          {unit && (
            <span className="pointer-events-none absolute right-1 bottom-0.5 text-[10px] text-muted">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`${label} pluss ${formatNumber(step, 2)}`}
          className="flex h-14 w-12 shrink-0 items-center justify-center text-fg transition-colors active:bg-surface-3"
          onClick={() => commit(value + step)}
        >
          <IconPlus />
        </button>
      </div>
    </div>
  );
}
