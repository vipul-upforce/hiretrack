import { AssignmentData } from '@/app/api/analytics/types';
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

interface WorkloadTooltipProps extends TooltipProps<number, string> {
  payload?: {
    payload: unknown;
    value?: number | string;
  }[];
}

function WorkloadTooltip({ active, payload }: WorkloadTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as AssignmentData;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{item.interviewerName}</p>
        <p className="text-foreground">
          Total Pending Assignments:{' '}
          <span className="font-bold">{item.assignments}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function WorkloadDistributionChart({
  data,
}: {
  data: AssignmentData[];
}) {
  const chartData = data.slice(0, 10).map((interviewer) => ({
    ...interviewer,
    name:
      interviewer.interviewerName.length > 15
        ? `${interviewer.interviewerName.substring(0, 12)}...`
        : interviewer.interviewerName,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-foreground/70">No assignment data available.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />

        <Tooltip content={<WorkloadTooltip />} />

        <Bar
          dataKey="assignments"
          fill="#3B82F6"
          radius={[5, 5, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
