import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cx } from '../lib/cx';
import { parseDecimal, toInputValue } from '../lib/format';
import { IconChevronLeft, IconChevronRight, IconX } from './icons';

// ---------- Knapper ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'good';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
  ghost: 'bg-transparent text-accent hover:bg-surface-2',
  danger: 'bg-bad text-on-status',
  good: 'bg-good text-on-status',
};

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-40',
        size === 'sm' && 'min-h-11 px-3 text-sm',
        size === 'md' && 'min-h-12 px-4 text-base',
        size === 'lg' && 'min-h-14 px-5 text-lg',
        block && 'w-full',
        buttonVariants[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function IconButton({
  label,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 min-w-11 items-center justify-center rounded-xl text-fg hover:bg-surface-2 disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Layout ----------

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-xl px-4', className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex items-start gap-1 pt-4 pb-3">
      {back && (
        <IconButton
          label="Tilbake"
          className="-ml-2 shrink-0"
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
        >
          <IconChevronLeft size={26} />
        </IconButton>
      )}
      <div className="min-w-0 flex-1 pt-1">
        <h1 className="text-2xl leading-tight font-bold tracking-tight break-words">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

export function Card({
  children,
  className,
  tone,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tone?: 'good' | 'warn' | 'bad' | 'accent';
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <section
      className={cx(
        'rounded-2xl border bg-surface p-4',
        !tone && 'border-line',
        tone === 'good' && 'border-good/50',
        tone === 'warn' && 'border-warn/60',
        tone === 'bad' && 'border-bad/60',
        tone === 'accent' && 'border-accent/60',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent';
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        tone === 'neutral' && 'bg-surface-3 text-fg',
        tone === 'good' && 'bg-good/15 text-good',
        tone === 'warn' && 'bg-warn/15 text-warn',
        tone === 'bad' && 'bg-bad/15 text-bad',
        tone === 'accent' && 'bg-accent/15 text-accent',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LinkRow({
  to,
  title,
  subtitle,
  right,
}: {
  to: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-2"
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
      </div>
      {right}
      <IconChevronRight size={20} className="shrink-0 text-muted" />
    </Link>
  );
}

export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 flex-1 rounded-lg px-2 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line p-4 text-center text-muted">
      {children}
    </p>
  );
}

// ---------- Skjema ----------

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none';

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

export function SelectInput({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, 'appearance-auto', className)} {...rest}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'min-h-24 py-2', className)} {...rest} />;
}

/**
 * Tallfelt med desimalkomma og numerisk tastatur. Lagrer ved blur og Enter.
 */
export function NumberField({
  value,
  onCommit,
  decimals = 2,
  integer,
  label,
  big,
  placeholder,
  className,
  id,
  suffix,
  min,
  max,
}: {
  value: number | null | undefined;
  onCommit: (value: number | null) => void;
  decimals?: number;
  integer?: boolean;
  label: string;
  big?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(() => toInputValue(value, integer ? 0 : decimals));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(toInputValue(value, integer ? 0 : decimals));
  }, [value, decimals, integer]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      setInvalid(false);
      if (value !== null && value !== undefined) onCommit(null);
      return;
    }
    let n = parseDecimal(trimmed);
    if (n !== null && integer) n = Math.round(n);
    if (n === null || (min !== undefined && n < min) || (max !== undefined && n > max)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (n !== value) onCommit(n);
    setText(toInputValue(n, integer ? 0 : decimals));
  };

  return (
    <div className={cx('relative', className)}>
      <input
        id={inputId}
        aria-label={label}
        aria-invalid={invalid || undefined}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        enterKeyHint="done"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={() => (focused.current = true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cx(
          inputClass,
          'tabular',
          big && 'min-h-16 text-3xl font-bold',
          suffix && 'pr-12',
          invalid && 'border-bad',
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-[var(--c-accent)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}

// ---------- Ark (bottom sheet) ----------

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className="animate-sheet safe-bottom relative flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-3xl border border-line bg-surface focus:outline-none"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <h2 className="min-w-0 flex-1 text-lg font-bold">{title}</h2>
          <IconButton label="Lukk" onClick={onClose}>
            <IconX />
          </IconButton>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

/** Bekreftelse bygget inn i siden (ingen confirm()). */
export function InlineConfirm({
  label,
  confirmLabel,
  message,
  onConfirm,
  variant = 'danger',
  disabled,
}: {
  label: ReactNode;
  confirmLabel: ReactNode;
  message: ReactNode;
  onConfirm: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="secondary" onClick={() => setAsking(true)} disabled={disabled} block>
        {label}
      </Button>
    );
  }
  return (
    <div className="rounded-2xl border border-bad/50 bg-bad/10 p-3" role="alert">
      <p className="mb-3 text-sm">{message}</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setAsking(false)}>
          Avbryt
        </Button>
        <Button
          variant={variant}
          className="flex-1"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
