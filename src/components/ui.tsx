import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { cx } from '../lib/cx';
import { useSaveOnHide } from '../hooks/useSaveOnHide';
import { parseDecimal, toInputValue } from '../lib/format';
import { IconCheck, IconChevronLeft, IconChevronRight, IconX } from './icons';

// ---------- Knapper ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'good';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent shadow-[0_10px_28px_-14px_var(--c-accent)] hover:bg-accent-strong',
  secondary: 'bg-surface-2 text-fg shadow-[inset_0_0_0_1px_var(--c-hairline)] hover:bg-surface-3',
  ghost: 'bg-transparent text-accent hover:bg-surface-2',
  danger: 'bg-bad text-on-status',
  good: 'bg-good text-on-status shadow-[0_10px_28px_-14px_var(--c-good)]',
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
        'pressable inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] disabled:opacity-40',
        size === 'sm' && 'min-h-11 rounded-xl px-3.5 text-[15px]',
        size === 'md' && 'min-h-12 rounded-2xl px-4 text-base',
        size === 'lg' && 'min-h-14 rounded-2xl px-5 text-[17px]',
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
        'pressable inline-flex h-11 min-w-11 items-center justify-center rounded-full text-fg hover:bg-surface-2 disabled:opacity-30',
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
  return (
    <div className={cx('stagger relative mx-auto w-full max-w-xl px-4', className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Liten tekst over tittelen (f.eks. dato) */
  eyebrow?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="pt-5 pb-4">
      {back && (
        <IconButton
          label="Tilbake"
          className="mb-2 -ml-1 bg-surface-2/70 shadow-[inset_0_0_0_1px_var(--c-hairline)]"
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
        >
          <IconChevronLeft size={22} />
        </IconButton>
      )}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="text-[30px] leading-[1.08] font-bold tracking-[-0.03em] break-words">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1 pb-0.5">{actions}</div>}
      </div>
    </header>
  );
}

type Tone = 'good' | 'warn' | 'bad' | 'accent';

export function Card({
  children,
  className,
  tone,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <section
      className={cx('surface rounded-[22px] p-4', tone && `tone-${tone}`, className)}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-end justify-between gap-2">
      <h2 className="text-[19px] leading-tight font-semibold tracking-[-0.02em]">{children}</h2>
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
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.01em]',
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
  icon,
}: {
  to: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2"
    >
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium tracking-[-0.01em]">{title}</div>
        {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
      </div>
      {right}
      <IconChevronRight size={18} className="shrink-0 text-muted" />
    </Link>
  );
}

export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="surface divide-y divide-[var(--c-hairline)] overflow-hidden rounded-[22px]">
      {children}
    </div>
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
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 rounded-2xl bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--c-hairline)]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'pressable min-h-10 flex-1 rounded-xl px-2 text-sm font-semibold',
            value === o.value ? 'surface text-fg' : 'text-muted hover:text-fg',
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
    <p className="rounded-[22px] bg-surface-2/60 px-4 py-6 text-center text-[15px] text-muted shadow-[inset_0_0_0_1px_var(--c-hairline)]">
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
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'field min-h-12 w-full rounded-2xl border-0 px-3.5 text-fg placeholder:text-muted/60';

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

export function SelectInput({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, 'min-w-0 appearance-auto', className)} {...rest}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'min-h-24 py-3 leading-snug', className)} {...rest} />;
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

  // Lagre også hvis appen lukkes mens feltet er i bruk.
  useSaveOnHide(() => {
    if (focused.current) commit();
  });

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
          'num',
          big && 'min-h-[68px] text-[34px] font-semibold',
          suffix && 'pr-12',
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[15px] text-muted">
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
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer pressable h-7 w-7 cursor-pointer appearance-none rounded-full bg-surface-2 shadow-[inset_0_0_0_2px_var(--c-surface-3)] checked:bg-accent checked:shadow-[0_6px_18px_-8px_var(--c-accent)]"
        />
        <IconCheck
          size={16}
          strokeWidth={3}
          className="pointer-events-none absolute text-on-accent opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
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
  // Portal til <body>, så arket ligger over fanelinja uansett hvor det brukes.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="animate-fade absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className="animate-sheet safe-bottom surface relative flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-[28px] focus:outline-none"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-3" aria-hidden="true" />
        <div className="flex items-center gap-2 px-4 pt-1 pb-2">
          <h2 className="min-w-0 flex-1 text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
          <IconButton label="Lukk" onClick={onClose} className="bg-surface-2">
            <IconX size={20} />
          </IconButton>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pt-1 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
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
    <div className="tone-bad surface animate-fade rounded-[22px] p-3.5" role="alert">
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
