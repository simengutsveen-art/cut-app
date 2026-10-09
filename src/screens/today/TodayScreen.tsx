import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackAlertCard } from '../../components/BackAlertCard';
import { PainPicker } from '../../components/PainPicker';
import {
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconFood,
  IconInfo,
  IconPlay,
  IconWarning,
} from '../../components/icons';
import {
  Button,
  Card,
  Checkbox,
  NumberField,
  Page,
  PageHeader,
  SectionTitle,
  TextArea,
} from '../../components/ui';
import { patchDayLog } from '../../data/dayLogs';
import { isNewerSeed } from '../../data/seedSync';
import { startWorkout } from '../../data/workouts';
import { db } from '../../db';
import { useDayPlan } from '../../hooks/useDayPlan';
import { useOptimistic } from '../../hooks/useOptimistic';
import { useToday } from '../../hooks/useToday';
import { useWorkoutContext } from '../../hooks/useWorkoutContext';
import {
  addDaysISO,
  daysBetween,
  formatDate,
  formatWeekdayLong,
  isoWeekday,
  planStatus,
  planStatusLabel,
  todayISO,
} from '../../lib/dates';
import { formatNumber, parseInteger } from '../../lib/format';
import { capitalize } from '../../lib/labels';
import { prepEventOnDate } from '../../lib/mealPrep';
import { backAlert } from '../../lib/pain';
import { dayPlanFor, phaseForWeek, prescriptionForWeek } from '../../lib/prescription';
import { stepGoal } from '../../lib/progress';
import { useAppData } from '../../state/appData';
import { DaySummary } from '../food/FoodToday';

const BACKUP_REMINDER_DAYS = 7;

