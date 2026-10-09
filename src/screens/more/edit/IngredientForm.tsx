import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  Card,
  Checkbox,
  Field,
  NumberField,
  SectionTitle,
  TextInput,
} from '../../../components/ui';
import { saveEntity, slugId } from '../../../data/editOps';
import { ingredientSeedSchema } from '../../../data/schema';
import { db } from '../../../db';
import { useDraft } from '../../../hooks/useDraft';
import { fmtNok, formatNumber } from '../../../lib/format';
import { useAppData } from '../../../state/appData';
import type { Ingredient } from '../../../types';
import { EntityActions } from './EntityActions';
import { trimList } from '../../../lib/util';
import { FormPage, NotFound, SaveBar } from './FormBits';

const BACK = '/mer/data/ingredienser';

function blankIngredient(): Ingredient {
  return {
    id: '',
    name: '',
    per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    pack: { label: '', grams: 1000, priceNok: 0, store: '', priceSource: 'egen' },
    category: '',
    dislikeTags: [],
    isPantryStaple: false,
    source: 'user',
    userModified: false,
    active: true,
  };
}

export function IngredientForm() {
  const { id = '' } = useParams();
  const isNew = id === 'ny';
  const { ingredientsById, ingredients, settings } = useAppData();
  const stored = isNew ? undefined : ingredientsById.get(id);
  if (!isNew && !stored) return <NotFound back={BACK} />;
  return (
    <IngredientEditor
      key={id}
      isNew={isNew}
      stored={stored ?? blankIngredient()}
      allIds={ingredients.map((i) => i.id)}
      categories={[...new Set(ingredients.map((i) => i.category))].sort()}
      stores={settings.stores}
    />
  );
}

