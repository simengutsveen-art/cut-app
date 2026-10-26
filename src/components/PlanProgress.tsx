import { Link } from 'react-router-dom';
import { useDoneWorkoutDates } from '../hooks/useDoneWorkoutDates';
import { dayLabel, planProgress } from '../lib/calendar';
import { formatDate, isoWeekday, planStatusFor, weekDates } from '../lib/dates';
import { formatNumber } from '../lib/format';
import { dayPlanFor, phaseForWeek } from '../lib/prescription';
import { useAppData } from '../state/appData';
import { DayMark } from './DayMark';
import { IconCalendar, IconChevronRight } from './icons';
import { Ring } from './Ring';

/** Ukestripe: dagene i planuka med dagens dato, planlagte og fullførte økter. */
export function WeekStrip({ week, today }: { week: number; today: string }) {
  const { settings } = useAppData();
  const done = useDoneWorkoutDates();
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={`Uke ${week}`}>
      {weekDates(week, settings.startDate).map((date) => {
        const planned = dayPlanFor(settings, isoWeekday(date)).kind === 'session';
        const isDone = done.has(date);
        return (
          <li key={date} className="flex justify-center">
            <DayMark date={date} today={today} planned={planned} done={isDone} />
            <span className="sr-only">{dayLabel(date, today, planned, isDone)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Fremdriftskortet øverst på «I dag»: ring, dag X av Y, dager igjen og uka. */
export function PlanHero({ today }: { today: string }) {
  const { settings, plan } = useAppData();
  const status = planStatusFor(settings, today);
  const progress = planProgress(settings.startDate, settings.weeks, today, !!settings.planStarted);
  const phase = phaseForWeek(plan.phases, status.week);
  const percent = Math.round(progress.fraction * 100);

  return (
    <section className="surface overflow-hidden rounded-2xl" aria-label="Fremdrift i planen">
      <Link
        to="/fremgang/kalender"
        className="flex items-center gap-4 p-4 pb-3 transition-colors active:bg-surface-2"
      >
        <Ring
          value={progress.dayNumber}
          max={progress.totalDays}
          label="Dager fullført i planen"
          size={88}
          stroke={9}
        >
          <span className="num text-[22px] leading-none font-bold">{percent} %</span>
        </Ring>
        <div className="min-w-0 flex-1">
          {phase && <p className="eyebrow mb-1 text-accent">{phase.name}</p>}
          {progress.finished ? (
            <p className="text-[22px] leading-tight font-bold tracking-[-0.02em]">
              Planen er ferdig
            </p>
          ) : (
            <p className="num text-[26px] leading-tight font-bold">
              Dag {progress.dayNumber}{' '}
              <span className="text-[17px] font-semibold text-muted">av {progress.totalDays}</span>
            </p>
          )}
          {!progress.finished && (
            <p className="mt-0.5 text-[15px] font-medium">
              {formatNumber(progress.daysLeft)} {progress.daysLeft === 1 ? 'dag' : 'dager'} igjen
            </p>
          )}
          <p className="text-[13px] text-muted">Ferdig {formatDate(progress.endDate)}</p>
        </div>
        <span className="flex flex-col items-center gap-0.5 text-muted">
          <IconCalendar size={20} />
          <IconChevronRight size={16} />
        </span>
      </Link>
      <div className="px-3 pb-4">
        <WeekStrip week={status.week} today={today} />
      </div>
    </section>
  );
}
