import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../components/ui';
import { formatNumber } from '../../lib/format';

const axisTick = { fill: 'var(--c-muted)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 12,
  color: 'var(--c-fg)',
};

export interface XY {
  x: number;
  y: number;
}

function niceDomain(values: number[], pad: number): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [Math.floor((min - pad) * 2) / 2, Math.ceil((max + pad) * 2) / 2];
}

function ChartCard({
  title,
  description,
  children,
  height = 'h-60',
}: {
  title: string;
  description: string;
  children: ReactNode;
  height?: string;
}) {
  return (
    <Card className="px-1 pt-3 pb-2">
      <h3 className="px-3 font-semibold">{title}</h3>
      <div className={`${height} mt-2 w-full`} role="img" aria-label={description}>
        {children}
      </div>
    </Card>
  );
}

const weekTicks = (weeks: number) => Array.from({ length: weeks / 2 + 1 }, (_, i) => i * 2);

/** Vektgraf: daglige punkter, ukesnitt, målkurve og stiplet prognose. x = uker siden start. */
export function WeightChart({
  daily,
  weekly,
  target,
  forecast,
  weeks,
}: {
  daily: XY[];
  weekly: XY[];
  target: XY[];
  forecast: XY[];
  weeks: number;
}) {
  const domain = niceDomain(
    [...daily, ...weekly, ...target, ...forecast].map((p) => p.y),
    0.3,
  );
  return (
    <ChartCard
      title="Vekt (kg)"
      description="Vektgraf med daglige målinger, ukesnitt, målkurve og prognose"
      height="h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="var(--c-chart-grid)" vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, weeks]}
            ticks={weekTicks(weeks)}
            tick={axisTick}
            tickFormatter={(v: number) => `U${v}`}
            allowDuplicatedCategory={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={domain}
            tick={axisTick}
            width={48}
            tickFormatter={(v: number) => formatNumber(v, 1)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => `${formatNumber(Number(v), 1)} kg`}
            labelFormatter={(v) => `Uke ${formatNumber(Number(v), 1)}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            data={target}
            dataKey="y"
            name="Målkurve"
            stroke="var(--c-muted)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            dot={false}
            isAnimationActive={false}
          />
          <Scatter
            data={daily}
            dataKey="y"
            name="Daglig"
            fill="var(--c-muted)"
            fillOpacity={0.7}
            isAnimationActive={false}
          />
          <Line
            data={weekly}
            dataKey="y"
            name="Ukesnitt"
            stroke="var(--c-accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--c-accent)', stroke: 'var(--c-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            data={forecast}
            dataKey="y"
            name="Prognose"
            stroke="var(--c-accent)"
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function WaistChart({
  points,
  goal,
  weeks,
}: {
  points: XY[];
  goal: [number, number];
  weeks: number;
}) {
  const domain = niceDomain([...points.map((p) => p.y), ...goal], 0.5);
  return (
    <ChartCard title="Livvidde (cm)" description="Graf over livvidde med målområde">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="var(--c-chart-grid)" vertical={false} />
          <ReferenceArea
            y1={goal[0]}
            y2={goal[1]}
            fill="var(--c-fg)"
            fillOpacity={0.06}
            label={{
              value: 'Mål',
              fill: 'var(--c-muted)',
              fontSize: 11,
              position: 'insideTopLeft',
            }}
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, weeks]}
            ticks={weekTicks(weeks)}
            tick={axisTick}
            tickFormatter={(v: number) => `U${v}`}
          />
          <YAxis
            domain={domain}
            tick={axisTick}
            width={48}
            tickFormatter={(v: number) => formatNumber(v, 1)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`${formatNumber(Number(v), 1)} cm`, 'Livvidde']}
            labelFormatter={(v) => `Uke ${formatNumber(Number(v), 1)}`}
          />
          <Line
            dataKey="y"
            name="Livvidde"
            stroke="var(--c-accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--c-accent)', stroke: 'var(--c-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function StepsChart({
  data,
}: {
  data: { week: string; avg: number | null; goal: number }[];
}) {
  return (
    <ChartCard
      title="Skritt per dag (ukesnitt)"
      description="Stolper med ukesnitt for skritt og mål"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--c-chart-grid)" vertical={false} />
          <XAxis dataKey="week" tick={axisTick} />
          <YAxis
            tick={axisTick}
            width={52}
            tickFormatter={(v: number) => formatNumber(v / 1000, 1) + 'k'}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v, name) => [formatNumber(Number(v)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="avg"
            name="Snitt"
            fill="var(--c-accent)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            dataKey="goal"
            name="Dagsmål"
            type="step"
            stroke="var(--c-muted)"
            strokeWidth={2}
            strokeDasharray="2 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AttendanceChart({
  data,
  perWeek,
}: {
  data: { week: string; done: number }[];
  perWeek: number;
}) {
  return (
    <ChartCard
      title={`Treningsoppmøte (av ${perWeek} per uke)`}
      description="Stolper med fullførte økter per uke"
      height="h-48"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -24 }}>
          <CartesianGrid stroke="var(--c-chart-grid)" vertical={false} />
          <XAxis dataKey="week" tick={axisTick} />
          <YAxis
            domain={[0, perWeek]}
            ticks={Array.from({ length: perWeek + 1 }, (_, i) => i)}
            tick={axisTick}
            allowDecimals={false}
            width={40}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} av ${perWeek}`, 'Økter']} />
          <Bar
            dataKey="done"
            name="Økter"
            fill="var(--c-accent)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
