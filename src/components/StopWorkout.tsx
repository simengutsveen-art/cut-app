import { useState } from 'react';
import { discardWorkout, finishWorkout } from '../data/workouts';
import { db } from '../db';
import type { WorkoutLog } from '../types';
import { IconCheck, IconTrash, IconX } from './icons';
import { Button, Sheet } from './ui';

export type StopResult = 'discarded' | 'finished';

/**
 * Stopper en pågående økt. Uten loggede sett avbrytes den med en gang (typisk feiltrykk
 * på «Start»). Med loggede sett kan Simen fullføre med settene, slette økta eller fortsette.
 */
export function StopWorkoutButton({
  log,
  onStopped,
  compact,
  className,
}: {
  log: WorkoutLog;
  onStopped?: (result: StopResult) => void;
  /** Kort knapp («Stopp») til topplinja og kort */
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const doneSets = log.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  const discard = async () => {
    setOpen(false);
    await discardWorkout(db, log.id);
    onStopped?.('discarded');
  };
  const finish = async () => {
    setOpen(false);
    await finishWorkout(db, log.id);
    onStopped?.('finished');
  };

  const label = doneSets === 0 ? 'Avbryt økt' : 'Stopp økt';
  return (
    <>
      <Button
        variant="danger"
        size={compact ? 'sm' : 'md'}
        block={!compact}
        className={className}
        aria-label={compact ? `${label}a` : undefined}
        onClick={() => (doneSets === 0 ? void discard() : setOpen(true))}
      >
        <IconX size={18} /> {compact ? 'Stopp' : label}
      </Button>
      <Sheet open={open} title="Stoppe økta?" onClose={() => setOpen(false)}>
        <p className="text-[15px] text-muted">Du har logget {doneSets} sett i denne økta.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          <Button size="lg" block onClick={() => void finish()}>
            <IconCheck size={20} /> Fullfør med {doneSets} sett
          </Button>
          <Button size="lg" block variant="danger" onClick={() => void discard()}>
            <IconTrash size={19} /> Slett økta og settene
          </Button>
          <Button size="lg" block variant="ghost" onClick={() => setOpen(false)}>
            Fortsett økta
          </Button>
        </div>
      </Sheet>
    </>
  );
}
