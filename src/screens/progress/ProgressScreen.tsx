import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Card, NumberField, Page, PageHeader, SectionTitle } from '../../components/ui';
import { setWaist } from '../../data/progressOps';
import { db } from '../../db';
import { useToday } from '../../hooks/useToday';
import { recommend } from '../../lib/adjustments';
import {
  daysBetween,
  formatDate,
  isoWeekday,
  planStatusFor,
  planStatusLabel,
} from '../../lib/dates';
import { fmtSigned, formatNumber } from '../../lib/format';
import { guideText } from '../../lib/labels';
import { sessionsPerWeek } from '../../lib/prescription';
import {
  averageLossPerWeek,
  forecastWeight,
  sessionsCompletedByWeek,
  stepGoal,
  targetWeight,
  waistByWeek,
  weeklyStepAverages,
  weeklyWeightAverages,
} from '../../lib/progress';
import { useAppData } from '../../state/appData';
import { AttendanceChart, StepsChart, WaistChart, WeightChart, type XY } from './ProgressCharts';
import { PhotosSection } from './PhotosSection';
import { WeeklyCheck } from './WeeklyCheck';

export function ProgressScreen() {
  const { settings, plan } = useAppData();
  const today = useToday();
  const dayLogs = useLiveQuery(() => db.dayLogs.toArray(), []);
  const measurements = useLiveQuery(() => db.measurements.toArray(), []);
  const workoutLogs = useLiveQuery(() => db.workoutLogs.toArray(), []);
  const adjustments = useLiveQuery(() => db.adjustments.toArray(), []);
  const dismissed = useLiveQuery(() => db.getMeta('dismissedChecks'), []);

  const start = settings.startDate;
  const weeks = settings.weeks;
  const status = planStatusFor(settings, today);
  const currentWeek = status.kind === 'waiting' || status.kind === 'before' ? 0 : status.week;

  const data = useMemo(() => {
    const logs = dayLogs ?? [];
    const ms = measurements ?? [];
    const averages = weeklyWeightAverages(logs, start, weeks);
    const waist = waistByWeek(ms, start, weeks);
    const avgLoss = averageLossPerWeek(averages, settings.startWeightKg);
    const forecast = avgLoss
      ? forecastWeight(settings.startWeightKg, avgLoss.perWeek, weeks)
      : null;
    const toX = (date: string) => daysBetween(start, date) / 7;

    const daily: XY[] = logs
      .filter((l) => typeof l.weightKg === 'number')
      .map((l) => ({ x: toX(l.date), y: l.weightKg as number }))
      .filter((p) => p.x >= 0 && p.x <= weeks)
      .sort((a, b) => a.x - b.x);
    const weekly: XY[] = [...averages.entries()]
      .sort(([a], [b]) => a - b)
      .map(([w, y]) => ({ x: w - 0.5, y }));
    const target: XY[] = [0, weeks].map((w) => ({
      x: w,
      y: targetWeight(settings.startWeightKg, settings.plannedLossKgPerWeek, w),
    }));
    const forecastLine: XY[] =
      avgLoss && forecast !== null
        ? [
            { x: avgLoss.week - 0.5, y: avgLoss.latestAverage },
            { x: weeks, y: forecast },
          ]
        : [];

    const waistPoints: XY[] = [
      { x: 0, y: settings.startWaistCm },
      ...ms
        .filter((m) => typeof m.waistCm === 'number')
        .map((m) => ({ x: toX(m.date), y: m.waistCm as number }))
        .filter((p) => p.x >= 0 && p.x <= weeks),
    ].sort((a, b) => a.x - b.x);
    const latestWaist = [...ms]
      .filter((m) => typeof m.waistCm === 'number')
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const shownWeeks = Math.max(1, Math.min(weeks, currentWeek || 1));
    const stepAvgs = weeklyStepAverages(logs, start, weeks);
    const steps = Array.from({ length: shownWeeks }, (_, i) => ({
      week: `U${i + 1}`,
      avg: stepAvgs.has(i + 1) ? Math.round(stepAvgs.get(i + 1)!) : null,
      goal: stepGoal(settings.steps, i + 1, 1, settings.stepsBonus),
    }));
    const done = sessionsCompletedByWeek(workoutLogs ?? [], start, weeks);
    const attendance = Array.from({ length: shownWeeks }, (_, i) => ({
      week: `U${i + 1}`,
      done: done.get(i + 1) ?? 0,
    }));

    return {
      averages,
      waist,
      avgLoss,
      forecast,
      daily,
      weekly,
      target,
      forecastLine,
      waistPoints,
      latestWaist,
      steps,
      attendance,
    };
  }, [dayLogs, measurements, workoutLogs, start, weeks, settings, currentWeek]);

  const checkWeek = Math.max(1, Math.min(weeks, currentWeek || 1));
  const rec = recommend({
    week: checkWeek,
    today,
    rules: plan.adjustmentRules,
    weightAverages: data.averages,
    waist: data.waist,
    startWaistCm: settings.startWaistCm,
    currentKcalTarget: settings.currentKcalTarget,
    kcalFloor: settings.kcalFloor,
    acceptedAdjustments: adjustments ?? [],
  });
  const accepted = (adjustments ?? []).find((a) => a.week === checkWeek);
  const todayWaist = (measurements ?? []).find((m) => m.date === today)?.waistCm ?? null;

  const lostTotal = data.avgLoss ? settings.startWeightKg - data.avgLoss.latestAverage : null;
  const waistDown =
    data.latestWaist?.waistCm != null ? settings.startWaistCm - data.latestWaist.waistCm : null;

  return (
    <Page>
      <PageHeader title="Fremgang" subtitle={planStatusLabel(status, weeks)} />

      <dl className="grid grid-cols-2 gap-2">
        <Stat
          label="Ned totalt"
          value={lostTotal !== null ? `${formatNumber(lostTotal, 1)} kg` : '–'}
          hint={data.avgLoss ? `ukesnitt uke ${data.avgLoss.week}` : 'ingen vekt ennå'}
        />
        <Stat
          label="Snitt per uke"
          value={data.avgLoss ? `${formatNumber(data.avgLoss.perWeek, 2)} kg` : '–'}
          hint={`plan ${formatNumber(settings.plannedLossKgPerWeek, 1)} kg/uke`}
        />
        <Stat
          label="Livvidde ned"
          value={waistDown !== null ? `${formatNumber(waistDown, 1)} cm` : '–'}
          hint={
            data.latestWaist
              ? `sist målt ${formatDate(data.latestWaist.date)}`
              : `start ${formatNumber(settings.startWaistCm)} cm`
          }
        />
        <Stat
          label={`Prognose uke ${weeks}`}
          value={data.forecast !== null ? `${formatNumber(data.forecast, 1)} kg` : '–'}
          hint={`mål ${settings.goalWeightRangeKg.map((v) => formatNumber(v)).join('–')} kg`}
        />
      </dl>

      <SectionTitle>Ukessjekk</SectionTitle>
      <WeeklyCheck
        rec={rec}
        today={today}
        isSunday={isoWeekday(today) === 7}
        accepted={accepted}
        dismissed={(dismissed ?? []).includes(checkWeek)}
      />

      <SectionTitle>Vekt</SectionTitle>
      <WeightChart
        daily={data.daily}
        weekly={data.weekly}
        target={data.target}
        forecast={data.forecastLine}
        weeks={weeks}
      />

      <SectionTitle>Livvidde</SectionTitle>
      <Card className="mb-3">
        <label htmlFor="waist" className="text-sm font-medium text-muted">
          Livvidde i dag (cm)
        </label>
        <NumberField
          id="waist"
          label="Livvidde i dag"
          value={todayWaist}
          decimals={1}
          big
          suffix="cm"
          min={40}
          max={200}
          onCommit={(v) => void setWaist(db, today, v)}
        />
        <p className="mt-1 text-xs text-muted">{guideText(plan.guides, 'maaling', 'livvidde')}</p>
      </Card>
      <WaistChart points={data.waistPoints} goal={settings.goalWaistRangeCm} weeks={weeks} />

      <SectionTitle>Skritt og trening</SectionTitle>
      <div className="flex flex-col gap-3">
        <StepsChart data={data.steps} />
        <AttendanceChart data={data.attendance} perWeek={sessionsPerWeek(settings)} />
      </div>
      {(adjustments ?? []).length > 0 && (
        <>
          <SectionTitle>Godtatte justeringer</SectionTitle>
          <Card className="p-0">
            <ul>
              {[...(adjustments ?? [])]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between gap-2 border-b border-line px-4 py-2 text-sm last:border-b-0"
                  >
                    <span>
                      {formatDate(a.date)} · uke {a.week}
                    </span>
                    <span className="tabular font-semibold">
                      {[
                        a.kcalDelta && `${fmtSigned(a.kcalDelta)} kcal`,
                        a.stepsDelta && `${fmtSigned(a.stepsDelta)} skritt`,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </>
      )}

      <SectionTitle>Progresjonsbilder</SectionTitle>
      <PhotosSection measurements={measurements ?? []} today={today} />
    </Page>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular text-2xl font-bold">{value}</dd>
      <dd className="text-xs text-muted">{hint}</dd>
    </div>
  );
}
