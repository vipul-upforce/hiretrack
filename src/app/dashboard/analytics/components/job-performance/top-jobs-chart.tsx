import { JobPerformanceData } from '@/app/api/analytics/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

interface TopJobsTooltipProps extends TooltipProps<number, string> {
  payload?: {
    payload: unknown;
    value?: number | string;
  }[];
  label?: string;
}

function TopJobsTooltip({ active, payload, label }: TopJobsTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as JobPerformanceData;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p>
          Applications: <span className="font-bold">{item.applications}</span>
        </p>
        <p>
          Accepted:{' '}
          <span className="font-bold text-green-600 dark:text-green-400">
            {item.accepted}
          </span>
        </p>
        <p>
          Success Rate: <span className="font-bold">{item.successRate}%</span>
        </p>
      </div>
    );
  }
  return null;
}

export function TopJobsChart({ data }: { data: JobPerformanceData[] }) {
  const topJobs = [...data]
    .filter((job) => job.applications >= 3)
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 10);

  if (topJobs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No jobs have at least 3 applications to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={topJobs}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="title"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />

        <Tooltip content={<TopJobsTooltip />} />

        <Bar
          dataKey="applications"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
