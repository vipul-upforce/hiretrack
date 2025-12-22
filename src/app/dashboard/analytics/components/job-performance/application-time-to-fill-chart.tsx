import { JobPerformanceData } from '@/app/api/analytics/types';
import { Badge } from '@/components/ui/badge';
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

interface CustomTooltipProps extends TooltipProps<number, string> {
  payload?: {
    payload: unknown;
    value?: number | string;
  }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload[0]) {
    const item = payload[0].payload as JobPerformanceData;

    return (
      <span className="block rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{item.title}</p>
        <p className="text-foreground">
          Applications: <span className="font-bold">{item.applications}</span>
        </p>
        <p className="text-foreground">
          Time to Fill:{' '}
          <span className="font-bold">{item.timeToFill} days</span>
        </p>
        <p className="text-foreground">
          Success Rate: <span className="font-bold">{item.successRate}%</span>
        </p>
        <p className="text-foreground">
          Status: <Badge variant="outline">{item.status}</Badge>
        </p>
      </span>
    );
  }
  return null;
}

// Applications vs Time-to-Fill Scatter Plot
export function ApplicationsTimeScatterChart({
  data,
}: {
  data: JobPerformanceData[];
}) {
  const scatterData = data.map((job) => ({
    ...job,
    // Add size based on success rate for better visualization
    size: Math.max(job.successRate * 2, 5),
  }));

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[450px] items-center justify-center text-muted-foreground">
        No job performance data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ScatterChart
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 13,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="applications"
          name="Applications"
          label={{
            value: 'Number of Applications',
            position: 'insideBottom',
            offset: -10,
          }}
        />
        <YAxis
          dataKey="timeToFill"
          name="Time to Fill (Days)"
          label={{
            value: 'Time to Fill (Days)',
            angle: -90,
            position: 'insideLeft',
          }}
        />

        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={<CustomTooltip />}
        />

        <Scatter data={scatterData} fill="#8884d8">
          {scatterData.map((entry) => (
            <Cell
              key={`cell-${entry.title + entry.jobId}`}
              fill={entry.status === 'open' ? '#10B981' : '#6B7280'}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
