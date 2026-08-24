import { JobPerformanceData } from '@/app/api/analytics/types';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from 'recharts';

interface StatusPieData {
  name: string;
  value: number;
  fill: string;
}

type CustomLabelProps = PieLabelRenderProps & StatusPieData;

const getStatusColor = (status: string): string => {
  if (status === 'open') return '#10B981';
  if (status === 'closed') return '#6B7280';
  return '#F59E0B';
};

const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, outerRadius, percent, name, value } =
    props as CustomLabelProps;

  const RADIAN = Math.PI / 180;

  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof midAngle !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof percent !== 'number'
  ) {
    return null;
  }

  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="500"
    >
      {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
    </text>
  );
};

interface CustomTooltipProps extends TooltipProps<number, string> {
  payload?: {
    payload: unknown;
    value?: number | string;
  }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as StatusPieData;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{item.name}</p>
        <p className="text-foreground">
          Count: <span className="font-bold">{payload[0].value}</span>
        </p>
        <p className="text-foreground">
          Status:{' '}
          <span className="font-bold capitalize">
            {item.name.toLowerCase()}
          </span>
        </p>
      </div>
    );
  }
  return null;
}

export function JobStatusChart({ data }: { data: JobPerformanceData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[450px] items-center justify-center text-muted-foreground">
        No job performance data available.
      </div>
    );
  }

  const statusCounts = data.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieData: StatusPieData[] = Object.entries(statusCounts).map(
    ([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      fill: getStatusColor(status),
    }),
  );

  return (
    <ResponsiveContainer width="100%" height={450}>
      <PieChart>
        <Pie
          data={pieData as unknown as Record<string, unknown>[]}
          cx="50%"
          cy="50%"
          outerRadius={120}
          dataKey="value"
          nameKey="name"
          label={renderCustomLabel}
          labelLine={false}
        >
          {pieData.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={36} />
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
