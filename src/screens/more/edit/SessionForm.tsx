import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '../../../components/icons';
import {
  Button,
  Card,
  Field,
  IconButton,
  NumberField,
  SectionTitle,
  SelectInput,
  TextInput,
} from '../../../components/ui';
import { saveEntity, slugId } from '../../../data/editOps';
import { sessionSeedSchema } from '../../../data/schema';
import { db } from '../../../db';
import { useDraft } from '../../../hooks/useDraft';
import { weekdayName } from '../../../lib/dates';
import { capitalize } from '../../../lib/labels';
import { useAppData } from '../../../state/appData';
import type { PrescribedExercise, RepUnit, Session } from '../../../types';
import { EntityActions } from './EntityActions';
import { FormPage, NotFound, SaveBar } from './FormBits';

const BACK = '/mer/data/okter';

function blankSession(): Session {
  return {
    id: '',
    name: '',
    weekday: 1,
    exercises: [],
    source: 'user',
    userModified: false,
    active: true,
  };
}

export function SessionForm() {
  const { id = '' } = useParams();
  const isNew = id === 'ny';
  const { sessionsById } = useAppData();
  const stored = isNew ? undefined : sessionsById.get(id);
  const [blank] = useState(blankSession);
  if (!isNew && !stored) return <NotFound back={BACK} />;
  return <SessionEditor key={id} isNew={isNew} stored={stored ?? blank} />;
}

