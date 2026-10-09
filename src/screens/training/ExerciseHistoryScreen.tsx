import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExerciseImagePair } from '../../components/ExerciseImage';
import { IconTrophy, IconWarning } from '../../components/icons';
import { Badge, Card, EmptyState, Page, PageHeader, SectionTitle } from '../../components/ui';
import { db } from '../../db';
import { formatDate, formatDateShort } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { exerciseHistory, formatSets, isStalled } from '../../lib/progression';
import { useAppData } from '../../state/appData';

export function ExerciseHistoryScreen() {
  const { exerciseId = '' } = useParams();
  const { exercisesById, plan } = useAppData();
  const exercise = exercisesById.get(exerciseId);
  const logs = useLiveQuery(() => db.workoutLogs.where('status').equals('done').toArray(), []);
  const history = useMemo(() => exerciseHistory(logs ?? [], exerciseId), [logs, exerciseId]);

  if (!exercise) {
    return (
      <Page>
        <PageHeader title="Øvelse" back />
        <EmptyState>Fant ikke øvelsen.</EmptyState>
      </Page>
    );
  }

  const prIndex = history.reduce(
    (best, h, i) => (h.bestE1rm > (history[best]?.bestE1rm ?? -1) ? i : best),
    -1,
  );
  const pr = prIndex >= 0 ? history[prIndex] : undefined;
  const stalled = isStalled(history.map((h) => h.bestE1rm));
  const data = history.map((h) => ({
    label: formatDateShort(h.date),
    e1rm: Math.round(h.bestE1rm * 10) / 10,
    heaviest: h.heaviest?.kg ?? null,
  }));

  return (
    <Page>
      <PageHeader title={exercise.name} subtitle="Historikk" back />
      <ExerciseImagePair subject={exercise} />

      {pr && (
        <Card className="mt-4" tone="good">
          <div className="flex items-center gap-2">
            <IconTrophy className="text-good" />
            <div>
              <div className="text-sm text-muted">Beste e1RM (PR)</div>
              <div className="tabular text-2xl font-bold">{formatNumber(pr.bestE1rm, 1)} kg</div>
              <div className="text-sm text-muted">
                {formatDate(pr.date)} ·{' '}
                {pr.heaviest ? `${formatNumber(pr.heaviest.kg, 2)} × ${pr.heaviest.reps}` : ''}
              </div>
            </div>
          </div>
        </Card>
      )}

      {stalled && (
        <Card className="mt-3" tone="warn">
          <p className="flex gap-2 text-sm">
            <IconWarning size={18} className="shrink-0 text-warn" />
            {plan.progression.stallRule}
          </p>
        </Card>
      )}

      <SectionTitle>Utvikling</SectionTitle>
      {history.length < 2 ? (
        <EmptyState>Grafen vises når du har logget øvelsen minst to ganger.</EmptyState>
      ) : (
        <Card className="px-1 py-3">
          <div className="h-56 w-full" role="img" aria-label="Graf over beste e1RM og tyngste sett">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="var(--c-chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--c-muted)', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: 'var(--c-muted)', fontSize: 12 }}
                  domain={['auto', 'auto']}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-line)',
                    borderRadius: 12,
                  }}
                  formatter={(v) => `${formatNumber(Number(v), 1)} kg`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  name="Beste e1RM"
                  stroke="var(--c-accent)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="heaviest"
                  name="Tyngste sett"
                  stroke="var(--c-series-2)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <SectionTitle>Økter</SectionTitle>
      {history.length === 0 ? (
        <EmptyState>Ingen loggede sett ennå.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...history].reverse().map((h) => (
            <li key={h.logId}>
              <Link
                to={`/trening/okt/${h.logId}`}
                className="block rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{formatDate(h.date)}</span>
                  {h === pr && history.length > 1 && (
                    <Badge tone="good">
                      <IconTrophy size={14} /> PR
                    </Badge>
                  )}
                </div>
                <div className="tabular text-sm text-muted">
                  {formatSets(h.sets)} · e1RM {formatNumber(h.bestE1rm, 1)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
