import { Link } from 'react-router-dom';
import { useAppData } from '../state/appData';
import { IconWarning } from './icons';
import { Card } from './ui';

/** Vises ved smerte ≥ rød-grensen eller to dager på rad med gult. */
export function BackAlertCard({ reason }: { reason: 'red' | 'two-yellow' | null }) {
  const { plan } = useAppData();
  const { painScale, redFlags, emergency } = plan.coreRoutine;
  const relevant = painScale.filter((p) => p.level !== 'grønn');
  return (
    <Card tone="bad" className="mb-4" role="alert" aria-label="Ryggvarsel">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <IconWarning className="text-bad" />
        {reason === 'red' ? 'Høy smerte i ryggen' : 'Gult to dager på rad'}
      </h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {relevant.map((p) => (
          <li key={p.level}>
            <span className="font-semibold capitalize">{p.level}:</span> {p.action}
          </li>
        ))}
      </ul>
      <h3 className="mt-3 text-sm font-semibold">Røde flagg – kontakt lege</h3>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {redFlags.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-bad/15 p-3 text-sm font-semibold">{emergency}</p>
      <Link to="/mer/core" className="mt-3 inline-block text-sm font-semibold text-accent">
        Se core- og ryggrutinen
      </Link>
    </Card>
  );
}
