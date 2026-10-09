import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCamera, IconTrash, IconUpload } from '../../components/icons';
import { Button, Card, EmptyState, IconButton } from '../../components/ui';
import { addPhotos, removePhoto } from '../../data/progressOps';
import { db } from '../../db';
import { formatDate } from '../../lib/dates';
import { compressImage } from '../../services/images';
import type { Measurement } from '../../types';

function BlobImage({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={alt} className={className} />;
}

export function PhotosSection({
  measurements,
  today,
}: {
  measurements: Measurement[];
  today: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Sletting krever to trykk.
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const withPhotos = measurements
    .filter((m) => m.photos.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const all = withPhotos.flatMap((m) =>
    m.photos.map((photo, index) => ({ date: m.date, photo, index })),
  );
  const first = all[0];
  const last = all[all.length - 1];

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const blobs = await Promise.all([...files].map((f) => compressImage(f)));
      await addPhotos(db, today, blobs);
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (libraryRef.current) libraryRef.current.value = '';
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => cameraRef.current?.click()} disabled={busy}>
          <IconCamera /> Ta bilde
        </Button>
        <Button variant="secondary" onClick={() => libraryRef.current?.click()} disabled={busy}>
          <IconUpload /> Velg bilde
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-label="Ta progresjonsbilde"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Velg progresjonsbilder"
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>
      <p className="mt-2 text-xs text-muted">Bildene lagres bare på denne telefonen.</p>

      {all.length === 0 ? (
        <div className="mt-3">
          <EmptyState>Ingen bilder ennå.</EmptyState>
        </div>
      ) : (
        <>
          {first && last && all.length > 1 && (
            <Card className="mt-3 p-2">
              <div className="grid grid-cols-2 gap-2">
                {[first, last].map((p, i) => (
                  <figure key={i}>
                    <BlobImage
                      blob={p.photo}
                      alt={`${i === 0 ? 'Første' : 'Siste'} bilde, ${formatDate(p.date)}`}
                      className="aspect-[3/4] w-full rounded-xl object-cover"
                    />
                    <figcaption className="mt-1 text-center text-xs text-muted">
                      {i === 0 ? 'Første' : 'Siste'} · {formatDate(p.date)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          )}
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {all.map((p) => (
              <li key={`${p.date}-${p.index}`} className="relative">
                <BlobImage
                  blob={p.photo}
                  alt={`Bilde ${formatDate(p.date)}`}
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {formatDate(p.date)}
                </span>
                {confirmKey === `${p.date}-${p.index}` ? (
                  <button
                    type="button"
                    className="absolute top-0 right-0 min-h-11 rounded-lg bg-bad px-2 text-xs font-bold text-on-status"
                    onClick={() => {
                      setConfirmKey(null);
                      void removePhoto(db, p.date, p.index);
                    }}
                  >
                    Slett?
                  </button>
                ) : (
                  <IconButton
                    label={`Slett bilde fra ${formatDate(p.date)}`}
                    className="absolute top-0 right-0 bg-black/50 text-white"
                    onClick={() => setConfirmKey(`${p.date}-${p.index}`)}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
