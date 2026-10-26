import { prescriptionForWeek } from '../lib/prescription';
import { useAppData } from '../state/appData';
import type { Session } from '../types';
import { ExerciseThumb } from './ExerciseImage';
import { IconCheck, IconPlay } from './icons';
import { Button, Card } from './ui';

/** Kort for en økt: navn, antall øvelser og sett, miniatyrbilder og start-knapp. */
export function SessionCard({
  session,
  week,
  done,
  onStart,
  eyebrow,
  disabled,
}: {
  session: Session;
  week: number;
  done: boolean;
  onStart: () => void;
  eyebrow?: string;
  disabled?: boolean;
}) {
  const { plan, exercisesById } = useAppData();
  const prescription = prescriptionForWeek(session, plan.phases, week);
  const exercises = prescription.map((p) => exercisesById.get(p.exerciseId)).filter((e) => !!e);
  const sets = prescription.reduce((n, p) => n + p.sets, 0);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{done ? 'Fullført' : (eyebrow ?? 'Planlagt i dag')}</p>
          <h2 className="mt-1 text-[24px] leading-tight font-bold tracking-[-0.025em]">
            {session.name}
          </h2>
          <p className="mt-0.5 text-[14px] text-muted">
            {exercises.length} øvelser · {sets} sett
          </p>
        </div>
        <div className="flex shrink-0 -space-x-3 pt-1">
          {exercises.slice(0, 3).map((e) => (
            <ExerciseThumb
              key={e.id}
              subject={e}
              size={44}
              className="ring-[3px] ring-[var(--c-surface)]"
            />
          ))}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-[14px] text-muted">
        {exercises.map((e) => e.name).join(' · ')}
      </p>
      {done ? (
        <p className="mt-3 flex items-center gap-1.5 font-semibold text-good">
          <IconCheck size={18} /> Fullført i dag
        </p>
      ) : (
        <Button className="mt-4" block size="lg" onClick={onStart} disabled={disabled}>
          <IconPlay size={18} /> Start {session.name}
        </Button>
      )}
    </Card>
  );
}
