import { useState } from 'react';
import {
  Button,
  Card,
  Field,
  InlineConfirm,
  NumberField,
  Page,
  PageHeader,
  SectionTitle,
  Segmented,
  SelectInput,
  TextInput,
} from '../../components/ui';
import { settingsFromSeed } from '../../data/seedSync';
import { db } from '../../db';
import { isValidISODate, weekdayName } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { capitalize, SLOT_LABELS } from '../../lib/labels';
import { stableStringify } from '../../lib/util';
import { useAppData } from '../../state/appData';
import { SLOTS, WEEKDAY_KEYS, type AppSettings, type NumRange, type ThemePref } from '../../types';

/** Feltene som kommer fra seed – endres de, røres de ikke av «Oppdater plan». */
const SEED_KEYS: (keyof AppSettings)[] = [
  'startWeightKg',
  'startWaistCm',
  'goalWeightRangeKg',
  'goalWaistRangeCm',
  'kcalTolerance',
  'kcalFloor',
  'proteinTargetG',
  'plannedLossKgPerWeek',
  'weeklySchedule',
  'dislikedFoods',
];

export function SettingsScreen() {
  const { settings, sessions, meals, seed, plan } = useAppData();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disliked, setDisliked] = useState(settings.dislikedFoods.join(', '));

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const setRange = (
    key: 'goalWeightRangeKg' | 'goalWaistRangeCm' | 'proteinTargetG',
    i: 0 | 1,
    v: number | null,
  ) => {
    if (v === null) return;
    const next = [...draft[key]] as NumRange;
    next[i] = v;
    set(key, next);
  };

  const save = async () => {
    const next: AppSettings = {
      ...draft,
      dislikedFoods: disliked
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (!isValidISODate(next.startDate)) {
      setError('Ugyldig startdato.');
      return;
    }
    if (next.currentKcalTarget < next.kcalFloor) {
      setError(`Kcal-målet kan ikke være under gulvet (${formatNumber(next.kcalFloor)} kcal).`);
      return;
    }
    const seedChanged = SEED_KEYS.some(
      (k) => stableStringify(next[k]) !== stableStringify(settings[k]),
    );
    // Velger Simen startdato selv, regnes planen som startet (og datoen beholdes ved plan-oppdatering).
    const startChanged = next.startDate !== settings.startDate;
    await db.settings.put({
      ...next,
      planStarted: settings.planStarted || startChanged,
      userModified: settings.userModified || seedChanged,
    });
    setError(null);
    setSaved(true);
  };

  const rangeFields = (
    label: string,
    key: 'goalWeightRangeKg' | 'goalWaistRangeCm' | 'proteinTargetG',
    suffix: string,
    decimals = 1,
  ) => (
    <Field label={label}>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={`${label} fra`}
          value={draft[key][0]}
          decimals={decimals}
          suffix={suffix}
          onCommit={(v) => setRange(key, 0, v)}
        />
        <NumberField
          label={`${label} til`}
          value={draft[key][1]}
          decimals={decimals}
          suffix={suffix}
          onCommit={(v) => setRange(key, 1, v)}
        />
      </div>
    </Field>
  );

  return (
    <Page>
      <PageHeader title="Innstillinger" back="/mer" />

      <Card className="flex flex-col gap-4">
        <Field
          label="Startdato"
          htmlFor="startDate"
          hint={
            settings.planStarted
              ? `Uke 1 begynte denne dagen. Planen varer i ${draft.weeks} uker.`
              : 'Ikke startet ennå. Trykk «Start nå» på I dag, eller velg en dato her.'
          }
        >
          <TextInput
            id="startDate"
            type="date"
            value={draft.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Startvekt">
            <NumberField
              label="Startvekt"
              value={draft.startWeightKg}
              decimals={1}
              suffix="kg"
              onCommit={(v) => v !== null && set('startWeightKg', v)}
            />
          </Field>
          <Field label="Start livvidde">
            <NumberField
              label="Start livvidde"
              value={draft.startWaistCm}
              decimals={1}
              suffix="cm"
              onCommit={(v) => v !== null && set('startWaistCm', v)}
            />
          </Field>
        </div>
        {rangeFields('Målvekt', 'goalWeightRangeKg', 'kg')}
        {rangeFields('Mål livvidde', 'goalWaistRangeCm', 'cm')}
        <Field label="Planlagt tap per uke">
          <NumberField
            label="Planlagt tap per uke"
            value={draft.plannedLossKgPerWeek}
            decimals={2}
            suffix="kg"
            onCommit={(v) => v !== null && set('plannedLossKgPerWeek', v)}
          />
        </Field>
      </Card>

      <SectionTitle>Kalorier og protein</SectionTitle>
      <Card className="flex flex-col gap-4">
        <Field
          label="Kcal-mål nå"
          hint={`Fra planen: ${formatNumber(draft.kcalTarget)} kcal. Godtatte justeringer endrer dette.`}
        >
          <NumberField
            label="Kcal-mål nå"
            integer
            value={draft.currentKcalTarget}
            suffix="kcal"
            onCommit={(v) => v !== null && set('currentKcalTarget', v)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Toleranse (±)">
            <NumberField
              label="Toleranse"
              integer
              value={draft.kcalTolerance}
              suffix="kcal"
              onCommit={(v) => v !== null && set('kcalTolerance', v)}
            />
          </Field>
          <Field label="Gulv">
            <NumberField
              label="Kcal-gulv"
              integer
              value={draft.kcalFloor}
              suffix="kcal"
              onCommit={(v) => v !== null && set('kcalFloor', v)}
            />
          </Field>
        </div>
        {rangeFields('Protein', 'proteinTargetG', 'g', 0)}
        <Field label="Ekstra skritt per dag (fra justeringer)">
          <NumberField
            label="Ekstra skritt"
            integer
            value={draft.stepsBonus}
            onCommit={(v) => v !== null && set('stepsBonus', v)}
          />
        </Field>
      </Card>

      <SectionTitle>Ukeplan</SectionTitle>
      <Card className="flex flex-col gap-3">
        {WEEKDAY_KEYS.map((day) => (
          <div key={day} className="grid grid-cols-[6rem_1fr] items-center gap-2">
            <label htmlFor={`day-${day}`} className="font-medium">
              {capitalize(weekdayName(Number(day)))}
            </label>
            <SelectInput
              id={`day-${day}`}
              value={draft.weeklySchedule[day]}
              onChange={(e) =>
                set('weeklySchedule', { ...draft.weeklySchedule, [day]: e.target.value })
              }
            >
              <option value="hvile">Hvile</option>
              {sessions
                .filter((s) => s.active || s.id === draft.weeklySchedule[day])
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </SelectInput>
          </div>
        ))}
      </Card>

      <SectionTitle>Standardmåltider</SectionTitle>
      <Card className="flex flex-col gap-3">
        {SLOTS.map((slot) => (
          <div key={slot} className="grid grid-cols-[6rem_1fr] items-center gap-2">
            <label htmlFor={`std-${slot}`} className="font-medium">
              {SLOT_LABELS[slot]}
            </label>
            <SelectInput
              id={`std-${slot}`}
              value={draft.standardMeals[slot]}
              onChange={(e) =>
                set('standardMeals', { ...draft.standardMeals, [slot]: e.target.value })
              }
            >
              {meals
                .filter((m) => m.slot === slot && (m.active || m.id === draft.standardMeals[slot]))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} {m.name}
                  </option>
                ))}
            </SelectInput>
          </div>
        ))}
        <p className="text-xs text-muted">
          Lunsj og middag følger meal prep-rotasjonen. Disse brukes når rotasjonen mangler.
        </p>
        <Field label="Mat du ikke liker (kommaseparert)" htmlFor="disliked">
          <TextInput
            id="disliked"
            value={disliked}
            onChange={(e) => {
              setSaved(false);
              setDisliked(e.target.value);
            }}
          />
        </Field>
      </Card>

      <SectionTitle>Utseende</SectionTitle>
      <Card>
        <Segmented<ThemePref>
          label="Tema"
          value={draft.theme}
          onChange={(v) => {
            set('theme', v);
            void db.settings.update('app', { theme: v });
          }}
          options={[
            { value: 'dark', label: 'Mørkt' },
            { value: 'light', label: 'Lyst' },
            { value: 'system', label: 'Følg systemet' },
          ]}
        />
      </Card>

      <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 mt-6 flex flex-col gap-2 rounded-2xl bg-bg/90 py-2 backdrop-blur">
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-good" role="status">
            Lagret.
          </p>
        )}
        <Button size="lg" block onClick={() => void save()}>
          Lagre innstillinger
        </Button>
      </div>

      <div className="mt-6">
        <InlineConfirm
          label="Tilbakestill innstillinger til planen"
          message="Mål, ukeplan og standardmåltider settes tilbake til seed-fila. Startdatoen og godtatte justeringer beholdes."
          confirmLabel="Tilbakestill"
          variant="primary"
          onConfirm={async () => {
            const fresh = settingsFromSeed(seed);
            const adjustments = await db.adjustments.toArray();
            const next: AppSettings = {
              ...fresh,
              currentKcalTarget:
                fresh.kcalTarget + adjustments.reduce((n, a) => n + a.kcalDelta, 0),
              stepsBonus: adjustments.reduce((n, a) => n + a.stepsDelta, 0),
              weekMealChoices: settings.weekMealChoices,
              startDate: settings.planStarted ? settings.startDate : fresh.startDate,
              planStarted: settings.planStarted,
              theme: settings.theme,
            };
            await db.settings.put(next);
            setDraft(next);
            setDisliked(next.dislikedFoods.join(', '));
            setSaved(true);
          }}
        />
        <p className="mt-2 text-xs text-muted">Plan: {plan.generatedFrom}</p>
      </div>
    </Page>
  );
}
