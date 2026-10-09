import { useEffect, useMemo, useState } from 'react';
import { cx } from '../lib/cx';
import type { Exercise } from '../types';

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

/** Ett øvelsesbilde: eget bilde → bilde i appen → Free Exercise DB → plassholder. */
export function ExerciseImage({
  subject,
  index,
  className,
}: {
  subject: ImageSubject;
  index: 0 | 1;
  className?: string;
}) {
  const custom = subject.customImages?.[index];
  const customUrl = useBlobUrl(custom);
  const sources = useMemo(() => {
    const list: string[] = [];
    if (customUrl) list.push(customUrl);
    if (subject.imageSourceId) {
      list.push(localImageUrl(subject.imageSourceId, index));
      list.push(remoteImageUrl(subject.imageSourceId, index));
    }
    return list;
  }, [customUrl, subject.imageSourceId, index]);

  const key = sources.join('|');
  const [state, setState] = useState({ key, attempt: 0 });
  const attempt = state.key === key ? state.attempt : 0;
  const src = sources[attempt];

  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${subject.name} (mangler bilde)`}
        className={cx(
          'flex aspect-[3/2] w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 p-2 text-center text-sm font-semibold text-muted',
          className,
        )}
      >
        {subject.name}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${subject.name} – ${index === 0 ? 'start' : 'slutt'}`}
      loading="lazy"
      decoding="async"
      onError={() => setState({ key, attempt: attempt + 1 })}
      className={cx('aspect-[3/2] w-full rounded-xl bg-surface-2 object-cover', className)}
    />
  );
}

/** Start → slutt side om side. */
export function ExerciseImagePair({ subject }: { subject: ImageSubject }) {
  const customCount = subject.customImages?.length ?? 0;
  if (!subject.imageSourceId && customCount <= 1) {
    return <ExerciseImage subject={subject} index={0} />;
  }
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
      <ExerciseImage subject={subject} index={0} />
      <span aria-hidden="true" className="text-muted">
        →
      </span>
      <ExerciseImage subject={subject} index={1} />
    </div>
  );
}
