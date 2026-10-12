import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExerciseMotion, ExerciseThumb } from '../../components/ExerciseImage';
import { Stepper } from '../../components/Stepper';
import {
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconSwap,
  IconTrash,
  IconTrophy,
  IconWarning,
} from '../../components/icons';
import { Badge, Button, IconButton } from '../../components/ui';
import { addSet, completeSet, removeSet, uncompleteSet, updateSet } from '../../data/workouts';
import { db } from '../../db';
import { cx } from '../../lib/cx';
import { enDash, formatDuration, formatNumber } from '../../lib/format';
import { kgStep } from '../../lib/progression';
import { primeAudio } from '../../services/sound';
import type { Exercise, SetLog, WorkoutExerciseLog } from '../../types';
import type { ExerciseView } from './WorkoutScreen';

const RIR_CHOICES = [0, 1, 2, 3, 4];

export function ExerciseCard({
  logId,
  index,
  entry,
  view,
  open,
  onToggle,
  onSwap,
  incrementsKg,
  stallRule,
}: {
  logId: string;
  index: number;
  entry: WorkoutExerciseLog;
  view: ExerciseView;
  open: boolean;
  onToggle: () => void;
  onSwap: () => void;
  incrementsKg: Record<string, number>;
  stallRule: string;
}) {
  const { exercise, prescription } = view;
  const doneCount = entry.sets.filter((s) => s.done).length;
  const allDone = doneCount === entry.sets.length;
  const unitLabel = prescription.unit === 'meter' ? 'Meter' : 'Reps';
  const repRange =
    prescription.repMin === prescription.repMax
      ? `${prescription.repMin}`
      : `${prescription.repMin}–${prescription.repMax}`;

  return (
    <article
      className={cx(
        'surface overflow-hidden rounded-[22px] transition-shadow',
        allDone ? 'tone-good' : open && 'tone-accent',
      )}
      aria-label={exercise.name}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface-2"
      >
        <span className="relative shrink-0">
          <ExerciseThumb subject={exercise} size={52} className="rounded-2xl" />
          <span
            aria-hidden="true"
            className={cx(
              'num absolute -right-1.5 -bottom-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ring-[3px] ring-[var(--c-surface)]',
              allDone ? 'bg-good text-on-status' : 'bg-surface-3 text-fg',
            )}
          >
            {allDone ? <IconCheck size={13} strokeWidth={3} /> : index + 1}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-tight font-semibold tracking-[-0.01em]">
            {exercise.name}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">
            {prescription.sets} × {repRange}
            {prescription.unit === 'meter' ? ' m' : ''} · RIR {prescription.rirLabel} · pause{' '}
            {formatDuration(prescription.restSec)}
          </span>
        </span>
        <span
          className={cx(
            'num shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold',
            allDone ? 'bg-good/15 text-good' : 'bg-surface-2 text-muted',
          )}
        >
          {doneCount}/{entry.sets.length}
        </span>
      </button>

      {open && (
        <div className="animate-fade flex flex-col gap-3 px-3.5 pb-4">
          <ExerciseMotion subject={exercise} />

          {(exercise.perSide || view.isPR || entry.exerciseId !== entry.plannedExerciseId) && (
            <div className="flex flex-wrap gap-1.5">
              {exercise.perSide && <Badge>Per side</Badge>}
              {view.isPR && (
                <Badge tone="good">
                  <IconTrophy size={13} /> PR
                </Badge>
              )}
              {entry.exerciseId !== entry.plannedExerciseId && (
                <Badge tone="accent">Byttet fra {view.plannedName}</Badge>
              )}
            </div>
          )}

          {view.suggestionText && (
            <p className="rounded-2xl bg-accent/10 px-3.5 py-2.5 text-[14px] leading-snug font-medium shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--c-accent)_25%,transparent)]">
              {view.suggestionText}
            </p>
          )}
          {!view.hasHistory && prescription.startWeightNote && (
            <p className="text-[14px] text-muted">
              Startvekt: <span className="text-fg">{enDash(prescription.startWeightNote)}</span>
            </p>
          )}
          {prescription.note && <p className="text-[14px] text-muted">{prescription.note}</p>}
          {exercise.backNote && (
            <p className="flex gap-2 rounded-2xl bg-warn/10 px-3.5 py-2.5 text-[14px]">
              <IconWarning size={18} className="shrink-0 text-warn" />
              <span>{exercise.backNote}</span>
            </p>
          )}
          {view.stalled && (
            <p className="flex gap-2 rounded-2xl bg-warn/10 px-3.5 py-2.5 text-[14px]" role="note">
              <IconWarning size={18} className="shrink-0 text-warn" />
              <span>{stallRule}</span>
            </p>
          )}
          {exercise.cues.length > 0 && (
            <details className="group rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[14px]">
              <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between font-semibold">
                Tips
                <IconChevronRight
                  size={16}
                  className="text-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-muted">
                {exercise.cues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}

          <SetList
            logId={logId}
            exIndex={index}
            entry={entry}
            exercise={exercise}
            previous={view.previousSets}
            restSec={prescription.restSec}
            unitLabel={unitLabel}
            kgStepValue={kgStep(exercise.loadType, incrementsKg)}
            repStep={prescription.unit === 'meter' ? 5 : 1}
          />

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => void addSet(db, logId, index)}
            >
              <IconPlus size={18} /> Sett
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={onSwap}>
              <IconSwap size={18} /> Bytt øvelse
            </Button>
          </div>
          <Link
            to={`/trening/ovelse/${exercise.id}`}
            className="flex min-h-11 items-center justify-center gap-1 text-[14px] font-medium text-accent"
          >
            Historikk for {exercise.name} <IconChevronRight size={16} />
          </Link>
        </div>
      )}
    </article>
  );
}

function SetList({
  logId,
  exIndex,
  entry,
  exercise,
  previous,
  restSec,
  unitLabel,
  kgStepValue,
  repStep,
}: {
  logId: string;
  exIndex: number;
  entry: WorkoutExerciseLog;
  exercise: Exercise;
  previous: SetLog[] | null;
  restSec: number;
  unitLabel: string;
  kgStepValue: number;
  repStep: number;
}) {
  const current = entry.sets.findIndex((s) => !s.done);
  const [editing, setEditing] = useState<number | null>(null);
  const expanded = editing ?? current;
  const meter = unitLabel === 'Meter';

  const complete = (i: number) => {
    primeAudio();
    setEditing(null);
    void completeSet(db, logId, exIndex, i, restSec);
  };

  return (
    <div>
      <div
        className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1.3fr)_44px] items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase"
        aria-hidden="true"
      >
        <span className="text-center">Sett</span>
        <span>Forrige</span>
        <span>{meter ? 'Kg × meter' : 'Kg × reps'}</span>
        <span />
      </div>
      <ol className="flex flex-col gap-1.5" aria-label={`Sett i ${exercise.name}`}>
        {entry.sets.map((set, i) => {
          const prev = previous?.[i];
          const prevText = prev ? `${formatNumber(prev.kg, 2)} × ${prev.reps}` : '–';
          return i === expanded ? (
            <li key={i}>
              <SetEditor
                number={i + 1}
                total={entry.sets.length}
                set={set}
                previous={prev ? prevText : null}
                unitLabel={unitLabel}
                kgStepValue={kgStepValue}
                repStep={repStep}
                loadType={exercise.loadType}
                onChange={(patch) => void updateSet(db, logId, exIndex, i, patch)}
                onDone={() => (set.done ? setEditing(null) : complete(i))}
                onRemove={
                  entry.sets.length > 1 ? () => void removeSet(db, logId, exIndex, i) : undefined
                }
              />
            </li>
          ) : (
            <li key={i}>
              <SetRow
                number={i + 1}
                set={set}
                previous={prevText}
                unitLabel={unitLabel}
                onEdit={() => setEditing(i)}
                onToggle={() =>
                  set.done ? void uncompleteSet(db, logId, exIndex, i) : complete(i)
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function setSummary(set: SetLog, unitLabel: string): string {
  const reps = unitLabel === 'Meter' ? `${set.reps} m` : `${set.reps}`;
  const rir = set.rir !== null && set.rir !== undefined ? ` · RIR ${set.rir}` : '';
  return `${formatNumber(set.kg, 2)} kg × ${reps}${rir}`;
}

function SetRow({
  number,
  set,
  previous,
  unitLabel,
  onEdit,
  onToggle,
}: {
  number: number;
  set: SetLog;
  previous: string;
  unitLabel: string;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={cx(
        'grid grid-cols-[minmax(0,1fr)_44px] items-center gap-2 rounded-2xl px-2 py-1 transition-colors',
        set.done ? 'bg-good/10' : 'bg-surface-2',
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="grid min-h-11 min-w-0 grid-cols-[32px_minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-2 text-left"
        aria-label={`Endre sett ${number}: ${setSummary(set, unitLabel)}`}
      >
        <span
          className={cx(
            'num flex h-7 w-7 items-center justify-center justify-self-center rounded-full text-[13px] font-bold',
            set.done ? 'bg-good/20 text-good' : 'bg-surface-3',
          )}
        >
          {number}
        </span>
        <span className="num truncate text-[14px] text-muted">{previous}</span>
        <span className="num truncate text-[17px] font-semibold">
          {formatNumber(set.kg, 2)} × {set.reps}
          {unitLabel === 'Meter' ? ' m' : ''}
          {set.rir !== null && set.rir !== undefined && (
            <span className="ml-1 text-[12px] font-medium text-muted">RIR {set.rir}</span>
          )}
        </span>
      </button>
      <IconButton
        label={set.done ? `Angre sett ${number}` : `Merk sett ${number} som ferdig`}
        onClick={onToggle}
        className={cx(
          'h-11 w-11 shrink-0 rounded-[14px]',
          set.done
            ? 'bg-good text-on-status'
            : 'bg-surface shadow-[inset_0_0_0_1px_var(--c-hairline)] text-muted',
        )}
      >
        <IconCheck size={20} strokeWidth={2.6} />
      </IconButton>
    </div>
  );
}

function SetEditor({
  number,
  total,
  set,
  previous,
  unitLabel,
  kgStepValue,
  repStep,
  loadType,
  onChange,
  onDone,
  onRemove,
}: {
  number: number;
  total: number;
  set: SetLog;
  previous: string | null;
  unitLabel: string;
  kgStepValue: number;
  repStep: number;
  loadType: string;
  onChange: (patch: Partial<SetLog>) => void;
  onDone: () => void;
  onRemove?: () => void;
}) {
  const kgLabel = loadType === 'kroppsvekt' ? 'Ekstra kg' : 'Kg';
  return (
    <div
      className={cx(
        'animate-fade flex flex-col gap-3 rounded-[20px] bg-surface-2 p-3',
        set.done
          ? 'shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--c-good)_55%,transparent)]'
          : 'shadow-[inset_0_0_0_2px_var(--c-accent)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">
          Sett {number} av {total}
          {previous && (
            <span className="ml-2 text-[13px] font-medium text-muted">Forrige {previous}</span>
          )}
        </span>
        {onRemove && (
          <IconButton label={`Fjern sett ${number}`} onClick={onRemove} className="text-muted">
            <IconTrash size={19} />
          </IconButton>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stepper
          label={kgLabel}
          value={set.kg}
          step={kgStepValue}
          onChange={(kg) => onChange({ kg })}
          max={1000}
        />
        <Stepper
          label={unitLabel}
          value={set.reps}
          step={repStep}
          decimals={0}
          onChange={(reps) => onChange({ reps })}
          max={500}
        />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">
          RIR (valgfritt)
        </legend>
        <div className="flex gap-1.5">
          {RIR_CHOICES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={set.rir === r}
              onClick={() => onChange({ rir: set.rir === r ? null : r })}
              className={cx(
                'pressable num h-11 min-w-11 flex-1 rounded-[14px] font-semibold',
                set.rir === r
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface shadow-[inset_0_0_0_1px_var(--c-hairline)]',
              )}
            >
              {r === 4 ? '4+' : r}
            </button>
          ))}
        </div>
      </fieldset>
      <Button size="lg" variant={set.done ? 'secondary' : 'good'} block onClick={onDone}>
        <IconCheck size={20} strokeWidth={2.6} /> {set.done ? 'Lagre' : `Sett ${number} ferdig`}
      </Button>
    </div>
  );
}
