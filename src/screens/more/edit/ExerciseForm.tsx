import { useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ExerciseImagePair } from '../../../components/ExerciseImage';
import { IconCamera, IconTrash } from '../../../components/icons';
import {
  Button,
  Card,
  Checkbox,
  Field,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from '../../../components/ui';
import { saveEntity, slugId } from '../../../data/editOps';
import { exerciseSeedSchema } from '../../../data/schema';
import { db } from '../../../db';
import { useDraft } from '../../../hooks/useDraft';
import { linesToList, trimList } from '../../../lib/util';
import { compressImage } from '../../../services/images';
import { useAppData } from '../../../state/appData';
import type { Exercise } from '../../../types';
import { EntityActions } from './EntityActions';
import { FormPage, NotFound, SaveBar } from './FormBits';

const BACK = '/mer/data/ovelser';

const LOAD_LABELS: Record<string, string> = {
  stang_overkropp: 'Stang, overkropp',
  stang_underkropp: 'Stang, underkropp',
  maskin_underkropp: 'Maskin, underkropp',
  maskin_overkropp: 'Maskin, overkropp',
  kabel: 'Kabel',
  manualer: 'Manualer',
  kroppsvekt: 'Kroppsvekt',
  core: 'Core',
};

function blankExercise(loadType: string): Exercise {
  return {
    id: '',
    name: '',
    imageSourceId: null,
    loadType,
    primaryMuscles: [],
    cues: [],
    alternative: null,
    perSide: false,
    backNote: null,
    source: 'user',
    userModified: false,
    active: true,
  };
}

export function ExerciseForm() {
  const { id = '' } = useParams();
  const isNew = id === 'ny';
  const { exercisesById, plan } = useAppData();
  const stored = isNew ? undefined : exercisesById.get(id);
  const [blank] = useState(() =>
    blankExercise(Object.keys(plan.progression.incrementsKg)[0] ?? 'manualer'),
  );
  if (!isNew && !stored) return <NotFound back={BACK} />;
  return <ExerciseEditor key={id} isNew={isNew} stored={stored ?? blank} />;
}

function ExerciseEditor({ isNew, stored }: { isNew: boolean; stored: Exercise }) {
  const navigate = useNavigate();
  const { exercises, plan } = useAppData();
  const { draft, update, markClean, current, dirty } = useDraft(stored);
  const [error, setError] = useState<string | null>(null);
  // Etter at et nytt element er lagret, åpnes det under sin nye adresse.
  const location = useLocation();
  const [saved, setSaved] = useState(() => !!(location.state as { saved?: boolean } | null)?.saved);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const set = (fn: (d: Exercise) => Exercise) => {
    setSaved(false);
    update(fn);
  };
  const loadTypes = Object.keys(plan.progression.incrementsKg);

  const setImage = async (index: 0 | 1, file: File | undefined) => {
    if (!file) return;
    const blob = await compressImage(file, 1000);
    set((d) => {
      const images = [...(d.customImages ?? [])];
      images[index] = blob;
      if (index === 1 && !images[0]) images[0] = blob;
      return { ...d, customImages: images };
    });
  };

  const save = async () => {
    const d = current();
    const { customImages, source, userModified, active, ...rest } = d;
    const candidate = {
      ...rest,
      id: isNew
        ? slugId(
            d.name,
            exercises.map((e) => e.id),
          )
        : d.id,
      name: d.name.trim(),
      imageSourceId: d.imageSourceId?.trim() ? d.imageSourceId.trim() : null,
      primaryMuscles: trimList(d.primaryMuscles),
      cues: linesToList(d.cues.join('\n')),
      backNote: d.backNote?.trim() ? d.backNote.trim() : null,
    };
    const result = exerciseSeedSchema.safeParse(candidate);
    if (!result.success) {
      setError(z.prettifyError(result.error));
      return;
    }
    const images = (customImages ?? []).filter(Boolean);
    const next: Exercise = {
      ...result.data,
      source,
      userModified,
      active,
      ...(images.length ? { customImages: images } : {}),
    };
    await saveEntity(db, 'exercises', next);
    setError(null);
    setSaved(true);
    markClean(next);
    if (isNew)
      navigate(`${BACK}/${encodeURIComponent(next.id)}`, { replace: true, state: { saved: true } });
  };

  return (
    <FormPage title={isNew ? 'Ny øvelse' : draft.name || 'Øvelse'} back={BACK}>
      <Card className="flex flex-col gap-4">
        <Field label="Navn" htmlFor="ex-name">
          <TextInput
            id="ex-name"
            value={draft.name}
            onChange={(e) => set((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field label="Lasttype" htmlFor="ex-load" hint="Bestemmer hvor mye vekten økes med.">
          <SelectInput
            id="ex-load"
            value={draft.loadType}
            onChange={(e) => set((d) => ({ ...d, loadType: e.target.value }))}
          >
            {loadTypes.map((t) => (
              <option key={t} value={t}>
                {LOAD_LABELS[t] ?? t} (+{plan.progression.incrementsKg[t]} kg)
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Muskler (kommaseparert)" htmlFor="ex-muscles">
          <TextInput
            id="ex-muscles"
            value={draft.primaryMuscles.join(',')}
            onChange={(e) => set((d) => ({ ...d, primaryMuscles: e.target.value.split(',') }))}
          />
        </Field>
        <Field label="Tips (ett per linje)" htmlFor="ex-cues">
          <TextArea
            id="ex-cues"
            rows={3}
            value={draft.cues.join('\n')}
            onChange={(e) => set((d) => ({ ...d, cues: e.target.value.split('\n') }))}
          />
        </Field>
        <Field label="Alternativ øvelse" htmlFor="ex-alt">
          <SelectInput
            id="ex-alt"
            value={draft.alternative ?? ''}
            onChange={(e) => set((d) => ({ ...d, alternative: e.target.value || null }))}
          >
            <option value="">Ingen</option>
            {exercises
              .filter((e) => e.id !== draft.id && (e.active || e.id === draft.alternative))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </SelectInput>
        </Field>
        <Checkbox
          checked={draft.perSide}
          onChange={(v) => set((d) => ({ ...d, perSide: v }))}
          label="Per side"
        />
        <Field label="Ryggnotat" htmlFor="ex-back">
          <TextInput
            id="ex-back"
            value={draft.backNote ?? ''}
            onChange={(e) => set((d) => ({ ...d, backNote: e.target.value }))}
          />
        </Field>
      </Card>

      <SectionTitle>Bilder</SectionTitle>
      <Card className="flex flex-col gap-3">
        <ExerciseImagePair subject={draft} />
        <Field
          label="Bilde-ID fra Free Exercise DB"
          htmlFor="ex-img"
          hint="F.eks. Barbell_Bench_Press_-_Medium_Grip. Bilder som ikke ligger i appen hentes fra nett første gang."
        >
          <TextInput
            id="ex-img"
            value={draft.imageSourceId ?? ''}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => set((d) => ({ ...d, imageSourceId: e.target.value }))}
          />
        </Field>
        <p className="text-sm text-muted">… eller bruk egne bilder (lagres bare på telefonen):</p>
        <div className="grid grid-cols-2 gap-2">
          {([0, 1] as const).map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <Button variant="secondary" size="sm" onClick={() => fileRefs[i].current?.click()}>
                <IconCamera size={18} /> {i === 0 ? 'Startbilde' : 'Sluttbilde'}
              </Button>
              <input
                ref={fileRefs[i]}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-label={i === 0 ? 'Eget startbilde' : 'Eget sluttbilde'}
                onChange={(e) => void setImage(i, e.target.files?.[0])}
              />
            </div>
          ))}
        </div>
        {(draft.customImages?.length ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set((d) => ({ ...d, customImages: undefined }))}
          >
            <IconTrash size={18} /> Fjern egne bilder
          </Button>
        )}
      </Card>

      <SaveBar onSave={() => void save()} error={error} saved={saved} dirty={dirty} />
      {!isNew && (
        <EntityActions
          table="exercises"
          id={stored.id}
          entity={stored}
          onReset={() => markClean()}
        />
      )}
    </FormPage>
  );
}
