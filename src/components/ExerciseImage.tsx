import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import type { Exercise } from '../types';
import { IconPause, IconPlay } from './icons';

const REMOTE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

function localImageUrl(imageSourceId: string, index: 0 | 1): string {
  return `${import.meta.env.BASE_URL}exercises/${encodeURIComponent(imageSourceId)}/${index}.jpg`;
}

function remoteImageUrl(imageSourceId: string, index: 0 | 1): string {
  return `${REMOTE_BASE}${encodeURIComponent(imageSourceId)}/${index}.jpg`;
}

function useBlobUrl(blob: Blob | undefined): string | undefined {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export type ImageSubject = Pick<Exercise, 'name' | 'imageSourceId'> & { customImages?: Blob[] };

/** Kandidater for ett bilde: eget bilde → bilde i appen → Free Exercise DB. */
function useSources(subject: ImageSubject, index: 0 | 1): string[] {
  const customUrl = useBlobUrl(subject.customImages?.[index]);
  return useMemo(() => {
    const list: string[] = [];
    if (customUrl) list.push(customUrl);
    if (subject.imageSourceId) {
      list.push(localImageUrl(subject.imageSourceId, index));
      list.push(remoteImageUrl(subject.imageSourceId, index));
    }
    return list;
  }, [customUrl, subject.imageSourceId, index]);
}

/** Prøver kildene i rekkefølge. `src` blir undefined når alle har feilet. */
function useFallbackSrc(sources: string[]) {
  const key = sources.join('|');
  const [state, setState] = useState({ key, attempt: 0 });
  const attempt = state.key === key ? state.attempt : 0;
  return {
    src: sources[attempt] as string | undefined,
    onError: () => setState({ key, attempt: attempt + 1 }),
  };
}

function Placeholder({ name, className }: { name: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${name} (mangler bilde)`}
      className={cx(
        'flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-surface-2 p-3 text-center text-sm font-semibold text-muted shadow-[inset_0_0_0_1px_var(--c-hairline)]',
        className,
      )}
    >
      {name}
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  return reduced;
}

const FRAME_MS = 1400;

/**
 * Animert øvelse: start- og sluttbildet veksler i en jevn løkke (som i Hevy), så
 * bevegelsen leses som en repetisjon. Kan pauses. Med «Reduser bevegelse» står den stille,
 * og start/slutt kan byttes manuelt.
 */
export function ExerciseMotion({
  subject,
  className,
}: {
  subject: ImageSubject;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const a = useFallbackSrc(useSources(subject, 0));
  const b = useFallbackSrc(useSources(subject, 1));
  const [playing, setPlaying] = useState(!reduced);
  const [frame, setFrame] = useState<0 | 1>(0);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const animated = !!a.src && !!b.src;

  // Spill bare når animasjonen er på skjermen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!animated || !playing || !visible) return;
    const t = window.setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), FRAME_MS);
    return () => window.clearInterval(t);
  }, [animated, playing, visible]);

  if (!a.src && !b.src) return <Placeholder name={subject.name} className={className} />;

  return (
    <div
      ref={ref}
      className={cx(
        'relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-surface-2 shadow-[inset_0_0_0_1px_var(--c-hairline)]',
        className,
      )}
    >
      {a.src && (
        <img
          src={a.src}
          alt={`${subject.name} – start`}
          decoding="async"
          onError={a.onError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {b.src && (
        <img
          src={b.src}
          alt={`${subject.name} – slutt`}
          decoding="async"
          onError={b.onError}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[420ms] ease-in-out"
          style={{ opacity: !a.src || frame === 1 ? 1 : 0 }}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent"
      />
      {animated && (
        <>
          <span className="glass absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-fg">
            {frame === 0 ? 'Start' : 'Slutt'}
          </span>
          <div className="absolute right-2 bottom-2 flex gap-1.5">
            {!playing && (
              <button
                type="button"
                onClick={() => setFrame((f) => (f === 0 ? 1 : 0))}
                className="glass pressable h-11 rounded-full px-3 text-[13px] font-semibold text-fg"
              >
                {frame === 0 ? 'Vis slutt' : 'Vis start'}
              </button>
            )}
            <button
              type="button"
              aria-label={playing ? 'Pause animasjon' : 'Spill animasjon'}
              aria-pressed={playing}
              onClick={() => setPlaying((p) => !p)}
              className="glass pressable flex h-11 w-11 items-center justify-center rounded-full text-fg"
            >
              {playing ? <IconPause size={18} /> : <IconPlay size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Lite, stille miniatyrbilde (startbildet) til lister. */
export function ExerciseThumb({
  subject,
  size = 48,
  className,
}: {
  subject: ImageSubject;
  size?: number;
  className?: string;
}) {
  const { src, onError } = useFallbackSrc(useSources(subject, 0));
  const initials = subject.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-3 text-xs font-bold text-muted',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={onError}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