function IngredientEditor({
  isNew,
  stored,
  allIds,
  categories,
  stores,
}: {
  isNew: boolean;
  stored: Ingredient;
  allIds: string[];
  categories: string[];
  stores: string[];
}) {
  const navigate = useNavigate();
  const { draft, update, markClean, current, dirty } = useDraft(stored);
  const [error, setError] = useState<string | null>(null);
  // Etter at et nytt element er lagret, åpnes det under sin nye adresse.
  const location = useLocation();
  const [saved, setSaved] = useState(() => !!(location.state as { saved?: boolean } | null)?.saved);

  const set = (fn: (d: Ingredient) => Ingredient) => {
    setSaved(false);
    update(fn);
  };

  const save = async () => {
    const d = current();
    const candidate = {
      ...d,
      id: isNew ? slugId(d.name, allIds) : d.id,
      dislikeTags: trimList(d.dislikeTags),
      unit:
        d.unit && d.unit.name.trim()
          ? { name: d.unit.name.trim(), grams: d.unit.grams }
          : undefined,
    };
    const result = ingredientSeedSchema.safeParse(candidate);
    if (!result.success) {
      setError(z.prettifyError(result.error));
      return;
    }
    const next: Ingredient = {
      ...result.data,
      source: d.source,
      userModified: d.userModified,
      active: d.active,
    };
    await saveEntity(db, 'ingredients', next);
    setError(null);
    setSaved(true);
    markClean(next);
    if (isNew)
      navigate(`${BACK}/${encodeURIComponent(next.id)}`, { replace: true, state: { saved: true } });
  };

  const pricePerKg = draft.pack.grams > 0 ? (draft.pack.priceNok / draft.pack.grams) * 1000 : 0;

  return (
    <FormPage title={isNew ? 'Ny ingrediens' : draft.name || 'Ingrediens'} back={BACK}>
      <Card className="flex flex-col gap-4">
        <Field label="Navn" htmlFor="ing-name">
          <TextInput
            id="ing-name"
            value={draft.name}
            onChange={(e) => set((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field label="Kategori" htmlFor="ing-cat" hint="Brukes til å gruppere handlelista.">
          <TextInput
            id="ing-cat"
            list="ing-categories"
            value={draft.category}
            onChange={(e) => set((d) => ({ ...d, category: e.target.value }))}
          />
          <datalist id="ing-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </Card>

      <SectionTitle>Per 100 g</SectionTitle>
      <Card className="grid grid-cols-2 gap-3">
        {(
          [
            ['kcal', 'Kcal'],
            ['protein', 'Protein (g)'],
            ['carbs', 'Karbo (g)'],
            ['fat', 'Fett (g)'],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <NumberField
              label={label}
              value={draft.per100g[key]}
              decimals={1}
              min={0}
              onCommit={(v) => set((d) => ({ ...d, per100g: { ...d.per100g, [key]: v ?? 0 } }))}
            />
          </Field>
        ))}
      </Card>

      <SectionTitle>Pakning og pris</SectionTitle>
      <Card className="flex flex-col gap-3">
        <Field label="Pakning" htmlFor="ing-pack">
          <TextInput
            id="ing-pack"
            value={draft.pack.label}
            placeholder="F.eks. Kyllingfilet 1,4 kg"
            onChange={(e) => set((d) => ({ ...d, pack: { ...d.pack, label: e.target.value } }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gram i pakken">
            <NumberField
              label="Gram i pakken"
              value={draft.pack.grams}
              decimals={0}
              min={1}
              suffix="g"
              onCommit={(v) => set((d) => ({ ...d, pack: { ...d.pack, grams: v ?? 0 } }))}
            />
          </Field>
          <Field label="Pris">
            <NumberField
              label="Pris"
              value={draft.pack.priceNok}
              decimals={2}
              min={0}
              suffix="kr"
              onCommit={(v) => set((d) => ({ ...d, pack: { ...d.pack, priceNok: v ?? 0 } }))}
            />
          </Field>
        </div>
        <p className="text-xs text-muted">≈ {fmtNok(pricePerKg)} per kg</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Butikk" htmlFor="ing-store">
            <TextInput
              id="ing-store"
              list="ing-stores"
              value={draft.pack.store}
              onChange={(e) => set((d) => ({ ...d, pack: { ...d.pack, store: e.target.value } }))}
            />
            <datalist id="ing-stores">
              {stores.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Priskilde" htmlFor="ing-source">
            <TextInput
              id="ing-source"
              value={draft.pack.priceSource}
              onChange={(e) =>
                set((d) => ({ ...d, pack: { ...d.pack, priceSource: e.target.value } }))
              }
            />
          </Field>
        </div>
      </Card>

      <SectionTitle>Enhet (valgfritt)</SectionTitle>
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Navn på enhet" htmlFor="ing-unit" hint="F.eks. stk, skive, ss">
            <TextInput
              id="ing-unit"
              value={draft.unit?.name ?? ''}
              onChange={(e) =>
                set((d) => ({ ...d, unit: { name: e.target.value, grams: d.unit?.grams ?? 100 } }))
              }
            />
          </Field>
          <Field label="Gram per enhet">
            <NumberField
              label="Gram per enhet"
              value={draft.unit?.grams ?? null}
              decimals={1}
              min={0.1}
              onCommit={(v) =>
                set((d) => ({ ...d, unit: { name: d.unit?.name ?? '', grams: v ?? 1 } }))
              }
            />
          </Field>
        </div>
        <Checkbox
          checked={draft.isPantryStaple}
          onChange={(v) => set((d) => ({ ...d, isPantryStaple: v }))}
          label="Basisvare"
          description="Vises bare med forbruk i handlelista, uten pakker og pris."
        />
        <Field label="Stikkord for mislikt mat (kommaseparert)" htmlFor="ing-tags">
          <TextInput
            id="ing-tags"
            value={draft.dislikeTags.join(',')}
            onChange={(e) => set((d) => ({ ...d, dislikeTags: e.target.value.split(',') }))}
          />
        </Field>
        <p className="text-xs text-muted">
          100 g = {formatNumber(draft.per100g.kcal)} kcal, {formatNumber(draft.per100g.protein, 1)}{' '}
          g protein.
        </p>
      </Card>

      <SaveBar onSave={() => void save()} error={error} saved={saved} dirty={dirty} />
      {!isNew && (
        <EntityActions
          table="ingredients"
          id={stored.id}
          entity={stored}
          onReset={() => markClean()}
        />
      )}
    </FormPage>
  );
}
