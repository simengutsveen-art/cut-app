import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { extendRest, getActiveWorkout, setRest } from '../data/workouts';
import { db } from '../db';
import { useNow } from '../hooks/useToday';
import { cx } from '../lib/cx';
import { formatDuration } from '../lib/format';
import { beep } from '../services/sound';
import { useAppData } from '../state/appData';
import type { WorkoutLog } from '../types';
import { IconChevronRight, IconTimer } from './icons';

const REST_DONE_VISIBLE_MS = 60_000;

/**
 * Fast felt over fanelinja: pausetimer når den går, ellers «Økt pågår».
 * Timeren bruker tidsstempler, så den viser riktig tid etter at skjermen har vært låst.
 */
export function WorkoutDock({ onVisibleChange }: { onVisibleChange?: (visible: boolean) => void }) {
  const active = useLiveQuery(() => getActiveWorkout(db).then((l) => l ?? null), []);
  const location = useLocation();
  const now = useNow(1000, !!active?.rest);
  const visible = !!active;
  useEffect(() => onVisibleChange?.(visible), [visible, onVisibleChange]);
  if (!active) return null;
  const onWorkoutPage = location.pathname === `/trening/okt/${active.id}`;
  // En ferdig pause vises i ett minutt. Etterpå vises «Økt pågår» igjen.
  const showTimer = !!active.rest && now < active.rest.endsAt + REST_DONE_VISIBLE_MS;
  return (
    <div className="bottom-tabbar fixed inset-x-0 z-30 px-3 pb-2">
      <div className="mx-auto max-w-xl">
        {showTimer ? (
          <RestTimer log={active} />
        ) : onWorkoutPage ? null : (
          <ActiveWorkoutPill log={active} />
        )}
      </div>
    </div>
  );
}

function ActiveWorkoutPill({ log }: { log: WorkoutLog }) {
  const { sessionsById } = useAppData();
  const name = sessionsById.get(log.sessionId)?.name ?? 'Økt';
  const done = log.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  return (
    <Link
      to={`/trening/okt/${log.id}`}
      className="flex min-h-12 items-center gap-3 rounded-2xl border border-accent/60 bg-surface px-4 py-2 shadow-lg"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
      <span className="flex-1 font-semibold">
        {name} pågår · {done} sett
      </span>
      <span className="text-sm text-accent">Fortsett</span>
      <IconChevronRight size={18} className="text-accent" />
    </Link>
  );
}

function RestTimer({ log }: { log: WorkoutLog }) {
  const rest = log.rest!;
  const now = useNow(250);
  const remainingSec = (rest.endsAt - now) / 1000;
  const finished = remainingSec <= 0;
  const beepedFor = useRef<number | null>(null);

  useEffect(() => {
    if (beepedFor.current === rest.endsAt) return;
    const fire = () => {
      beepedFor.current = rest.endsAt;
      // Pip bare hvis appen er synlig og pausen nettopp ble ferdig.
      if (document.visibilityState === 'visible' && Date.now() - rest.endsAt < 5000) beep();
    };
    const delay = rest.endsAt - Date.now();
    if (delay <= 0) {
      fire();
      return;
    }
    const t = window.setTimeout(fire, delay);
    return () => window.clearTimeout(t);
  }, [rest.endsAt]);

  const progress = finished ? 1 : 1 - remainingSec / rest.durationSec;

  return (
    <div
      role="timer"
      aria-live={finished ? 'assertive' : 'off'}
      aria-label="Pausetimer"
      className={cx(
        'relative overflow-hidden rounded-2xl border bg-surface shadow-lg',
        finished ? 'border-good' : 'border-accent/60',
      )}
    >
      <div
        className={cx('absolute inset-y-0 left-0 opacity-20', finished ? 'bg-good' : 'bg-accent')}
        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-2 px-3 py-2">
        <IconTimer className={finished ? 'text-good' : 'text-accent'} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">{finished ? 'Pausen er over' : 'Pause'}</div>
          <div className="tabular text-3xl leading-none font-bold">
            {finished ? 'Kjør!' : formatDuration(Math.ceil(remainingSec))}
          </div>
        </div>
        {!finished && (
          <button
            type="button"
            className="min-h-12 rounded-xl bg-surface-2 px-3 font-semibold"
            onClick={() => void extendRest(db, log.id, 30)}
          >
            +30 s
          </button>
        )}
        <button
          type="button"
          className="min-h-12 rounded-xl bg-surface-2 px-3 font-semibold"
          onClick={() => void setRest(db, log.id, null)}
        >
          {finished ? 'Lukk' : 'Hopp over'}
        </button>
      </div>
    </div>
  );
}
