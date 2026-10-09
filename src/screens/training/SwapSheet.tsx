import { useMemo, useState } from 'react';
import { IconSearch } from '../../components/icons';
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
          <h3 className="mb-1 text-sm font-semibold text-muted">Anbefalt alternativ</h3>
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
      className={
        highlight
          ? 'flex min-h-12 w-full flex-col rounded-xl border border-accent bg-accent/10 px-3 py-2 text-left'
          : 'flex min-h-12 w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-surface-2'
      }
    >
      <span className="font-semibold">{exercise.name}</span>
      <span className="text-sm text-muted">{exercise.primaryMuscles.join(', ')}</span>
    </button>
  );
}
