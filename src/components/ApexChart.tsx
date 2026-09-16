'use client';

import { useEffect, useRef } from 'react';
import type { DataPoint } from '@/lib/stats';

/**
 * Charts, ported from the original's scripts/stats.js.
 *
 * Wallos draws with ApexCharts, so this uses ApexCharts too, with the same
 * option sets: the same palette, the same donut hole, the same clickable legend
 * showing each slice's amount, the same smoothed area fill, and the same dashed
 * budget threshold on the projection. Colours come from the app's CSS custom
 * properties, so the charts follow the theme.
 */

const CHART_PALETTE = [
  '#008FFB',
  '#00E396',
  '#FEB019',
  '#FF4560',
  '#775DD0',
  '#546E7A',
  '#26a69a',
  '#D10CE8',
];

type ChartKind = 'donut' | 'area' | 'bar' | 'horizontalBar';

interface Props {
  kind: ChartKind;
  data: DataPoint[];
  /** ISO currency code; empty renders plain numbers, as upstream does. */
  currency?: string;
  /** Draws a dashed threshold line on a bar chart (the monthly budget). */
  threshold?: number | null;
}

function chartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    main: styles.getPropertyValue('--main-color').trim() || '#007BFF',
    text: styles.getPropertyValue('--text-color').trim() || '#202020',
    border: styles.getPropertyValue('--box-border-color').trim() || '#E8E8E8',
    error: styles.getPropertyValue('--error-color').trim() || '#EF4444',
    dark: document.body.classList.contains('dark'),
    font: "Barlow, 'Helvetica Neue', Helvetica, sans-serif",
  };
}

function formatter(currency?: string) {
  return (value: number) =>
    currency
      ? new Intl.NumberFormat(navigator.language, { style: 'currency', currency }).format(value)
      : new Intl.NumberFormat(navigator.language).format(value);
}

