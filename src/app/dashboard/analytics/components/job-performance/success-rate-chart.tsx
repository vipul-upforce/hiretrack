import { JobPerformanceData } from '@/app/api/analytics/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

interface CustomTooltipProps extends TooltipProps<number, string> {
  payload?: {
    value?: number;
    payload: unknown;
  }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const { value } = payload[0];

    if (typeof value !== 'number') {
      return null;
    }

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">Job: {label}</p>
        <p className="text-foreground">
          Success Rate:{' '}
          <span
            className={`font-bold ${value >= 20 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {value}%
          </span>
        </p>
      </div>
    );
  }
  return null;
}

// Success Rate Analysis Chart
export function SuccessRateChart({ data }: { data: JobPerformanceData[] }) {
  const successData = [...data]
    .filter((job) => job.applications >= 3)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 10);

  if (successData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No jobs have at least 3 applications to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={successData}
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

        <Tooltip content={<CustomTooltip />} />

        <ReferenceLine
          y={20}
          stroke="#EF4444"
          strokeDasharray="5 5"
          label="Target: 20%"
        />
        <Bar dataKey="successRate" radius={[4, 4, 0, 0]} opacity={0.8}>
          {successData.map((entry) => (
            <Cell
              key={`cell-${entry.jobId + entry.createdAt}`}
              fill={entry.successRate >= 20 ? '#10B981' : '#EF4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
