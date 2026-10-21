import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackAlertCard } from '../../components/BackAlertCard';
import { InstallBanner } from '../../components/InstallBanner';
import { PainPicker } from '../../components/PainPicker';
import { StartPlanButton } from '../../components/PlanControls';
import { PlanHero } from '../../components/PlanProgress';
import { SessionCard } from '../../components/SessionCard';
import { StopWorkoutButton } from '../../components/StopWorkout';
import { Ring } from '../../components/Ring';
import {
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconFood,
  IconInfo,
  IconPlay,
  IconScale,
  IconSteps,
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
import { patchDayLog, setEaten } from '../../data/dayLogs';
import { isNewerSeed } from '../../data/seedSync';
import { startWorkout } from '../../data/workouts';
import { db } from '../../db';
import { useDayPlan } from '../../hooks/useDayPlan';
import { useOptimistic } from '../../hooks/useOptimistic';
import { useSaveOnHide } from '../../hooks/useSaveOnHide';
import { useToday } from '../../hooks/useToday';
import { useWorkoutContext } from '../../hooks/useWorkoutContext';
import { cx } from '../../lib/cx';
import {
  addDaysISO,
  daysBetween,
  formatDate,
  formatWeekdayLong,
  isoWeekday,
  planStatusFor,
  planStatusLabel,
  todayISO,
} from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { prepEventOnDate } from '../../lib/mealPrep';
import { backAlert } from '../../lib/pain';
import { dayPlanFor, phaseForWeek } from '../../lib/prescription';
import { stepGoal } from '../../lib/progress';
import { useAppData } from '../../state/appData';
import { DaySummary } from '../food/FoodToday';
import { EatenChips } from '../food/MealBits';

const BACKUP_REMINDER_DAYS = 7;

export function TodayScreen() {
  const app = useAppData();
  const { settings, plan, sessionsById, mealsById } = app;
  const today = useToday();
  const navigate = useNavigate();
  const ctx = useWorkoutContext();
  const day = useDayPlan(today);
  const status = planStatusFor(settings, today);
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

  // Core-rutine og smerteskala (kan slås av i oppsettet eller Innstillinger)
  const backCare = settings.backCare !== false;

  // Startdato valgt fram i tid under Innstillinger
  const plannedStart =
    settings.planStarted && daysBetween(today, settings.startDate) > 0 ? settings.startDate : null;

  const weightDelta =
    day.log.weightKg != null && lastWeight?.weightKg != null
      ? day.log.weightKg - lastWeight.weightKg
      : null;

  return (
    <Page>
      <PageHeader eyebrow={formatWeekdayLong(today)} title={title} />
      <InstallBanner />

      {(seedUpdate || backupDue) && (
        <div className="mb-4 flex flex-col gap-2">
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

      {status.kind === 'waiting' ? (
        <Card tone="accent" className="rounded-[26px] p-5" aria-label="Start planen">
          <div className="flex items-center gap-4">
            <Ring value={0} max={1} label="Planen er ikke startet" size={76} stroke={8}>
              <span className="num text-[18px] font-bold">{settings.weeks * 7}</span>
              <span className="text-[10px] font-semibold text-muted">dager</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] leading-tight font-bold tracking-[-0.02em]">
                {plannedStart
                  ? `Planen starter ${formatWeekdayLong(plannedStart)}`
                  : 'Klar til å starte?'}
              </h2>
              <p className="mt-1 text-[14px] text-muted">
                {plannedStart
                  ? 'Startdatoen er valgt under Innstillinger.'
                  : 'Uke 1 starter den dagen du trykker.'}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[15px]">
            Starter du i dag, varer planen i {settings.weeks} uker, til og med{' '}
            {formatDate(addDaysISO(today, settings.weeks * 7 - 1))}.
          </p>
          <StartPlanButton
            className="mt-4"
            today={today}
            label={plannedStart ? 'Start i dag i stedet' : 'Start nå'}
          />
          <p className="mt-2.5 text-xs text-muted">
            Ukene telles fra startdagen. Du kan endre startdato under Mer → Innstillinger.
          </p>
        </Card>
      ) : (
        <PlanHero today={today} />
      )}

      {backCare && alert.show && (
        <div className="mt-4">
          <BackAlertCard reason={alert.reason} />
        </div>
      )}

      <SectionTitle>Logg i dag</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          icon={<IconScale size={18} />}
          label="Morgenvekt"
          htmlFor="weight"
          footer={
            savedField === 'weight' ? (
              <SavedTick />
            ) : (
              <p className="text-xs text-muted">
                {lastWeight?.weightKg
                  ? `Forrige ${formatNumber(lastWeight.weightKg, 1)} kg`
                  : `Start ${formatNumber(settings.startWeightKg, 1)} kg`}
                {weightDelta !== null && Math.abs(weightDelta) >= 0.05 && (
                  <span
                    className={cx(
                      'ml-1 font-semibold',
                      weightDelta < 0 ? 'text-good' : 'text-muted',
                    )}
                  >
                    {weightDelta < 0 ? '↓' : '↑'} {formatNumber(Math.abs(weightDelta), 1)}
                  </span>
                )}
              </p>
            )
          }
        >
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
        </MetricTile>
        <MetricTile
          icon={<IconSteps size={18} />}
          label="Skritt"
          htmlFor="steps"
          footer={
            <>
              <StepsBar steps={day.log.steps ?? 0} goal={goal} />
              {savedField === 'steps' ? (
                <SavedTick />
              ) : (
                <p className="text-xs text-muted">
                  Mål {formatNumber(goal)}
                  {day.log.steps != null && day.log.steps >= goal && (
                    <span className="ml-1 font-semibold text-good">✓ nådd</span>
                  )}
                </p>
              )}
            </>
          }
        >
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
        </MetricTile>
      </div>

      <SectionTitle
        action={
          <Link to="/trening" className="text-[15px] font-medium text-accent">
            Trening
          </Link>
        }
      >
        Dagens økt
      </SectionTitle>
      {activeWorkout ? (
        <Card tone="accent">
          <p className="eyebrow text-accent">Økt pågår</p>
          <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">
            {sessionsById.get(activeWorkout.sessionId)?.name}
          </h2>
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => navigate(`/trening/okt/${activeWorkout.id}`)}
            >
              <IconPlay size={18} /> Fortsett økta
            </Button>
            <StopWorkoutButton compact log={activeWorkout} className="min-h-14 rounded-2xl px-4" />
          </div>
        </Card>
      ) : session ? (
        <SessionCard
          session={session}
          week={week}
          done={sessionDone}
          onStart={async () => {
            const id = await startWorkout(db, session, today, ctx);
            navigate(`/trening/okt/${id}`);
          }}
        />
      ) : (
        <Card>
          <p className="eyebrow">Hvile</p>
          <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">Hviledag: lang tur</h2>
          <p className="mt-1 text-[15px] text-muted">Skrittmål i dag: {formatNumber(goal)}</p>
        </Card>
      )}

      {(prep || isSunday) && (
        <>
          <SectionTitle>Påminnelser</SectionTitle>
          <div className="flex flex-col gap-2.5">
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
          <Link to="/mat" className="text-[15px] font-medium text-accent">
            Dagens mat
          </Link>
        }
      >
        Mat
      </SectionTitle>
      <DaySummary day={day} compact />
      <EatenChips
        eaten={day.log.eaten}
        onChange={(slot, eaten) => void setEaten(db, day.log.date, slot, eaten)}
      />

      {backCare && (
        <>
          <SectionTitle
            action={
              <Link to="/mer/core" className="text-[15px] font-medium text-accent">
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
            <div className="mt-4 border-t border-[var(--c-hairline)] pt-4">
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
        </>
      )}

      <SectionTitle>Notat</SectionTitle>
      <DayNote
        key={today}
        value={day.log.note ?? ''}
        onSave={(note) => void patchDayLog(db, today, { note })}
      />
    </Page>
  );
}

function MetricTile({
  icon,
  label,
  htmlFor,
  children,
  footer,
}: {
  icon: ReactNode;
  label: string;
  htmlFor: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="surface flex min-w-0 flex-col gap-2 rounded-[22px] p-3">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted"
      >
        <span className="text-accent">{icon}</span>
        {label}
      </label>
      {children}
      <div className="flex flex-col gap-1.5">{footer}</div>
    </div>
  );
}

function StepsBar({ steps, goal }: { steps: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, (steps / goal) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
      <div
        className={cx(
          'h-full rounded-full transition-[width] duration-500',
          pct >= 100 ? 'bg-good' : 'bg-accent',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Fritt notat for dagen. Lagres når feltet forlates. */
function DayNote({ value, onSave }: { value: string; onSave: (note: string) => void }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : value;
  useSaveOnHide(() => {
    if (focused && text.trim() !== value.trim()) onSave(text.trim());
  });
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
    <p className="flex items-center gap-1 text-xs font-semibold text-good" role="status">
      <IconCheck size={14} /> Lagret
    </p>
  );
}

function NoticeLink({ to, text, warn }: { to: string; text: string; warn?: boolean }) {
  return (
    <Link
      to={to}
      className={cx(
        'surface pressable flex min-h-12 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[14px] font-semibold',
        warn ? 'tone-warn' : 'tone-accent',
      )}
    >
      {warn ? (
        <IconWarning size={20} className="shrink-0 text-warn" />
      ) : (
        <IconInfo size={20} className="shrink-0 text-accent" />
      )}
      <span className="flex-1">{text}</span>
      <IconChevronRight size={18} className="text-muted" />
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
      className="surface pressable flex min-h-14 items-center gap-3 rounded-[22px] px-4 py-3"
    >
      <span
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
          done ? 'bg-good/15 text-good' : 'bg-accent/12 text-accent',
        )}
      >
        {done ? <IconCheck size={20} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold tracking-[-0.01em]">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
      <IconChevronRight size={18} className="text-muted" />
    </Link>
  );
}
