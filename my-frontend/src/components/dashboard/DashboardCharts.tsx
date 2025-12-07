/**
 * Dashboard Chart Components
 * Line, Bar, and Donut charts using Chart.js
 */

'use client';

import React, { useEffect, useRef } from 'react';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ============================================================================
// Types
// ============================================================================

interface BaseChartProps {
  title?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  className?: string;
}

interface LineChartProps extends BaseChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

interface BarChartProps extends BaseChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  horizontal?: boolean;
  stacked?: boolean;
}

interface DonutChartProps extends BaseChartProps {
  labels: string[];
  data: number[];
  colors?: string[];
  cutout?: string;
  showLegend?: boolean;
}

// ============================================================================
// Color Palette
// ============================================================================

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280',
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
  COLORS.pink,
  COLORS.gray,
];

// ============================================================================
// Skeleton Loader
// ============================================================================

const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div
    className="animate-pulse bg-gray-100 rounded-lg flex items-center justify-center"
    style={{ height }}
  >
    <div className="text-gray-400 text-sm">Loading chart...</div>
  </div>
);

// ============================================================================
// Error State
// ============================================================================

const ChartError: React.FC<{ error: string; height: number }> = ({ error, height }) => (
  <div
    className="bg-red-50 border border-red-200 rounded-lg flex items-center justify-center"
    style={{ height }}
  >
    <div className="text-center p-4">
      <div className="text-red-500 text-sm mb-1">⚠️ Chart Error</div>
      <div className="text-gray-500 text-xs">{error}</div>
    </div>
  </div>
);

// ============================================================================
// Chart Card Wrapper
// ============================================================================

interface ChartCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className = '',
  actions,
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

// ============================================================================
// Line Chart
// ============================================================================

export const LineChart: React.FC<LineChartProps> = ({
  title,
  labels,
  datasets,
  height = 250,
  loading = false,
  error,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading || error) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.borderColor || CHART_COLORS[i % CHART_COLORS.length],
          backgroundColor: ds.fill
            ? `${ds.backgroundColor || CHART_COLORS[i % CHART_COLORS.length]}20`
            : 'transparent',
          fill: ds.fill ?? false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: { size: 11 },
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: { font: { size: 10 } },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [labels, datasets, loading, error]);

  return (
    <ChartCard title={title} className={className}>
      {loading ? (
        <ChartSkeleton height={height} />
      ) : error ? (
        <ChartError error={error} height={height} />
      ) : (
        <div style={{ height }}>
          <canvas ref={chartRef} />
        </div>
      )}
    </ChartCard>
  );
};

// ============================================================================
// Bar Chart
// ============================================================================

export const BarChart: React.FC<BarChartProps> = ({
  title,
  labels,
  datasets,
  height = 250,
  loading = false,
  error,
  horizontal = false,
  stacked = false,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading || error) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.backgroundColor || CHART_COLORS[i % CHART_COLORS.length],
          borderColor: ds.borderColor || CHART_COLORS[i % CHART_COLORS.length],
          borderWidth: 1,
          borderRadius: 4,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: { size: 11 },
            },
          },
        },
        scales: {
          x: {
            stacked,
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            stacked,
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: { font: { size: 10 } },
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [labels, datasets, horizontal, stacked, loading, error]);

  return (
    <ChartCard title={title} className={className}>
      {loading ? (
        <ChartSkeleton height={height} />
      ) : error ? (
        <ChartError error={error} height={height} />
      ) : (
        <div style={{ height }}>
          <canvas ref={chartRef} />
        </div>
      )}
    </ChartCard>
  );
};

// ============================================================================
// Donut Chart
// ============================================================================

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  labels,
  data,
  colors = CHART_COLORS,
  height = 250,
  cutout = '60%',
  showLegend = true,
  loading = false,
  error,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading || error) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors.slice(0, data.length),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout,
        plugins: {
          legend: {
            display: showLegend,
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = data.reduce((a, b) => a + b, 0);
                const value = context.raw as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [labels, data, colors, cutout, showLegend, loading, error]);

  return (
    <ChartCard title={title} className={className}>
      {loading ? (
        <ChartSkeleton height={height} />
      ) : error ? (
        <ChartError error={error} height={height} />
      ) : (
        <div style={{ height }}>
          <canvas ref={chartRef} />
        </div>
      )}
    </ChartCard>
  );
};

// ============================================================================
// Empty State for Charts
// ============================================================================

interface EmptyChartProps {
  title?: string;
  message?: string;
  height?: number;
  className?: string;
}

export const EmptyChart: React.FC<EmptyChartProps> = ({
  title,
  message = 'No data available',
  height = 250,
  className = '',
}) => (
  <ChartCard title={title} className={className}>
    <div
      className="flex items-center justify-center bg-gray-50 rounded-lg"
      style={{ height }}
    >
      <div className="text-center text-gray-500">
        <div className="text-2xl mb-2">📊</div>
        <div className="text-sm">{message}</div>
      </div>
    </div>
  </ChartCard>
);

export default { LineChart, BarChart, DonutChart, ChartCard, EmptyChart };
