import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconCheck, IconWarning } from '../../components/icons';
import { Card, Page, PageHeader } from '../../components/ui';
import { patchDayLog } from '../../data/dayLogs';
import { db } from '../../db';
import { formatDate, isValidISODate, todayISO } from '../../lib/dates';
import { formatNumber, parseDecimal, parseInteger } from '../../lib/format';

type Result =
  { ok: true; date: string; steps?: number; weight?: number } | { ok: false; error: string };

/** Leser f.eks. #/logg?steps=9432&date=2026-10-12 (fra en iOS-snarvei) og lagrer verdiene. */
export function LogShortcutScreen() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<Result | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const date = params.get('date') ?? todayISO();
    const stepsRaw = params.get('steps');
    const weightRaw = params.get('weight');
    const steps = stepsRaw !== null ? parseInteger(stepsRaw) : undefined;
    const weight = weightRaw !== null ? parseDecimal(weightRaw) : undefined;
    if (!isValidISODate(date)) {
      setResult({ ok: false, error: `Ugyldig dato: «${date}». Bruk formatet yyyy-mm-dd.` });
      return;
    }
    if (steps === null || (steps !== undefined && (steps < 0 || steps > 200000))) {
      setResult({ ok: false, error: `Ugyldig antall skritt: «${stepsRaw}».` });
      return;
    }
    if (weight === null || (weight !== undefined && (weight < 20 || weight > 400))) {
      setResult({ ok: false, error: `Ugyldig vekt: «${weightRaw}».` });
      return;
    }
    if (steps === undefined && weight === undefined) {
      setResult({ ok: false, error: 'Fant ingen verdier. Bruk f.eks. #/logg?steps=9432.' });
      return;
    }
    void patchDayLog(db, date, {
      ...(steps !== undefined ? { steps } : {}),
      ...(weight !== undefined ? { weightKg: weight } : {}),
    }).then(() => setResult({ ok: true, date, steps, weight }));
  }, [params]);

  return (
    <Page>
      <PageHeader title="Registrering" />
      {result?.ok && (
        <Card tone="good" role="status">
          <p className="flex items-center gap-2 text-lg font-bold">
            <IconCheck className="text-good" /> Lagret
          </p>
          <p className="mt-1">
            {formatDate(result.date)}:{' '}
            {[
              result.steps !== undefined && `${formatNumber(result.steps)} skritt`,
              result.weight !== undefined && `${formatNumber(result.weight, 1)} kg`,
            ]
              .filter(Boolean)
              .join(' og ')}
          </p>
        </Card>
      )}
      {result && !result.ok && (
        <Card tone="bad" role="alert">
          <p className="flex items-center gap-2 font-semibold">
            <IconWarning className="text-bad" /> Kunne ikke lagre
          </p>
          <p className="mt-1 text-sm">{result.error}</p>
        </Card>
      )}
      <Link
        to="/"
        replace
        className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-accent font-semibold text-on-accent"
      >
        Til I dag
      </Link>
    </Page>
  );
}
