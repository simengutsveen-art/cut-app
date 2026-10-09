import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExerciseImagePair } from '../../components/ExerciseImage';
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
        'rounded-2xl border bg-surface',
        allDone ? 'border-good/50' : open ? 'border-accent/60' : 'border-line',
      )}
      aria-label={exercise.name}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            allDone ? 'bg-good text-on-status' : 'bg-surface-3 text-fg',
          )}
          aria-hidden="true"
        >
          {allDone ? <IconCheck size={18} /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-tight font-semibold">{exercise.name}</span>
          <span className="block text-sm text-muted">
            {prescription.sets} × {repRange}
            {prescription.unit === 'meter' ? ' m' : ''} · RIR {prescription.rirLabel} · pause{' '}
            {formatDuration(prescription.restSec)}
          </span>
        </span>
        <span className="tabular shrink-0 text-sm font-semibold text-muted">
          {doneCount}/{entry.sets.length}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <ExerciseImagePair subject={exercise} />

          <div className="flex flex-wrap gap-1.5">
            {exercise.perSide && <Badge>Per side</Badge>}
            {view.isPR && (
              <Badge tone="good">
                <IconTrophy size={14} /> PR
              </Badge>
            )}
            {entry.exerciseId !== entry.plannedExerciseId && (
              <Badge tone="accent">Byttet fra {view.plannedName}</Badge>
            )}
          </div>

          {view.suggestionText && (
            <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm font-medium text-fg">
              {view.suggestionText}
            </p>
          )}
          {!view.hasHistory && prescription.startWeightNote && (
            <p className="text-sm text-muted">Startvekt: {enDash(prescription.startWeightNote)}</p>
          )}
          {prescription.note && <p className="text-sm text-muted">{prescription.note}</p>}
          {exercise.backNote && (
            <p className="flex gap-2 rounded-xl bg-warn/10 px-3 py-2 text-sm">
              <IconWarning size={18} className="shrink-0 text-warn" />
              <span>{exercise.backNote}</span>
            </p>
          )}
          {view.stalled && (
            <p className="flex gap-2 rounded-xl bg-warn/10 px-3 py-2 text-sm" role="note">
              <IconWarning size={18} className="shrink-0 text-warn" />
              <span>{stallRule}</span>
            </p>
          )}
          {exercise.cues.length > 0 && (
            <details className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <summary className="min-h-8 cursor-pointer font-semibold">Tips</summary>
              <ul className="mt-1 list-disc pl-5 text-muted">
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
            className="flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-accent"
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
  restSec,
  unitLabel,
  kgStepValue,
  repStep,
}: {
  logId: string;
  exIndex: number;
  entry: WorkoutExerciseLog;
  exercise: Exercise;
  restSec: number;
  unitLabel: string;
  kgStepValue: number;
  repStep: number;
}) {
  const current = entry.sets.findIndex((s) => !s.done);
  const [editing, setEditing] = useState<number | null>(null);
  const expanded = editing ?? current;

  const complete = (i: number) => {
    primeAudio();
    setEditing(null);
    void completeSet(db, logId, exIndex, i, restSec);
  };

  return (
    <ol className="flex flex-col gap-2" aria-label={`Sett i ${exercise.name}`}>
      {entry.sets.map((set, i) =>
        i === expanded ? (
          <li key={i}>
            <SetEditor
              number={i + 1}
              total={entry.sets.length}
              set={set}
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
              unitLabel={unitLabel}
              onEdit={() => setEditing(i)}
              onToggle={() => (set.done ? void uncompleteSet(db, logId, exIndex, i) : complete(i))}
            />
          </li>
        ),
      )}
    </ol>
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
  unitLabel,
  onEdit,
  onToggle,
}: {
  number: number;
  set: SetLog;
  unitLabel: string;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-xl border px-2',
        set.done ? 'border-good/40 bg-good/10' : 'border-line bg-surface-2',
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-1 text-left"
        aria-label={`Endre sett ${number}: ${setSummary(set, unitLabel)}`}
      >
        <span className="w-12 shrink-0 text-sm text-muted">Sett {number}</span>
        <span className="tabular truncate text-lg font-semibold">{setSummary(set, unitLabel)}</span>
      </button>
      <IconButton
        label={set.done ? `Angre sett ${number}` : `Merk sett ${number} som ferdig`}
        onClick={onToggle}
        className={cx(
          'h-11 w-11 shrink-0 border',
          set.done ? 'border-good bg-good text-on-status' : 'border-line bg-surface',
        )}
      >
        <IconCheck />
      </IconButton>
    </div>
  );
}

function SetEditor({
  number,
  total,
  set,
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
        'flex flex-col gap-3 rounded-2xl border-2 p-3',
        set.done ? 'border-good/60' : 'border-accent',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          Sett {number} av {total}
        </span>
        {onRemove && (
          <IconButton label={`Fjern sett ${number}`} onClick={onRemove} className="text-muted">
            <IconTrash size={20} />
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
        <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
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
                'h-11 min-w-11 flex-1 rounded-xl border font-semibold',
                set.rir === r
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-line bg-surface-2',
              )}
            >
              {r === 4 ? '4+' : r}
            </button>
          ))}
        </div>
      </fieldset>
      <Button size="lg" variant={set.done ? 'secondary' : 'good'} block onClick={onDone}>
        <IconCheck /> {set.done ? 'Lagre' : `Sett ${number} ferdig`}
      </Button>
    </div>
  );
}
