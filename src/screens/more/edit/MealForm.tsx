import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { IconPlus, IconTrash } from '../../../components/icons';
import {
  Button,
  Card,
  Checkbox,
  Field,
  IconButton,
  NumberField,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from '../../../components/ui';
import { nextMealId, saveEntity } from '../../../data/editOps';
import { mealSeedSchema } from '../../../data/schema';
import { db } from '../../../db';
import { useDraft } from '../../../hooks/useDraft';
import { fmtNok } from '../../../lib/format';
import { SLOT_LABELS } from '../../../lib/labels';
import { dislikedHits, mealTotals } from '../../../lib/nutrition';
import { linesToList } from '../../../lib/util';
import { useAppData } from '../../../state/appData';
import { SLOTS, type Meal, type Slot } from '../../../types';
import { DislikeWarning, MacroGrid } from '../../food/MealBits';
import { EntityActions } from './EntityActions';
import { FormPage, NotFound, SaveBar } from './FormBits';

const BACK = '/mer/data/maltider';

function blankMeal(slot: Slot): Meal {
  return {
    id: '',
    slot,
    name: '',
    description: '',
    isMealPrep: false,
    batchPortions: 1,
    ingredientsPerPortion: [],
    servingNote: null,
    steps: [],
    tags: [],
    active: true,
    source: 'user',
    userModified: false,
  };
}

export function MealForm() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const isNew = id === 'ny';
  const { mealsById } = useAppData();
  const stored = isNew ? undefined : mealsById.get(id);
  const [blank] = useState(() => blankMeal((params.get('slot') as Slot) ?? 'lunsj'));
  if (!isNew && !stored) return <NotFound back={BACK} />;
  return <MealEditor key={id} isNew={isNew} stored={stored ?? blank} />;
}

