import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExerciseThumb } from '../../components/ExerciseImage';
import { IconCheck, IconChevronLeft, IconPlus, IconX } from '../../components/icons';
import { Stepper } from '../../components/Stepper';
import {
  Button,
  Card,
  Checkbox,
  Field,
  IconButton,
  NumberField,
  Page,
  Segmented,
  SelectInput,
  TextInput,
} from '../../components/ui';
import { saveSetup, skipSetup } from '../../data/setupOps';
import { db } from '../../db';
import { WEEKDAY_LETTERS } from '../../lib/calendar';
import { cx } from '../../lib/cx';
import { weekdayName } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { capitalize } from '../../lib/labels';
import { MAX_WEEKS, MIN_WEEKS, phasesForWeeks } from '../../lib/phases';
import {
  ACTIVITY_LEVELS,
  computeTargets,
  dailyStepGoal,
  PACE_OPTIONS,
  portionScaleFor,
  suggestWeeks,
  type ActivityLevel,
  type Sex,
  type SetupAnswers,
} from '../../lib/setup';
import { useAppData } from '../../state/appData';
import { WEEKDAY_KEYS, type AppSettings, type Session, type WeekdayKey } from '../../types';

type StepId = 'velkommen' | 'deg' | 'mal' | 'hverdag' | 'trening' | 'mer' | 'oppsummering';
const STEPS: StepId[] = ['deg', 'mal', 'hverdag', 'trening', 'mer', 'oppsummering'];

const TITLES: Record<StepId, { title: string; subtitle: string }> = {
  velkommen: { title: 'Velkommen til Cut', subtitle: '' },
  deg: { title: 'Om deg', subtitle: 'Brukes til å regne ut hvor mye du forbrenner.' },
  mal: { title: 'Mål og tempo', subtitle: 'Hvor du vil, hvor fort og hvor lenge.' },
  hverdag: { title: 'Hverdagen din', subtitle: 'Aktivitet utenom treningen og skrittmål.' },
  trening: { title: 'Trening', subtitle: 'Velg treningsdager, økter og øvelser.' },
  mer: { title: 'Rygg og mat', subtitle: 'Det siste før planen er klar.' },
  oppsummering: { title: 'Planen din', subtitle: 'Se over. Alt kan endres senere.' },
};

interface Draft {
  name: string;
  sex: Sex;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  goalKg: number | null;
  pace: number;
  weeks: number;
  /** Lengden er valgt selv (da følger den ikke forslaget lenger) */
  weeksTouched: boolean;
  activity: ActivityLevel;
  steps: number;
  schedule: Record<WeekdayKey, string | null>;
  exercises: Record<string, string[]>;
  backCare: boolean;
  disliked: string;
  kcalOverride: number | null;
}

function initialDraft(settings: AppSettings, sessions: Session[], rerun: boolean): Draft {
  const schedule = Object.fromEntries(
    WEEKDAY_KEYS.map((d) => {
      const v = settings.weeklySchedule[d];
      return [d, v && v !== 'hvile' ? v : null];
    }),
  ) as Record<WeekdayKey, string | null>;
  const exercises = Object.fromEntries(
    sessions.map((s) => [s.id, s.exercises.map((p) => p.exerciseId)]),
  );
  const common = { schedule, exercises, kcalOverride: null };
  if (rerun) {
    const goal = (settings.goalWeightRangeKg[0] + settings.goalWeightRangeKg[1]) / 2;
    return {
      ...common,
      name: settings.person.name,
      sex: settings.person.sex === 'kvinne' ? 'kvinne' : 'mann',
      age: settings.person.age,
      heightCm: settings.person.heightCm,
      weightKg: settings.startWeightKg,
      waistCm: settings.startWaistCm,
      goalKg: goal,
      pace: settings.plannedLossKgPerWeek,
      weeks: settings.weeks,
      weeksTouched: true,
      activity: settings.activityLevel ?? 'middels',
      steps: dailyStepGoal(settings.steps),
      backCare: settings.backCare !== false,
      disliked: settings.dislikedFoods.join(', '),
    };
  }
  return {
    ...common,
    name: '',
    sex: 'mann',
    age: null,
    heightCm: null,
    weightKg: null,
    waistCm: null,
    goalKg: null,
    pace: 0.5,
    weeks: 12,
    weeksTouched: false,
    activity: 'middels',
    steps: 8000,
    backCare: false,
    disliked: '',
  };
}