function SessionEditor({ isNew, stored }: { isNew: boolean; stored: Session }) {
  const navigate = useNavigate();
  const { exercises, sessions } = useAppData();
  const { draft, update, markClean, current, dirty } = useDraft(stored);
  const [error, setError] = useState<string | null>(null);
  // Etter at et nytt element er lagret, åpnes det under sin nye adresse.
  const location = useLocation();
  const [saved, setSaved] = useState(() => !!(location.state as { saved?: boolean } | null)?.saved);
  const set = (fn: (d: Session) => Session) => {
    setSaved(false);
    update(fn);
  };
  const setRow = (i: number, patch: Partial<PrescribedExercise>) =>
    set((d) => ({
      ...d,
      exercises: d.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)),
    }));
  const move = (i: number, dir: -1 | 1) =>
    set((d) => {
      const list = [...d.exercises];
      const j = i + dir;
      if (j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, exercises: list };
    });
  const options = exercises.filter(
    (e) => e.active || draft.exercises.some((p) => p.exerciseId === e.id),
  );

  const save = async () => {
    const d = current();
    const { source, userModified, active, ...rest } = d;
    const candidate = {
      ...rest,
      id: isNew
        ? slugId(
            d.name,
            sessions.map((s) => s.id),
          )
        : d.id,
      name: d.name.trim(),
      exercises: d.exercises.map((p) => ({
        ...p,
        note: p.note?.trim() ? p.note.trim() : undefined,
      })),
    };
    const result = sessionSeedSchema.safeParse(candidate);
    if (!result.success) {
      setError(z.prettifyError(result.error));
      return;
    }
    const next: Session = { ...result.data, source, userModified, active };
    await saveEntity(db, 'sessions', next);
    setError(null);
    setSaved(true);
    markClean(next);
    if (isNew)
      navigate(`${BACK}/${encodeURIComponent(next.id)}`, { replace: true, state: { saved: true } });
  };

  return (
    <FormPage title={isNew ? 'Ny økt' : draft.name || 'Økt'} back={BACK}>
      <Card className="flex flex-col gap-4">
        <Field label="Navn" htmlFor="s-name">
          <TextInput
            id="s-name"
            value={draft.name}
            onChange={(e) => set((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field
          label="Ukedag"
          htmlFor="s-day"
          hint="Hvilken økt som gjøres hvilken dag, styres av ukeplanen i Innstillinger."
        >
          <SelectInput
            id="s-day"
            value={draft.weekday}
            onChange={(e) => set((d) => ({ ...d, weekday: Number(e.target.value) }))}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {capitalize(weekdayName(d))}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      <SectionTitle>Øvelser</SectionTitle>
      <ol className="flex flex-col gap-3">
        {draft.exercises.map((p, i) => (
          <li key={i}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-end gap-1">
                <div className="min-w-0 flex-1">
                  <Field label={`Øvelse ${i + 1}`} htmlFor={`s-ex-${i}`}>
                    <SelectInput
                      id={`s-ex-${i}`}
                      value={p.exerciseId}
                      onChange={(e) => setRow(i, { exerciseId: e.target.value })}
                    >
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <IconButton
                  label={`Flytt øvelse ${i + 1} opp`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <IconArrowUp size={20} />
                </IconButton>
                <IconButton
                  label={`Flytt øvelse ${i + 1} ned`}
                  disabled={i === draft.exercises.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <IconArrowDown size={20} />
                </IconButton>
                <IconButton
                  label={`Fjern øvelse ${i + 1}`}
                  onClick={() =>
                    set((d) => ({ ...d, exercises: d.exercises.filter((_, j) => j !== i) }))
                  }
                >
                  <IconTrash size={20} />
                </IconButton>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Sett">
                  <NumberField
                    label={`Sett øvelse ${i + 1}`}
                    integer
                    min={1}
                    value={p.sets}
                    onCommit={(v) => setRow(i, { sets: v ?? 1 })}
                  />
                </Field>
                <Field label="Reps fra">
                  <NumberField
                    label={`Reps fra øvelse ${i + 1}`}
                    integer
                    min={0}
                    value={p.repMin}
                    onCommit={(v) => setRow(i, { repMin: v ?? 0 })}
                  />
                </Field>
                <Field label="Reps til">
                  <NumberField
                    label={`Reps til øvelse ${i + 1}`}
                    integer
                    min={0}
                    value={p.repMax}
                    onCommit={(v) => setRow(i, { repMax: v ?? 0 })}
                  />
                </Field>
                <Field label="RIR" htmlFor={`s-rir-${i}`}>
                  <TextInput
                    id={`s-rir-${i}`}
                    value={p.rir}
                    onChange={(e) => setRow(i, { rir: e.target.value })}
                  />
                </Field>
                <Field label="Pause (s)">
                  <NumberField
                    label={`Pause øvelse ${i + 1}`}
                    integer
                    min={0}
                    value={p.restSec}
                    onCommit={(v) => setRow(i, { restSec: v ?? 0 })}
                  />
                </Field>
                <Field label="Enhet" htmlFor={`s-unit-${i}`}>
                  <SelectInput
                    id={`s-unit-${i}`}
                    value={p.unit}
                    onChange={(e) => setRow(i, { unit: e.target.value as RepUnit })}
                  >
                    <option value="reps">Reps</option>
                    <option value="meter">Meter</option>
                  </SelectInput>
                </Field>
                <Field label="Fra uke">
                  <NumberField
                    label={`Aktiv fra uke, øvelse ${i + 1}`}
                    integer
                    min={1}
                    value={p.activeFromWeek ?? null}
                    placeholder="–"
                    onCommit={(v) => setRow(i, { activeFromWeek: v ?? undefined })}
                  />
                </Field>
                <Field label="Til uke">
                  <NumberField
                    label={`Aktiv til uke, øvelse ${i + 1}`}
                    integer
                    min={1}
                    value={p.activeUntilWeek ?? null}
                    placeholder="–"
                    onCommit={(v) => setRow(i, { activeUntilWeek: v ?? undefined })}
                  />
                </Field>
              </div>
              <Field label="Startvekt" htmlFor={`s-start-${i}`}>
                <TextInput
                  id={`s-start-${i}`}
                  value={p.startWeightNote}
                  onChange={(e) => setRow(i, { startWeightNote: e.target.value })}
                />
              </Field>
              <Field label="Notat" htmlFor={`s-note-${i}`}>
                <TextInput
                  id={`s-note-${i}`}
                  value={p.note ?? ''}
                  onChange={(e) => setRow(i, { note: e.target.value })}
                />
              </Field>
            </Card>
          </li>
        ))}
      </ol>
      <Button
        variant="secondary"
        block
        className="mt-3"
        onClick={() =>
          set((d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              {
                exerciseId: options[0]?.id ?? '',
                sets: 3,
                repMin: 8,
                repMax: 12,
                rir: '2',
                restSec: 90,
                startWeightNote: '',
                unit: 'reps',
              },
            ],
          }))
        }
      >
        <IconPlus size={18} /> Legg til øvelse
      </Button>

      <SaveBar onSave={() => void save()} error={error} saved={saved} dirty={dirty} />
      {!isNew && (
        <EntityActions
          table="sessions"
          id={stored.id}
          entity={stored}
          onReset={() => markClean()}
        />
      )}
    </FormPage>
  );
}
