import { useLiveQuery } from 'dexie-react-hooks';
import { BackAlertCard } from '../../components/BackAlertCard';
import { ExerciseImagePair } from '../../components/ExerciseImage';
import { IconWarning } from '../../components/icons';
import { Card, Checkbox, Page, PageHeader, SectionTitle } from '../../components/ui';
import { patchDayLog } from '../../data/dayLogs';
import { db } from '../../db';
import { useOptimistic } from '../../hooks/useOptimistic';
import { useToday } from '../../hooks/useToday';
import { cx } from '../../lib/cx';
import { addDaysISO } from '../../lib/dates';
import { backAlert } from '../../lib/pain';
import { useAppData } from '../../state/appData';

const dotColor = { grønn: 'bg-good', gul: 'bg-warn', rød: 'bg-bad' } as const;

export function CoreScreen() {
  const { plan } = useAppData();
  const routine = plan.coreRoutine;
  const today = useToday();
  const logs = useLiveQuery(
    () => db.dayLogs.where('date').between(addDaysISO(today, -2), today, true, true).toArray(),
    [today],
  );
  const todayLog = logs?.find((l) => l.date === today);
  const [done, setDone] = useOptimistic(!!todayLog?.coreDone);
  const alert = backAlert(logs ?? [], today, routine.painScale);

  return (
    <Page>
      <PageHeader title="Core og rygg" subtitle={routine.when} back="/mer" />
      {alert.show && <BackAlertCard reason={alert.reason} />}

      <Card>
        <Checkbox
          checked={done}
          onChange={(v) => {
            setDone(v);
            void patchDayLog(db, today, { coreDone: v });
          }}
          label="Rutinen er gjort i dag"
        />
      </Card>

      <SectionTitle>Rutinen</SectionTitle>
      <ol className="flex flex-col gap-3">
        {routine.items.map((item, i) => (
          <li key={item.name}>
            <Card>
              <h3 className="text-lg font-bold">
                {i + 1}. {item.name}
              </h3>
              <p className="mb-2 font-semibold text-accent">{item.dose}</p>
              {item.imageSourceId ? (
                <ExerciseImagePair
                  subject={{ name: item.name, imageSourceId: item.imageSourceId }}
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${item.name} (ingen bilde)`}
                  className="flex aspect-[3/1] items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 p-3 text-center"
                >
                  <span>
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-sm text-muted">
                      Ingen bilde – følg beskrivelsen under
                    </span>
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm">{item.cue}</p>
            </Card>
          </li>
        ))}
      </ol>

      <SectionTitle>Progresjon</SectionTitle>
      <Card>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {routine.progression.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>

      <SectionTitle>Smerte-trafikklys</SectionTitle>
      <Card className="p-0">
        <ul>
          {routine.painScale.map((p) => (
            <li key={p.level} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span
                className={cx('mt-1 h-4 w-4 shrink-0 rounded-full', dotColor[p.level])}
                aria-hidden="true"
              />
              <span>
                <span className="font-semibold capitalize">
                  {p.level} ({p.range[0]}–{p.range[1]})
                </span>
                <span className="block text-sm">{p.action}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>Røde flagg</SectionTitle>
      <Card tone="bad">
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {routine.redFlags.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-3 flex gap-2 rounded-xl bg-bad/15 p-3 text-sm font-semibold" role="note">
          <IconWarning size={18} className="shrink-0 text-bad" />
          {routine.emergency}
        </p>
      </Card>
    </Page>
  );
}
