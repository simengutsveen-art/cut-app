import { useState } from 'react';
import { IconWarning } from '../../components/icons';
import { Button, Card, Field, Page, PageHeader, TextInput } from '../../components/ui';
import Dexie from 'dexie';
import { db, DB_NAME } from '../../db';

const CONFIRM_WORD = 'NULLSTILL';

/** Nullstilling med to bekreftelser i siden (ingen confirm()). */
export function ResetScreen() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    setBusy(true);
    // Lukk uten automatisk gjenåpning, så live-spørringer ikke åpner databasen igjen.
    db.close({ disableAutoOpen: true });
    await Dexie.delete(DB_NAME);
    window.location.replace(`${import.meta.env.BASE_URL}#/`);
    window.location.reload();
  };

  return (
    <Page>
      <PageHeader title="Nullstill app" back="/mer" />
      <Card tone="bad">
        <p className="flex gap-2">
          <IconWarning className="shrink-0 text-bad" />
          <span>
            Alle data på denne enheten slettes: vekt, skritt, mat, økter, bilder, justeringer og
            endringer i plan og innstillinger. Planen lastes inn på nytt fra start.
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">
          Ta backup først hvis du vil kunne hente dataene tilbake.
        </p>

        {step === 0 && (
          <Button variant="danger" block className="mt-4" onClick={() => setStep(1)}>
            Nullstill app
          </Button>
        )}

        {step === 1 && (
          <div className="mt-4 rounded-xl border border-bad/50 bg-bad/10 p-3" role="alert">
            <p className="font-semibold">Er du sikker? Dette kan ikke angres.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>
                Avbryt
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => setStep(2)}>
                Ja, gå videre
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div
            className="mt-4 flex flex-col gap-3 rounded-xl border border-bad/50 bg-bad/10 p-3"
            role="alert"
          >
            <Field label={`Skriv ${CONFIRM_WORD} for å bekrefte`} htmlFor="reset-confirm">
              <TextInput
                id="reset-confirm"
                value={typed}
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setStep(0);
                  setTyped('');
                }}
              >
                Avbryt
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={typed.trim().toUpperCase() !== CONFIRM_WORD || busy}
                onClick={() => void reset()}
              >
                Slett alt
              </Button>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}
