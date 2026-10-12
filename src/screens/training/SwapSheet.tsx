import { useMemo, useState } from 'react';
import { ExerciseThumb } from '../../components/ExerciseImage';
import { IconSearch } from '../../components/icons';
import { cx } from '../../lib/cx';
import { Sheet, TextInput } from '../../components/ui';
import type { Exercise } from '../../types';

export function SwapSheet({
  open,
  current,
  exercises,
  onClose,
  onPick,
}: {
  open: boolean;
  current: Exercise;
  exercises: Exercise[];
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState('');
  const alternative = current.alternative
    ? exercises.find((e) => e.id === current.alternative)
    : undefined;
  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('nb');
    return exercises.filter(
      (e) =>
        e.active &&
        e.id !== current.id &&
        (!q ||
          e.name.toLocaleLowerCase('nb').includes(q) ||
          e.primaryMuscles.some((m) => m.toLocaleLowerCase('nb').includes(q))),
    );
  }, [exercises, current.id, query]);

  return (
    <Sheet open={open} title={`Bytt ut ${current.name}`} onClose={onClose}>
      {alternative && (
        <div className="mb-4">
          <h3 className="eyebrow mb-1.5">Anbefalt alternativ</h3>
          <ExerciseOption exercise={alternative} onPick={onPick} highlight />
        </div>
      )}
      <label className="relative mb-2 block">
        <span className="sr-only">Søk etter øvelse</span>
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <TextInput
          type="search"
          placeholder="Søk etter øvelse eller muskel"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </label>
      <ul className="flex flex-col gap-1">
        {list.map((e) => (
          <li key={e.id}>
            <ExerciseOption exercise={e} onPick={onPick} />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function ExerciseOption({
  exercise,
  onPick,
  highlight,
}: {
  exercise: Exercise;
  onPick: (exercise: Exercise) => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(exercise)}
      className={cx(
        'pressable flex min-h-14 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left',
        highlight
          ? 'bg-accent/10 shadow-[inset_0_0_0_1.5px_var(--c-accent)]'
          : 'hover:bg-surface-2',
      )}
    >
      <ExerciseThumb subject={exercise} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold tracking-[-0.01em]">{exercise.name}</span>
        <span className="block truncate text-[13px] text-muted">
          {exercise.primaryMuscles.join(', ')}
        </span>
      </span>
    </button>
  );
}
