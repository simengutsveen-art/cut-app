import { WEEKDAY_LETTERS } from '../lib/calendar';
import { cx } from '../lib/cx';
import { isoWeekday, parseDate } from '../lib/dates';

export interface DayMarkProps {
  date: string;
  today: string;
  /** Planlagt økt denne dagen */
  planned: boolean;
  /** Minst én økt fullført denne dagen */
  done: boolean;
}

/**
 * Én dag: ukedag over en sirkel med datoen. Samme tegn overalt:
 * grønn = økt fullført, ring = planlagt økt, blå = i dag, ingen ring = hviledag.
 */
export function DayMark({ date, today, planned, done }: DayMarkProps) {
  const isToday = date === today;
  const past = date < today;
  return (
    <span className="flex flex-col items-center gap-1" aria-hidden="true">
      <span className="text-[11px] font-semibold text-muted">
        {WEEKDAY_LETTERS[isoWeekday(date) - 1]}
      </span>
      <span
        className={cx(
          'num flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-semibold',
          done && 'bg-good text-on-status',
          done && isToday && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
          !done && isToday && 'bg-accent text-on-accent',
          !done && !isToday && planned && !past && 'text-fg ring-[1.5px] ring-muted ring-inset',
          !done &&
            !isToday &&
            planned &&
            past &&
            'text-muted ring-[1.5px] ring-muted/35 ring-inset',
          !done && !isToday && !planned && 'text-muted',
        )}
      >
        {parseDate(date).getDate()}
      </span>
    </span>
  );
}

/** Forklaring på tegnene i DayMark. */
export function DayMarkLegend({ className }: { className?: string }) {
  const dot = 'h-3.5 w-3.5 shrink-0 rounded-full';
  return (
    <ul
      className={cx('flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted', className)}
      aria-label="Forklaring"
    >
      <li className="flex items-center gap-1.5">
        <span className={cx(dot, 'bg-good')} aria-hidden="true" /> Økt fullført
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cx(dot, 'ring-[1.5px] ring-muted ring-inset')} aria-hidden="true" />{' '}
        Planlagt økt
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cx(dot, 'bg-accent')} aria-hidden="true" /> I dag
      </li>
      <li>Uten ring: hviledag</li>
    </ul>
  );
}