export function TodayScreen() {
  const app = useAppData();
  const { settings, plan, sessionsById, mealsById } = app;
  const today = useToday();
  const navigate = useNavigate();
  const ctx = useWorkoutContext();
  const day = useDayPlan(today);
  const status = planStatus(today, settings.startDate, settings.weeks);
  const week = status.week;
  const phase = phaseForWeek(plan.phases, week);
  const weekday = isoWeekday(today);

  const recentLogs = useLiveQuery(
    () => db.dayLogs.where('date').between(addDaysISO(today, -2), today, true, true).toArray(),
    [today],
  );
  const lastWeight = useLiveQuery(
    () =>
      db.dayLogs
        .where('date')
        .below(today)
        .reverse()
        .filter((l) => typeof l.weightKg === 'number')
        .first(),
    [today],
  );
  const firstLog = useLiveQuery(() => db.dayLogs.orderBy('date').first(), []);
  const todaysWorkouts = useLiveQuery(
    () => db.workoutLogs.where('date').equals(today).toArray(),
    [today],
  );
  const activeWorkout = useLiveQuery(
    () => db.workoutLogs.where('status').equals('active').first(),
    [],
  );

  const [coreDone, setCoreDone] = useOptimistic(day.log.coreDone);
  const [pain, setPain] = useOptimistic(day.log.pain ?? null);
  const [savedField, setSavedField] = useState<'weight' | 'steps' | null>(null);
  const saveField = async (field: 'weight' | 'steps', patch: Parameters<typeof patchDayLog>[2]) => {
    await patchDayLog(db, today, patch);
    setSavedField(field);
  };

  const dp = dayPlanFor(settings, weekday);
  const session = dp.kind === 'session' ? sessionsById.get(dp.sessionId) : undefined;
  const sessionDone = (todaysWorkouts ?? []).some(
    (l) => l.status === 'done' && l.sessionId === session?.id,
  );
  const goal = stepGoal(settings.steps, week, weekday, settings.stepsBonus);
  const prep = prepEventOnDate(plan.mealPrepRotation, today, settings.startDate, settings.weeks);
  const isSunday = weekday === 7;
  const alert = backAlert(
    (recentLogs ?? []).map((l) => (l.date === today ? { ...l, pain } : l)),
    today,
    plan.coreRoutine.painScale,
  );

  // Påminnelse når det er mer enn 7 dager siden siste backup (eller første logg).
  const backupFrom = app.lastBackupAt ? todayISO(new Date(app.lastBackupAt)) : firstLog?.date;
  const backupDue = !!backupFrom && daysBetween(backupFrom, today) > BACKUP_REMINDER_DAYS;
  const seedUpdate = isNewerSeed(app.seed.seedVersion, app.installedSeedVersion);

  const title =
    status.kind === 'active' && phase
      ? `${planStatusLabel(status, settings.weeks)} · ${phase.name}`
      : planStatusLabel(status, settings.weeks);

  return (
    <Page>
      <PageHeader title={title} subtitle={capitalize(formatWeekdayLong(today))} />

      {(seedUpdate || backupDue) && (
        <div className="mb-3 flex flex-col gap-2">
          {seedUpdate && (
            <NoticeLink
              to="/mer/oppdater"
              text={`Ny versjon av planen (${app.seed.seedVersion}). Oppdater plan`}
            />
          )}
          {backupDue && (
            <NoticeLink
              to="/mer/backup"
              text={
                app.lastBackupAt
                  ? `Siste backup var ${formatDate(todayISO(new Date(app.lastBackupAt)))}. Ta en ny backup`
                  : 'Du har ikke tatt backup ennå. Ta backup'
              }
              warn
            />
          )}
        </div>
      )}

      {alert.show && <BackAlertCard reason={alert.reason} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="weight" className="text-sm font-medium text-muted">
            Morgenvekt
          </label>
          <NumberField
            id="weight"
            label="Morgenvekt"
            value={day.log.weightKg}
            decimals={1}
            big
            suffix="kg"
            placeholder={lastWeight?.weightKg ? formatNumber(lastWeight.weightKg, 1) : '0,0'}
            min={20}
            max={400}
            onCommit={(v) => void saveField('weight', { weightKg: v })}
          />
          {savedField === 'weight' && <SavedTick />}
          <p className="mt-1 text-xs text-muted">
            {lastWeight?.weightKg
              ? `Forrige: ${formatNumber(lastWeight.weightKg, 1)} kg (${formatDate(lastWeight.date)})`
              : `Start: ${formatNumber(settings.startWeightKg, 1)} kg`}
          </p>
        </div>
        <div>
          <label htmlFor="steps" className="text-sm font-medium text-muted">
            Skritt
          </label>
          <NumberField
            id="steps"
            label="Skritt"
            value={day.log.steps}
            integer
            big
            placeholder="0"
            min={0}
            max={200000}
            onCommit={(v) => void saveField('steps', { steps: v })}
          />
          {savedField === 'steps' && <SavedTick />}
          <PasteStepsButton onSteps={(v) => void saveField('steps', { steps: v })} />
          <p className="mt-1 text-xs text-muted">
            Mål i dag: {formatNumber(goal)}
            {day.log.steps != null && day.log.steps >= goal && (
              <span className="text-good"> ✓</span>
            )}
          </p>
        </div>
      </div>

      <SectionTitle>Trening</SectionTitle>
      {activeWorkout ? (
        <Card tone="accent">
          <p className="text-sm text-muted">Økt pågår</p>
          <h2 className="text-xl font-bold">{sessionsById.get(activeWorkout.sessionId)?.name}</h2>
          <Button
            className="mt-3"
            block
            size="lg"
            onClick={() => navigate(`/trening/okt/${activeWorkout.id}`)}
          >
            <IconPlay size={20} /> Fortsett økta
          </Button>
        </Card>
      ) : session ? (
        <Card tone={sessionDone ? 'good' : undefined}>
          <h2 className="text-xl font-bold">{session.name}</h2>
          <p className="text-sm text-muted">
            {prescriptionForWeek(session, plan.phases, week).length} øvelser
            {phase ? ` · ${phase.name}` : ''}
          </p>
          {sessionDone ? (
            <p className="mt-2 flex items-center gap-1 font-semibold text-good">
              <IconCheck size={18} /> Fullført i dag
            </p>
          ) : (
            <Button
              className="mt-3"
              block
              size="lg"
              onClick={async () => {
                const id = await startWorkout(db, session, today, ctx);
                navigate(`/trening/okt/${id}`);
              }}
            >
              <IconPlay size={20} /> Start {session.name}
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <h2 className="text-xl font-bold">Hviledag: lang tur</h2>
          <p className="text-sm text-muted">Skrittmål i dag: {formatNumber(goal)}</p>
        </Card>
      )}

      {(prep || isSunday) && (
        <>
          <SectionTitle>Påminnelser</SectionTitle>
          <div className="flex flex-col gap-2">
            {prep && (
              <ReminderLink
                to="/mat/prep"
                icon={<IconFood size={20} />}
                title="Meal prep i dag"
                text={`${prep.meals.lunsj} ${mealsById.get(prep.meals.lunsj)?.name ?? ''} og ${prep.meals.middag} ${mealsById.get(prep.meals.middag)?.name ?? ''}`}
                done={!!day.log.prepDone}
              />
            )}
            {isSunday && (
              <ReminderLink
                to="/fremgang"
                icon={<IconCamera size={20} />}
                title="Søndag: mål livvidden og ta bilder"
                text="Og ta ukessjekken under Fremgang."
              />
            )}
          </div>
        </>
      )}

      <SectionTitle
        action={
          <Link to="/mat" className="text-sm font-semibold text-accent">
            Dagens mat
          </Link>
        }
      >
        Mat
      </SectionTitle>
      <DaySummary day={day} compact />

      <SectionTitle
        action={
          <Link to="/mer/core" className="text-sm font-semibold text-accent">
            Rutinen
          </Link>
        }
      >
        Core og rygg
      </SectionTitle>
      <Card>
        <Checkbox
          checked={coreDone}
          onChange={(v) => {
            setCoreDone(v);
            void patchDayLog(db, today, { coreDone: v });
          }}
          label="Core-rutinen er gjort"
          description={plan.coreRoutine.when}
        />
        <div className="mt-3">
          <PainPicker
            value={pain}
            scale={plan.coreRoutine.painScale}
            onChange={(v) => {
              setPain(v);
              void patchDayLog(db, today, { pain: v });
            }}
          />
        </div>
      </Card>

      <SectionTitle>Notat</SectionTitle>
      <DayNote
        key={today}
        value={day.log.note ?? ''}
        onSave={(note) => void patchDayLog(db, today, { note })}
      />
    </Page>
  );
}

/** Fritt notat for dagen. Lagres når feltet forlates. */
function DayNote({ value, onSave }: { value: string; onSave: (note: string) => void }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : value;
  return (
    <TextArea
      aria-label="Notat for dagen"
      placeholder="F.eks. sov dårlig, stiv i ryggen, middag ute …"
      value={shown}
      onFocus={() => {
        setText(value);
        setFocused(true);
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (text.trim() !== value.trim()) onSave(text.trim());
      }}
    />
  );
}

function SavedTick() {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-good" role="status">
      <IconCheck size={14} /> Lagret
    </p>
  );
}

/** Leser skritt fra utklippstavla (f.eks. kopiert av en iOS-snarvei fra Helse). */
function PasteStepsButton({ onSteps }: { onSteps: (steps: number) => void }) {
  const [error, setError] = useState(false);
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return null;
  return (
    <button
      type="button"
      className="mt-1 min-h-11 text-sm font-semibold text-accent"
      onClick={async () => {
        try {
          const text = await navigator.clipboard.readText();
          const steps = parseInteger(text.trim()) ?? NaN;
          if (Number.isFinite(steps) && steps >= 0 && steps <= 200000) {
            setError(false);
            onSteps(steps);
          } else setError(true);
        } catch {
          setError(true);
        }
      }}
    >
      {error ? 'Fant ingen skritt å lime inn' : 'Lim inn skritt'}
    </button>
  );
}

function NoticeLink({ to, text, warn }: { to: string; text: string; warn?: boolean }) {
  return (
    <Link
      to={to}
      className={
        warn
          ? 'flex min-h-12 items-center gap-2 rounded-2xl border border-warn/60 bg-warn/10 px-4 py-2 text-sm font-semibold'
          : 'flex min-h-12 items-center gap-2 rounded-2xl border border-accent/60 bg-accent/10 px-4 py-2 text-sm font-semibold'
      }
    >
      {warn ? (
        <IconWarning size={20} className="shrink-0 text-warn" />
      ) : (
        <IconInfo size={20} className="shrink-0 text-accent" />
      )}
      <span className="flex-1">{text}</span>
      <IconChevronRight size={18} />
    </Link>
  );
}

function ReminderLink({
  to,
  icon,
  title,
  text,
  done,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  text: string;
  done?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
    >
      <span className={done ? 'text-good' : 'text-accent'}>
        {done ? <IconCheck size={20} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
      <IconChevronRight size={18} className="text-muted" />
    </Link>
  );
}
