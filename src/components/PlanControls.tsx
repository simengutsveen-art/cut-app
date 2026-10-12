import { useState } from 'react';
import { endPlan, startPlan } from '../data/progressOps';
import { db } from '../db';
import { planProgress } from '../lib/calendar';
import { addDaysISO, formatWeekdayLong, formatWeekdayLongYear } from '../lib/dates';
import { formatNumber } from '../lib/format';
import { useAppData } from '../state/appData';
import { IconPlay, IconX } from './icons';
import { Button, Sheet } from './ui';

/** «Start nå» med et «Er du sikker?»-ark, så planen ikke startes ved et uhell. */
export function StartPlanButton({
  today,
  label = 'Start nå',
  className,
}: {
  today: string;
  label?: string;
  className?: string;
}) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  const endDate = addDaysISO(today, settings.weeks * 7 - 1);
  return (
    <>
      <Button className={className} block size="lg" onClick={() => setOpen(true)}>
        <IconPlay size={18} /> {label}
      </Button>
      <Sheet open={open} title="Starte planen i dag?" onClose={() => setOpen(false)}>
        <p className="text-[15px]">
          Uke 1 starter i dag, {formatWeekdayLong(today)}. Planen varer i {settings.weeks} uker, til
          og med {formatWeekdayLongYear(endDate)}.
        </p>
        <p className="mt-2 text-[14px] text-muted">
          Du kan avslutte planen senere under Kalender eller Innstillinger.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            size="lg"
            block
            onClick={() => {
              setOpen(false);
              void startPlan(db, today);
            }}
          >
            <IconPlay size={18} /> Ja, start planen
          </Button>
          <Button size="lg" block variant="ghost" onClick={() => setOpen(false)}>
            Ikke ennå
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** «Avslutt planen»: tilbake til «Klar til start». Loggede data beholdes. */
export function EndPlanButton({
  today,
  onEnded,
  className,
}: {
  today: string;
  onEnded?: () => void;
  className?: string;
}) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  if (!settings.planStarted) return null;
  const progress = planProgress(settings.startDate, settings.weeks, today, true);
  return (
    <>
      <Button variant="secondary" block className={className} onClick={() => setOpen(true)}>
        <IconX size={18} /> Avslutt planen
      </Button>
      <Sheet open={open} title="Avslutte planen?" onClose={() => setOpen(false)}>
        <p className="text-[15px]">
          {progress.started
            ? `Du er på dag ${formatNumber(progress.dayNumber)} av ${formatNumber(progress.totalDays)}. `
            : ''}
          Appen går tilbake til «Klar til start», og du kan starte på nytt når du vil.
        </p>
        <p className="mt-2 text-[14px] text-muted">
          Det du har logget (vekt, skritt, mat og økter) blir liggende. Vil du slette alt, gjør du
          det under Mer → Nullstill app.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            size="lg"
            block
            variant="danger"
            onClick={async () => {
              setOpen(false);
              await endPlan(db);
              onEnded?.();
            }}
          >
            <IconX size={18} /> Avslutt planen
          </Button>
          <Button size="lg" block variant="ghost" onClick={() => setOpen(false)}>
            Fortsett planen
          </Button>
        </div>
      </Sheet>
    </>
  );
}