function validate(step: StepId, d: Draft): string | null {
  const between = (v: number | null, min: number, max: number) =>
    v !== null && v >= min && v <= max;
  if (step === 'deg') {
    if (!between(d.age, 14, 100)) return 'Skriv inn alderen din (14–100 år).';
    if (!between(d.heightCm, 120, 230)) return 'Skriv inn høyden din i cm (120–230).';
    if (!between(d.weightKg, 35, 250)) return 'Skriv inn vekta di i kg (35–250).';
    if (!between(d.waistCm, 40, 200)) return 'Skriv inn livvidden din i cm (40–200).';
  }
  if (step === 'mal') {
    if (d.goalKg === null) return 'Skriv inn målvekta di.';
    if (d.weightKg !== null && d.goalKg >= d.weightKg)
      return 'Målvekta må være lavere enn vekta du har nå.';
    if (d.goalKg < 35) return 'Målvekta er for lav.';
  }
  if (step === 'trening') {
    const used = [...new Set(Object.values(d.schedule).filter((v): v is string => !!v))];
    if (used.length === 0) return 'Velg minst én treningsdag.';
    if (used.some((id) => (d.exercises[id] ?? []).length === 0))
      return 'Hver økt må ha minst én øvelse.';
  }
  return null;
}

function toAnswers(d: Draft): SetupAnswers {
  return {
    name: d.name,
    sex: d.sex,
    age: d.age ?? 30,
    heightCm: d.heightCm ?? 175,
    weightKg: d.weightKg ?? 80,
    waistCm: d.waistCm ?? 90,
    goalKg: d.goalKg ?? (d.weightKg ?? 80) - 5,
    pace: d.pace,
    weeks: d.weeks,
    activity: d.activity,
    steps: d.steps,
    schedule: d.schedule,
    backCare: d.backCare,
    dislikedFoods: d.disliked
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    kcalOverride: d.kcalOverride,
  };
}