export function ApexChart({ kind, data, currency, threshold = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Captured now: by cleanup time the ref may already point elsewhere.
    const legendAtMount = legendRef.current;

    // Structural rather than `ApexCharts`, because the class is only imported
    // inside this effect; render() resolves to the chart, which we discard.
    type ChartInstance = {
      render: () => Promise<unknown>;
      destroy: () => void;
      updateOptions: (options: object) => void;
    };
    let chart: ChartInstance | null = null;
    let cancelled = false;

    import('apexcharts').then(({ default: ApexCharts }) => {
      if (cancelled || !containerRef.current) return;

      const theme = chartTheme();
      const fmt = formatter(currency);
      const base = {
        chart: {
          background: 'transparent',
          fontFamily: theme.font,
          toolbar: { show: false },
          zoom: { enabled: false },
        },
        theme: { mode: theme.dark ? ('dark' as const) : ('light' as const) },
        tooltip: { style: { fontFamily: theme.font }, y: { formatter: fmt } },
        legend: { show: false },
        grid: { borderColor: theme.border },
      };

      let options: Record<string, unknown>;

      if (kind === 'donut') {
        // The legend is built by hand so each entry can carry its amount and
        // toggle its slice, which is what upstream does.
        const hidden = new Array(data.length).fill(false);
        const subset = () => {
          const points = data.filter((_, index) => !hidden[index]);
          return {
            series: points.map((point) => point.y),
            labels: points.map((point) => `${point.label} (${fmt(point.y)})`),
            colors: CHART_PALETTE.filter((_, index) => !hidden[index]).slice(0, points.length),
          };
        };

        options = {
          ...base,
          chart: { ...base.chart, type: 'donut', height: 320 },
          ...subset(),
          dataLabels: { style: { fontFamily: theme.font, fontSize: '12px' }, dropShadow: { enabled: false } },
          plotOptions: { pie: { donut: { size: '55%' } } },
          stroke: { width: 0 },
        };

        const donut: ChartInstance = new ApexCharts(containerRef.current, options);
        chart = donut;
        void donut.render();

        const legend = legendRef.current;
        if (legend) {
          legend.innerHTML = '';
          data.forEach((point, index) => {
            const item = document.createElement('button');
            item.className = 'graph-legend-item';
            item.innerHTML =
              `<span class="graph-legend-dot" style="background:${CHART_PALETTE[index % CHART_PALETTE.length]}"></span>` +
              `${point.label} (${fmt(point.y)})`;
            item.addEventListener('click', () => {
              hidden[index] = !hidden[index];
              item.classList.toggle('graph-legend-item--off', hidden[index]);
              donut.updateOptions(subset());
            });
            legend.appendChild(item);
          });
        }
        return;
      }

      const categories = data.map((point) => point.label);
      const series = [{ name: currency || '', data: data.map((point) => point.y) }];

      if (kind === 'area') {
        // Mark the high and low so the extremes read at a glance.
        const values = data.map((point) => point.y);
        const discrete: object[] = [];
        if (values.length > 2) {
          const maxIndex = values.indexOf(Math.max(...values));
          const minIndex = values.indexOf(Math.min(...values));
          if (maxIndex !== minIndex) {
            const stroke = theme.dark ? '#171B23' : '#FFFFFF';
            discrete.push(
              { seriesIndex: 0, dataPointIndex: maxIndex, size: 5, fillColor: theme.main, strokeColor: stroke },
              { seriesIndex: 0, dataPointIndex: minIndex, size: 5, fillColor: theme.main, strokeColor: stroke },
            );
          }
        }
        options = {
          ...base,
          chart: { ...base.chart, type: 'area', height: 370 },
          series,
          xaxis: { categories, labels: { style: { fontFamily: theme.font, colors: theme.text } } },
          yaxis: { labels: { formatter: fmt, style: { fontFamily: theme.font, colors: theme.text } } },
          colors: [theme.main],
          stroke: { curve: 'smooth', width: 2 },
          fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } },
          markers: { size: 0, discrete, hover: { size: 5 } },
        };
      } else if (kind === 'bar') {
        const annotations: Record<string, unknown> = {};
        if (threshold != null) {
          annotations.yaxis = [
            {
              y: threshold,
              borderColor: theme.error,
              strokeDashArray: 5,
              label: {
                text: fmt(threshold),
                position: 'left',
                textAnchor: 'start',
                style: { color: theme.error, background: 'transparent', fontFamily: theme.font },
              },
            },
          ];
        }
        options = {
          ...base,
          chart: { ...base.chart, type: 'bar', height: 320 },
          series,
          xaxis: { categories, labels: { style: { fontFamily: theme.font, colors: theme.text } } },
          yaxis: { labels: { formatter: fmt, style: { fontFamily: theme.font, colors: theme.text } } },
          colors: [theme.main],
          plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
          dataLabels: { enabled: false },
          annotations,
        };
      } else {
        options = {
          ...base,
          chart: { ...base.chart, type: 'bar', height: Math.max(200, data.length * 36 + 60) },
          series,
          xaxis: {
            categories,
            labels: { formatter: fmt, style: { fontFamily: theme.font, colors: theme.text } },
          },
          yaxis: { labels: { style: { fontFamily: theme.font, colors: theme.text } } },
          colors: [theme.main],
          plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
          dataLabels: { enabled: false },
        };
      }

      const instance: ChartInstance = new ApexCharts(containerRef.current, options);
      chart = instance;
      void instance.render();
    });

    return () => {
      cancelled = true;
      chart?.destroy();
      if (legendAtMount) legendAtMount.innerHTML = '';
    };
  }, [kind, data, currency, threshold]);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%' }} />
      {kind === 'donut' && <div className="graph-legend" ref={legendRef} />}
    </>
  );
}

/** A chart in the original's `.graph` card, with its header and sub-header. */
export function Graph({
  title,
  subHeader,
  wide,
  children,
}: {
  title: React.ReactNode;
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
      {children}
    </section>
  );
}