function MealEditor({ isNew, stored }: { isNew: boolean; stored: Meal }) {
  const navigate = useNavigate();
  const { ingredients, ingredientsById, meals, settings } = useAppData();
  const { draft, update, markClean, current, dirty } = useDraft(stored);
  const [error, setError] = useState<string | null>(null);
  // Etter at et nytt element er lagret, åpnes det under sin nye adresse.
  const location = useLocation();
  const [saved, setSaved] = useState(() => !!(location.state as { saved?: boolean } | null)?.saved);
  const set = (fn: (d: Meal) => Meal) => {
    setSaved(false);
    update(fn);
  };

  const totals = mealTotals(draft, ingredientsById);
  const hits = dislikedHits(draft, ingredientsById, settings.dislikedFoods);
  const options = ingredients.filter(
    (i) => i.active || draft.ingredientsPerPortion.some((x) => x.ingredientId === i.id),
  );

  const save = async () => {
    const d = current();
    const candidate = {
      ...d,
      id: isNew
        ? nextMealId(
            d.slot,
            meals.map((m) => m.id),
          )
        : d.id,
      name: d.name.trim(),
      steps: linesToList(d.steps.join('\n')),
      servingNote: d.servingNote?.trim() ? d.servingNote.trim() : null,
    };
    const result = mealSeedSchema.safeParse(candidate);
    if (!result.success) {
      setError(z.prettifyError(result.error));
      return;
    }
    const next: Meal = {
      ...result.data,
      source: d.source,
      userModified: d.userModified,
      active: d.active,
    };
    await saveEntity(db, 'meals', next);
    setError(null);
    setSaved(true);
    markClean(next);
    if (isNew)
      navigate(`${BACK}/${encodeURIComponent(next.id)}`, { replace: true, state: { saved: true } });
  };

  return (
    <FormPage title={isNew ? 'Nytt måltid' : `${draft.id} ${draft.name}`} back={BACK}>
      <Card className="flex flex-col gap-4">
        <Field label="Navn" htmlFor="meal-name">
          <TextInput
            id="meal-name"
            value={draft.name}
            onChange={(e) => set((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field
          label="Måltid"
          htmlFor="meal-slot"
          hint={isNew ? 'ID lages automatisk (F, L, D eller K + nummer).' : `ID: ${draft.id}`}
        >
          <SelectInput
            id="meal-slot"
            value={draft.slot}
            onChange={(e) => set((d) => ({ ...d, slot: e.target.value as Slot }))}
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_LABELS[s]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Beskrivelse" htmlFor="meal-desc">
          <TextInput
            id="meal-desc"
            value={draft.description}
            onChange={(e) => set((d) => ({ ...d, description: e.target.value }))}
          />
        </Field>
        <Checkbox
          checked={draft.isMealPrep}
          onChange={(v) =>
            set((d) => ({
              ...d,
              isMealPrep: v,
              batchPortions: v ? Math.max(d.batchPortions, 4) : 1,
            }))
          }
          label="Meal prep"
          description="Lages i batch og vises i meal prep og handlelista."
        />
        {draft.isMealPrep && (
          <Field label="Porsjoner per batch">
            <NumberField
              label="Porsjoner per batch"
              integer
              min={1}
              max={20}
              value={draft.batchPortions}
              onCommit={(v) => set((d) => ({ ...d, batchPortions: v ?? 1 }))}
            />
          </Field>
        )}
      </Card>

      <SectionTitle>Per porsjon (live)</SectionTitle>
      <MacroGrid totals={totals} />
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        Pris {fmtNok(totals.priceNok)}
        {draft.batchPortions > 1 && ` · batch ${fmtNok(totals.priceNok * draft.batchPortions)}`}
        <DislikeWarning hits={hits} />
      </p>

      <SectionTitle>Ingredienser per porsjon</SectionTitle>
      <Card className="flex flex-col gap-3">
        {draft.ingredientsPerPortion.length === 0 && (
          <p className="text-sm text-muted">Ingen ingredienser ennå.</p>
        )}
        {draft.ingredientsPerPortion.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_6.5rem_auto] items-end gap-2">
            <Field label={`Ingrediens ${i + 1}`} htmlFor={`meal-ing-${i}`}>
              <SelectInput
                id={`meal-ing-${i}`}
                value={item.ingredientId}
                onChange={(e) =>
                  set((d) => ({
                    ...d,
                    ingredientsPerPortion: d.ingredientsPerPortion.map((x, j) =>
                      j === i ? { ...x, ingredientId: e.target.value } : x,
                    ),
                  }))
                }
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Gram">
              <NumberField
                label={`Gram ingrediens ${i + 1}`}
                value={item.grams}
                decimals={1}
                min={0.1}
                onCommit={(v) =>
                  set((d) => ({
                    ...d,
                    ingredientsPerPortion: d.ingredientsPerPortion.map((x, j) =>
                      j === i ? { ...x, grams: v ?? 0 } : x,
                    ),
                  }))
                }
              />
            </Field>
            <IconButton
              label={`Fjern ingrediens ${i + 1}`}
              onClick={() =>
                set((d) => ({
                  ...d,
                  ingredientsPerPortion: d.ingredientsPerPortion.filter((_, j) => j !== i),
                }))
              }
            >
              <IconTrash size={20} />
            </IconButton>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            set((d) => ({
              ...d,
              ingredientsPerPortion: [
                ...d.ingredientsPerPortion,
                { ingredientId: options[0]?.id ?? '', grams: 100 },
              ],
            }))
          }
        >
          <IconPlus size={18} /> Legg til ingrediens
        </Button>
      </Card>

      <SectionTitle>Oppskrift</SectionTitle>
      <Card className="flex flex-col gap-3">
        <Field label="Steg (ett per linje)" htmlFor="meal-steps">
          <TextArea
            id="meal-steps"
            rows={6}
            value={draft.steps.join('\n')}
            onChange={(e) => set((d) => ({ ...d, steps: e.target.value.split('\n') }))}
          />
        </Field>
        <Field label="Merknad ved servering" htmlFor="meal-serving">
          <TextInput
            id="meal-serving"
            value={draft.servingNote ?? ''}
            onChange={(e) => set((d) => ({ ...d, servingNote: e.target.value }))}
          />
        </Field>
      </Card>

      <SaveBar onSave={() => void save()} error={error} saved={saved} dirty={dirty} />
      {!isNew && (
        <EntityActions table="meals" id={stored.id} entity={stored} onReset={() => markClean()} />
      )}
    </FormPage>
  );
}