export function SetupScreen() {
  const { settings, sessions, seed } = useAppData();
  const navigate = useNavigate();
  // Allerede satt opp → «Kjør oppsettet på nytt» fra Innstillinger, med det som er valgt nå.
  const rerun = settings.onboarded !== false;
  const [draft, setDraft] = useState(() => initialDraft(settings, sessions, rerun));
  const [step, setStep] = useState<StepId>(rerun ? 'deg' : 'velkommen');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Gå videre først når appen har lest inn at oppsettet er ferdig. Ellers sender
  // appskallet (som fortsatt ser «ikke satt opp») brukeren rett tilbake hit.
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (finished && settings.onboarded !== false) navigate('/', { replace: true });
  }, [finished, settings.onboarded, navigate]);

  const update = (patch: Partial<Draft>) => {
    setError(null);
    setDraft((d) => {
      const next = { ...d, ...patch };
      // Lengden følger forslaget til den er valgt selv.
      if (!next.weeksTouched && next.weightKg && next.goalKg && next.goalKg < next.weightKg) {
        next.weeks = suggestWeeks(next.weightKg, next.goalKg, next.pace);
      }
      return next;
    });
  };

  const index = STEPS.indexOf(step);
  const go = (to: StepId) => {
    setError(null);
    setStep(to);
    window.scrollTo({ top: 0 });
  };
  const next = async () => {
    const problem = validate(step, draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (step === 'oppsummering') {
      setBusy(true);
      await saveSetup(db, seed, toAnswers(draft), draft.exercises);
      setFinished(true);
      return;
    }
    go(STEPS[index + 1]);
  };
  if (step === 'velkommen') {
    return (
      <Welcome
        onStart={() => go('deg')}
        onRestore={() => navigate('/mer/backup')}
        onSkip={async () => {
          await skipSetup(db);
          setFinished(true);
        }}
      />
    );
  }

  const { title, subtitle } = TITLES[step];
  return (
    <div className="safe-top min-h-dvh">
      <Page key={step} className="pb-36">
        <header className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">
              Steg {index + 1} av {STEPS.length}
            </p>
            {rerun && (
              <Button size="sm" variant="ghost" onClick={() => navigate('/mer/innstillinger')}>
                Avbryt
              </Button>
            )}
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-label="Fremdrift i oppsettet"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <h1 className="mt-4 text-[28px] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
          <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
        </header>

        {step === 'deg' && <AboutStep draft={draft} update={update} />}
        {step === 'mal' && <GoalStep draft={draft} update={update} />}
        {step === 'hverdag' && <EverydayStep draft={draft} update={update} />}
        {step === 'trening' && <TrainingStep draft={draft} update={update} />}
        {step === 'mer' && <BackAndFoodStep draft={draft} update={update} />}
        {step === 'oppsummering' && <SummaryStep draft={draft} update={update} />}
      </Page>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--c-hairline)] bg-bg px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {error && (
            <p className="text-[14px] font-medium text-bad" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {index > 0 || !rerun ? (
              <Button
                variant="secondary"
                size="lg"
                aria-label="Tilbake"
                onClick={() => go(index > 0 ? STEPS[index - 1] : 'velkommen')}
              >
                <IconChevronLeft size={20} />
              </Button>
            ) : null}
            <Button size="lg" className="flex-1" disabled={busy} onClick={() => void next()}>
              {step === 'oppsummering' ? (
                <>
                  <IconCheck size={20} /> Fullfør oppsettet
                </>
              ) : (
                'Neste'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Steg ----------

interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

function Welcome({
  onStart,
  onSkip,
  onRestore,
}: {
  onStart: () => void;
  onSkip: () => void;
  onRestore: () => void;
}) {
  const items = [
    'Mål, tempo og hvor mange uker',
    'Kalorier og protein regnet ut for deg',
    'Treningsdager, økter og øvelser',
  ];
  return (
    <div className="safe-top min-h-dvh">
      <Page className="flex min-h-dvh flex-col justify-center pt-10 pb-10">
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-[18px]"
        />
        <h1 className="mt-6 text-[32px] leading-tight font-bold tracking-[-0.02em]">
          Velkommen til Cut
        </h1>
        <p className="mt-3 text-[17px] leading-snug text-muted">
          Trening, mat og fremgang, uke for uke. Svar på noen spørsmål, så setter appen opp planen
          for deg.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3 text-[16px]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <IconCheck size={16} strokeWidth={2.5} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-2.5">
          <Button size="lg" block onClick={onStart}>
            Sett opp for meg
          </Button>
          <Button size="lg" block variant="ghost" onClick={onSkip}>
            Bruk standardplanen
          </Button>
          <p className="text-center text-[13px] text-muted">
            Standardplanen er 12 uker med 2 400 kcal og fem økter i uka.
          </p>
          <button
            type="button"
            onClick={onRestore}
            className="pressable mt-4 min-h-11 self-center text-[15px] font-medium text-accent"
          >
            Har du en backup? Hent den inn
          </button>
        </div>
      </Page>
    </div>
  );
}

function AboutStep({ draft, update }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-4">
        <Field label="Navn (valgfritt)" htmlFor="setup-name">
          <TextInput
            id="setup-name"
            value={draft.name}
            autoComplete="given-name"
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>
        <Field label="Kjønn" hint="Påvirker utregningen av forbrenningen.">
          <Segmented<Sex>
            label="Kjønn"
            value={draft.sex}
            onChange={(sex) => update({ sex })}
            options={[
              { value: 'mann', label: 'Mann' },
              { value: 'kvinne', label: 'Kvinne' },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Alder">
            <NumberField
              label="Alder"
              integer
              value={draft.age}
              suffix="år"
              onCommit={(age) => update({ age })}
            />
          </Field>
          <Field label="Høyde">
            <NumberField
              label="Høyde"
              integer
              value={draft.heightCm}
              suffix="cm"
              onCommit={(heightCm) => update({ heightCm })}
            />
          </Field>
          <Field label="Vekt nå">
            <NumberField
              label="Vekt nå"
              decimals={1}
              value={draft.weightKg}
              suffix="kg"
              onCommit={(weightKg) => update({ weightKg })}
            />
          </Field>
          <Field label="Livvidde">
            <NumberField
              label="Livvidde"
              decimals={1}
              value={draft.waistCm}
              suffix="cm"
              onCommit={(waistCm) => update({ waistCm })}
            />
          </Field>
        </div>
        <p className="text-[13px] text-muted">
          Livvidde: mål rundt navlen, stående, etter at du har pustet ut.
        </p>
      </Card>
    </div>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'pressable surface flex w-full items-center gap-3 rounded-[20px] p-4 text-left',
        selected && 'shadow-[inset_0_0_0_2px_var(--c-accent)]',
      )}
    >
      <span
        className={cx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-accent text-on-accent' : 'shadow-[inset_0_0_0_2px_var(--c-surface-3)]',
        )}
        aria-hidden="true"
      >
        {selected && <IconCheck size={14} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-[14px] text-muted">{description}</span>
      </span>
    </button>
  );
}

function PhaseList({ weeks }: { weeks: number }) {
  const { phaseTemplate } = useAppData();
  return (
    <ul className="flex flex-col gap-1.5">
      {phasesForWeeks(phaseTemplate, weeks).map((p) => (
        <li key={`${p.name}-${p.weeks[0]}`} className="flex justify-between gap-3 text-[14px]">
          <span>{p.name}</span>
          <span className="num shrink-0 text-muted">
            {p.weeks[0] === p.weeks[1] ? `uke ${p.weeks[0]}` : `uke ${p.weeks[0]}–${p.weeks[1]}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function GoalStep({ draft, update }: StepProps) {
  const weight = draft.weightKg ?? 0;
  const suggested =
    draft.goalKg !== null && draft.goalKg < weight
      ? suggestWeeks(weight, draft.goalKg, draft.pace)
      : null;
  const reached =
    draft.goalKg !== null ? Math.max(draft.goalKg, weight - draft.pace * draft.weeks) : null;
  const paceOptions = PACE_OPTIONS.some((p) => p.value === draft.pace)
    ? PACE_OPTIONS
    : [
        ...PACE_OPTIONS,
        {
          value: draft.pace,
          label: 'Nåværende',
          description: `${formatNumber(draft.pace, 2)} kg i uka.`,
        },
      ];
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <Field label="Målvekt" hint={`Du er ${formatNumber(weight, 1)} kg nå.`}>
          <NumberField
            label="Målvekt"
            decimals={1}
            value={draft.goalKg}
            suffix="kg"
            onCommit={(goalKg) => update({ goalKg })}
          />
        </Field>
      </Card>

      <h2 className="mt-3 px-1 text-[17px] font-semibold">Tempo</h2>
      <div role="radiogroup" aria-label="Tempo" className="flex flex-col gap-2">
        {paceOptions.map((p) => (
          <ChoiceCard
            key={p.value}
            selected={draft.pace === p.value}
            onSelect={() => update({ pace: p.value })}
            title={p.label}
            description={p.description}
          />
        ))}
      </div>

      <h2 className="mt-3 px-1 text-[17px] font-semibold">Hvor lenge</h2>
      <Card className="flex flex-col gap-3">
        <Stepper
          label="Uker"
          value={draft.weeks}
          step={1}
          min={MIN_WEEKS}
          max={MAX_WEEKS}
          decimals={0}
          onChange={(weeks) => update({ weeks, weeksTouched: true })}
        />
        {suggested !== null && suggested !== draft.weeks && (
          <button
            type="button"
            className="pressable self-start text-[14px] font-medium text-accent"
            onClick={() => update({ weeks: suggested, weeksTouched: false })}
          >
            Bruk forslaget: {suggested} uker
          </button>
        )}
        {reached !== null && (
          <p className="text-[15px]">
            Med {formatNumber(draft.pace, 2)} kg i uka er du på ca.{' '}
            <b className="num">{formatNumber(reached, 1)} kg</b> etter {draft.weeks} uker.
          </p>
        )}
        <div className="border-t border-[var(--c-hairline)] pt-3">
          <p className="mb-2 text-[13px] font-medium text-muted">Fasene i planen</p>
          <PhaseList weeks={draft.weeks} />
        </div>
      </Card>
    </div>
  );
}

function EverydayStep({ draft, update }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Aktivitet i hverdagen" className="flex flex-col gap-2">
        {ACTIVITY_LEVELS.map((a) => (
          <ChoiceCard
            key={a.value}
            selected={draft.activity === a.value}
            onSelect={() => update({ activity: a.value })}
            title={a.label}
            description={a.description}
          />
        ))}
      </div>
      <p className="px-1 text-[13px] text-muted">Treningsøktene regnes ikke med her.</p>
      <h2 className="mt-3 px-1 text-[17px] font-semibold">Skritt</h2>
      <Card>
        <Stepper
          label="Skritt per dag"
          value={draft.steps}
          step={500}
          min={3000}
          max={25000}
          decimals={0}
          onChange={(steps) => update({ steps })}
        />
        <p className="mt-2 text-[13px] text-muted">
          Et realistisk mål som du klarer de fleste dager. 8 000–10 000 er vanlig.
        </p>
      </Card>
    </div>
  );
}

function TrainingStep({ draft, update }: StepProps) {
  const { sessions, sessionsById } = useAppData();
  const active = sessions.filter((s) => s.active);
  const used = [...new Set(Object.values(draft.schedule).filter((v): v is string => !!v))];

  const toggleDay = (day: WeekdayKey) => {
    if (draft.schedule[day]) {
      update({ schedule: { ...draft.schedule, [day]: null } });
      return;
    }
    // Ny dag får første økt som ikke er i bruk.
    const free = active.find((s) => !used.includes(s.id)) ?? active[0];
    update({ schedule: { ...draft.schedule, [day]: free?.id ?? null } });
  };
  const setExercises = (sessionId: string, ids: string[]) =>
    update({ exercises: { ...draft.exercises, [sessionId]: ids } });

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="mb-3 text-[13px] font-medium text-muted">Treningsdager</p>
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Treningsdager">
          {WEEKDAY_KEYS.map((day) => {
            const on = !!draft.schedule[day];
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                aria-label={capitalize(weekdayName(Number(day)))}
                onClick={() => toggleDay(day)}
                className={cx(
                  'pressable flex h-12 items-center justify-center rounded-2xl text-[15px] font-semibold',
                  on
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface-2 text-muted shadow-[inset_0_0_0_1px_var(--c-hairline)]',
                )}
              >
                {WEEKDAY_LETTERS[Number(day) - 1]}
              </button>
            );
          })}
        </div>
        {WEEKDAY_KEYS.some((d) => draft.schedule[d]) && (
          <div className="mt-4 flex flex-col gap-2.5 border-t border-[var(--c-hairline)] pt-4">
            {WEEKDAY_KEYS.filter((d) => draft.schedule[d]).map((day) => (
              <div key={day} className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
                <label htmlFor={`setup-day-${day}`} className="font-medium">
                  {capitalize(weekdayName(Number(day)))}
                </label>
                <SelectInput
                  id={`setup-day-${day}`}
                  value={draft.schedule[day] ?? ''}
                  onChange={(e) =>
                    update({ schedule: { ...draft.schedule, [day]: e.target.value } })
                  }
                >
                  {active.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
            ))}
          </div>
        )}
      </Card>

      {used.length > 0 && <h2 className="mt-3 px-1 text-[17px] font-semibold">Øvelser i øktene</h2>}
      {used.map((sessionId) => (
        <SessionExercises
          key={sessionId}
          session={sessionsById.get(sessionId)}
          ids={draft.exercises[sessionId] ?? []}
          onChange={(ids) => setExercises(sessionId, ids)}
        />
      ))}
      {used.length > 0 && (
        <p className="px-1 text-[13px] text-muted">
          Nye øvelser får 3 sett à 8–12 reps. Sett, reps og pauser endrer du senere under Mer →
          Rediger data → Økter.
        </p>
      )}
    </div>
  );
}

/** Øvelsene i én økt. Lukket viser den antall og bilder, åpen kan øvelser fjernes og legges til. */
function SessionExercises({
  session,
  ids,
  onChange,
}: {
  session: Session | undefined;
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const { exercises, exercisesById } = useAppData();
  const [open, setOpen] = useState(false);
  const name = session?.name ?? 'Økt';
  const addable = exercises.filter((e) => e.active && !ids.includes(e.id));
  return (
    <Card aria-label={`Øvelser i ${name}`} className="py-3">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${open ? 'Lukk' : 'Endre'} øvelser i ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="pressable flex w-full items-center gap-3 text-left"
      >
        <span className="flex shrink-0 -space-x-3" aria-hidden="true">
          {ids
            .map((id) => exercisesById.get(id))
            .filter((e) => !!e)
            .slice(0, 3)
            .map((e) => (
              <ExerciseThumb
                key={e.id}
                subject={e}
                size={36}
                className="ring-[3px] ring-[var(--c-surface)]"
              />
            ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{name}</span>
          <span className="block text-[13px] text-muted">{ids.length} øvelser</span>
        </span>
        <span className="text-[14px] font-medium text-accent">{open ? 'Lukk' : 'Endre'}</span>
      </button>
      {open && (
        <>
          <ul className="mt-3 flex flex-col border-t border-[var(--c-hairline)] pt-1">
            {ids.map((id) => {
              const ex = exercisesById.get(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 border-b border-[var(--c-hairline)] py-1.5 last:border-b-0"
                >
                  {ex && <ExerciseThumb subject={ex} size={36} />}
                  <span className="min-w-0 flex-1 truncate text-[15px]">{ex?.name ?? id}</span>
                  <IconButton
                    label={`Fjern ${ex?.name ?? id}`}
                    className="text-muted"
                    onClick={() => onChange(ids.filter((x) => x !== id))}
                  >
                    <IconX size={18} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <IconPlus size={18} className="shrink-0 text-accent" aria-hidden="true" />
            <SelectInput
              aria-label={`Legg til øvelse i ${name}`}
              value=""
              onChange={(e) => {
                if (e.target.value) onChange([...ids, e.target.value]);
              }}
            >
              <option value="">Legg til øvelse …</option>
              {addable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </SelectInput>
          </div>
        </>
      )}
    </Card>
  );
}

function BackAndFoodStep({ draft, update }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <Checkbox
          checked={draft.backCare}
          onChange={(backCare) => update({ backCare })}
          label="Følg opp ryggen"
          description="Daglig core-rutine (ca. 10 min) og smerteskala på I dag. For deg som har eller har hatt vondt i ryggen."
        />
      </Card>
      <Card>
        <Field
          label="Mat du ikke liker"
          htmlFor="setup-disliked"
          hint="Skill med komma. Måltider med dette blir markert i matplanen."
        >
          <TextInput
            id="setup-disliked"
            value={draft.disliked}
            placeholder="f.eks. sopp, fisk"
            onChange={(e) => update({ disliked: e.target.value })}
          />
        </Field>
      </Card>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function SummaryStep({ draft, update }: StepProps) {
  const { seed, sessionsById } = useAppData();
  const answers = toAnswers(draft);
  const auto = computeTargets({
    person: {
      sex: answers.sex,
      age: answers.age,
      heightCm: answers.heightCm,
      weightKg: answers.weightKg,
    },
    activity: answers.activity,
    goalKg: answers.goalKg,
    pacePerWeek: answers.pace,
  });
  const kcal = draft.kcalOverride ?? auto.kcalTarget;
  const scale = portionScaleFor(kcal, seed.settings.kcalTarget);
  const days = WEEKDAY_KEYS.filter((d) => draft.schedule[d]);

  return (
    <div className="flex flex-col gap-3">
      <Card aria-label="Kalorier">
        <p className="eyebrow">Kalorier per dag</p>
        <p className="num mt-1 text-[34px] leading-none font-bold">
          {formatNumber(kcal)} <span className="text-[17px] font-semibold text-muted">kcal</span>
        </p>
        <p className="mt-2 text-[14px] text-muted">
          Du forbrenner ca. {formatNumber(auto.maintenanceEstimateKcal)} kcal om dagen. For{' '}
          {formatNumber(answers.pace, 2)} kg i uka spiser du rundt{' '}
          {formatNumber(Math.max(0, auto.maintenanceEstimateKcal - kcal))} kcal mindre.
        </p>
        <div className="mt-3">
          <Field label="Eget kalorimål (valgfritt)">
            <NumberField
              label="Kalorimål"
              integer
              value={kcal}
              suffix="kcal"
              onCommit={(v) =>
                update({ kcalOverride: v === null || v === auto.kcalTarget ? null : v })
              }
            />
          </Field>
        </div>
      </Card>

      <Card>
        <dl className="divide-y divide-[var(--c-hairline)] text-[15px]">
          <SummaryRow label="Protein">
            {auto.proteinTargetG[0]}–{auto.proteinTargetG[1]} g
          </SummaryRow>
          <SummaryRow label="Porsjoner i matplanen">{Math.round(scale * 100)} %</SummaryRow>
          <SummaryRow label="Mål">
            {formatNumber(answers.weightKg, 1)} → {formatNumber(answers.goalKg, 1)} kg
          </SummaryRow>
          <SummaryRow label="Lengde">{answers.weeks} uker</SummaryRow>
          <SummaryRow label="Skritt">{formatNumber(answers.steps)} per dag</SummaryRow>
          <SummaryRow label="Ryggoppfølging">{answers.backCare ? 'På' : 'Av'}</SummaryRow>
        </dl>
      </Card>

      <Card>
        <p className="mb-2 text-[13px] font-medium text-muted">
          Trening, {days.length} {days.length === 1 ? 'dag' : 'dager'} i uka
        </p>
        <ul className="flex flex-col gap-1.5 text-[15px]">
          {days.map((d) => (
            <li key={d} className="flex justify-between gap-3">
              <span>{capitalize(weekdayName(Number(d)))}</span>
              <span className="font-semibold">
                {sessionsById.get(draft.schedule[d] ?? '')?.name ?? ''}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-[var(--c-hairline)] pt-3">
          <p className="mb-2 text-[13px] font-medium text-muted">Fasene</p>
          <PhaseList weeks={answers.weeks} />
        </div>
      </Card>
      <p className="px-1 text-[13px] text-muted">
        Utregningen er et anslag (Mifflin-St Jeor). Følg med på vekta de første ukene, så foreslår
        appen justeringer. Planen starter når du trykker «Start nå».
      </p>
    </div>
  );
}
