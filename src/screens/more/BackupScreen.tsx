import { useRef, useState } from 'react';
import { IconDownload, IconUpload } from '../../components/icons';
import { Button, Card, InlineConfirm, Page, PageHeader, SectionTitle } from '../../components/ui';
import {
  backupFileName,
  dayLogsToCsv,
  exportBackup,
  importBackup,
  parseBackup,
  type BackupFile,
  type BackupPreview,
} from '../../data/backup';
import { db } from '../../db';
import { formatDate, todayISO } from '../../lib/dates';
import { defaultMealsForDate, effectiveMeals } from '../../lib/mealPrep';
import { dayTotals } from '../../lib/nutrition';
import { useAppData } from '../../state/appData';
import { SLOTS } from '../../types';

function canShareFile(file: File): boolean {
  try {
    return !!navigator.share && !!navigator.canShare?.({ files: [file] });
  } catch {
    return false;
  }
}

/** Del fila via Web Share (må kalles direkte fra et trykk). Faller tilbake til nedlasting. */
async function shareFile(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title: file.name });
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return false;
    download(file);
    return true;
  }
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const tableNames: Record<keyof BackupPreview['counts'], string> = {
  settings: 'Innstillinger',
  ingredients: 'Ingredienser',
  meals: 'Måltider',
  exercises: 'Øvelser',
  sessions: 'Økter (maler)',
  dayLogs: 'Dagslogger',
  workoutLogs: 'Treningsøkter',
  measurements: 'Målinger',
  adjustments: 'Justeringer',
  meta: 'Metadata',
};

export function BackupScreen() {
  const app = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<{ backup: BackupFile; preview: BackupPreview } | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // På iOS deles fila i et eget trykk, fordi Web Share krever et ferskt trykk.
  const [ready, setReady] = useState<{ file: File; isBackup: boolean } | null>(null);

  const deliver = async (file: File, isBackup: boolean) => {
    if (canShareFile(file)) {
      setReady({ file, isBackup });
      return;
    }
    download(file);
    if (isBackup) await markBackedUp();
  };

  const markBackedUp = async () => {
    await db.setMeta('lastBackupAt', Date.now());
    setStatus('Backup eksportert. Lagre fila et trygt sted (f.eks. Filer → iCloud Drive).');
  };

  const doExport = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const backup = await exportBackup(db);
      const file = new File([JSON.stringify(backup)], backupFileName(), {
        type: 'application/json',
      });
      await deliver(file, true);
    } catch (e) {
      setStatus(`Eksport feilet: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    const logs = await db.dayLogs.toArray();
    const rows = logs.map((log) => {
      const meals = effectiveMeals(
        log.meals,
        defaultMealsForDate(log.date, app.settings, app.plan.mealPrepRotation),
      );
      const totals = dayTotals(
        SLOTS.map((s) => app.mealsById.get(meals[s])),
        log.extras,
        app.ingredientsById,
      );
      return {
        date: log.date,
        weightKg: log.weightKg,
        steps: log.steps,
        kcal: totals.kcal,
        protein: totals.protein,
        coreDone: log.coreDone,
        pain: log.pain,
        note: log.note,
      };
    });
    const file = new File([dayLogsToCsv(rows)], `cut-dagslogg-${todayISO()}.csv`, {
      type: 'text/csv',
    });
    await deliver(file, false);
  };

  const onFile = async (files: FileList | null) => {
    setImportError(null);
    setPending(null);
    setStatus(null);
    const file = files?.[0];
    if (!file) return;
    const result = parseBackup(await file.text());
    if (result.ok) setPending({ backup: result.backup, preview: result.preview });
    else setImportError(result.error);
    if (fileRef.current) fileRef.current.value = '';
  };

  const doImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(db, pending.backup);
      setPending(null);
      setStatus('Dataene er gjenopprettet fra backupen.');
    } catch (e) {
      setImportError(`Import feilet: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Backup og eksport" back="/mer" />
      <Card>
        <p className="text-sm">
          Alt ligger bare på denne telefonen. Sletter du appen fra Hjem-skjermen, eller rydder
          Safari nettstedsdata, forsvinner loggene. Ta backup minst én gang i uka.
        </p>
        <p className="mt-2 text-sm text-muted">
          Siste backup:{' '}
          {app.lastBackupAt ? formatDate(todayISO(new Date(app.lastBackupAt))) : 'aldri'}
        </p>
        <Button className="mt-3" block size="lg" onClick={() => void doExport()} disabled={busy}>
          <IconDownload /> Eksporter alt
        </Button>
        {ready && (
          <div className="mt-3 rounded-xl border border-accent/60 bg-accent/10 p-3">
            <p className="text-sm">Fila er klar: {ready.file.name}</p>
            <Button
              className="mt-2"
              block
              onClick={async () => {
                const { file, isBackup } = ready;
                if (await shareFile(file)) {
                  setReady(null);
                  if (isBackup) await markBackedUp();
                }
              }}
            >
              Del / lagre fila
            </Button>
          </div>
        )}
        {status && (
          <p className="mt-2 text-sm" role="status">
            {status}
          </p>
        )}
      </Card>

      <SectionTitle>Importer backup</SectionTitle>
      <Card>
        <p className="text-sm text-muted">
          Velg en backup-fil (.json). Du ser hva den inneholder før noe overskrives.
        </p>
        <Button variant="secondary" block className="mt-3" onClick={() => fileRef.current?.click()}>
          <IconUpload /> Velg backup-fil
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Backup-fil"
          onChange={(e) => void onFile(e.target.files)}
        />
        {importError && (
          <pre
            className="mt-3 overflow-x-auto rounded-xl bg-bad/10 p-3 text-sm whitespace-pre-wrap text-bad"
            role="alert"
          >
            {importError}
          </pre>
        )}
        {pending && (
          <div
            className="mt-4 rounded-xl border border-line p-3"
            aria-label="Forhåndsvisning av backup"
          >
            <h3 className="font-semibold">Innhold i backupen</h3>
            <p className="text-sm text-muted">
              Eksportert {formatDate(todayISO(new Date(pending.preview.exportedAt)))} · plan{' '}
              {pending.preview.seedVersion}
            </p>
            {pending.preview.firstDate && (
              <p className="text-sm text-muted">
                Dagslogger fra {formatDate(pending.preview.firstDate)} til{' '}
                {formatDate(pending.preview.lastDate!)}
              </p>
            )}
            <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {(Object.keys(tableNames) as (keyof typeof tableNames)[])
                .filter((k) => k !== 'meta' && k !== 'settings')
                .map((k) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{tableNames[k]}</dt>
                    <dd>{pending.preview.counts[k]}</dd>
                  </div>
                ))}
              <dt className="text-muted">Bilder</dt>
              <dd>{pending.preview.photoCount}</dd>
            </dl>
            <div className="mt-3">
              <InlineConfirm
                label="Erstatt alle data med backupen"
                message="Alt som ligger i appen nå, blir erstattet av innholdet i backupen."
                confirmLabel="Erstatt"
                onConfirm={() => void doImport()}
                disabled={busy}
              />
            </div>
          </div>
        )}
      </Card>

      <SectionTitle>Excel</SectionTitle>
      <Card>
        <p className="text-sm text-muted">
          Dagsloggen (vekt, skritt, kcal, protein, core og smerte) som CSV-fil som kan åpnes i
          Excel.
        </p>
        <Button variant="secondary" block className="mt-3" onClick={() => void exportCsv()}>
          <IconDownload /> Eksporter dagslogg (CSV)
        </Button>
      </Card>
    </Page>
  );
}
