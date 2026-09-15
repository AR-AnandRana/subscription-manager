'use client';

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DataPoint } from '@/lib/stats';

/**
 * Charts paint with the same CSS custom properties as the rest of the app.
 *
 * The colours are passed through as `var(...)` rather than read with
 * getComputedStyle: a chart renders before the account's theme has been
 * applied, and a resolved colour would freeze at whatever the default palette
 * was. Letting the browser resolve the variable means switching theme recolours
 * the charts with no re-render.
 */
const MAIN = 'var(--main-color)';
const ACCENT = 'var(--accent-color)';
const HOVER = 'var(--hover-color)';
const GRID = 'var(--box-border-color)';
const TEXT = 'var(--text-muted)';
const CURSOR = 'rgba(var(--main-color-rgb), 0.08)';

/** Slice colours for split charts: the theme ramp, cycled. */
const SLICE_COLORS = [MAIN, ACCENT, HOVER];

interface ChartProps {
  title: string;
  subHeader?: string;
  data: DataPoint[];
  /** Renders in a double-width cell, matching upstream's `.graph.x2`. */
  wide?: boolean;
  formatValue?: (value: number) => string;
}

export function GraphCard({
  title,
  subHeader,
  wide,
  children,
}: {
  title: string;
  subHeader?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`graph${wide ? ' x2' : ''}`}>
      <header>
        {title}
        {subHeader && <div className="sub-header">({subHeader})</div>}
      </header>
      <div style={{ width: '100%', height: 260 }}>{children}</div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; payload?: DataPoint }[];
  label?: string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const name = label ?? point.payload?.label ?? '';
  const value = formatValue ? formatValue(point.value) : String(point.value);
  return (
    <div className="chart-tooltip">
      <strong>{name}</strong>
      <div>{value}</div>
    </div>
  );
}

export function BarGraph({ title, subHeader, data, wide, formatValue }: ChartProps) {
  return (
    <GraphCard title={title} subHeader={subHeader} wide={wide}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis
            tick={{ fill: TEXT, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => (formatValue ? formatValue(Number(value)) : String(value))}
            width={70}
          />
          <Tooltip cursor={{ fill: CURSOR }} content={<ChartTooltip formatValue={formatValue} />} />
          <Bar dataKey="y" fill={MAIN} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </GraphCard>
  );
}

export function LineGraph({ title, subHeader, data, wide, formatValue }: ChartProps) {
  return (
    <GraphCard title={title} subHeader={subHeader} wide={wide}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis
            tick={{ fill: TEXT, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => (formatValue ? formatValue(Number(value)) : String(value))}
            width={70}
          />
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
          <Line type="monotone" dataKey="y" stroke={MAIN} strokeWidth={2} dot={{ r: 3, fill: MAIN }} />
        </LineChart>
      </ResponsiveContainer>
    </GraphCard>
  );
}

export function PieGraph({ title, subHeader, data, wide, formatValue }: ChartProps) {
  return (
    <GraphCard title={title} subHeader={subHeader} wide={wide}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="y" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={SLICE_COLORS[index % SLICE_COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="graph-legend">
        {data.map((entry, index) => (
          <div className="graph-legend-item" key={entry.label}>
            <span
              className="graph-legend-dot"
              style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
            />
            {entry.label}
          </div>
        ))}
      </div>
    </GraphCard>
  );
}
