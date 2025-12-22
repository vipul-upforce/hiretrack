import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  PieLabelRenderProps,
} from 'recharts';
import { FunnelData } from './CandidateFunnelChart';

type CustomLabelProps = PieLabelRenderProps & FunnelData;

const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, outerRadius, percent, stage, count } =
    props as CustomLabelProps;

  const RADIAN = Math.PI / 180;

  if (
    typeof midAngle !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof percent !== 'number'
  ) {
    return null;
  }

  // Calculate position
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Hide labels <2%
  if (percent < 0.02) return null;

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
      {`${stage}: ${count} (${(percent * 100).toFixed(1)}%)`}
    </text>
  );
};

interface CustomTooltipProps extends TooltipProps<number, string> {
  totalCount: number;
  payload?: {
    payload: unknown;
    value: number;
  }[];
}

function CustomTooltip({ active, payload, totalCount }: CustomTooltipProps) {
  if (active && payload && payload[0]) {
    // Cast strictly to FunnelData
    const dataItem = payload[0].payload as FunnelData;
    const count = payload[0].value as number;
    const percentage =
      totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{dataItem.stage}</p>
        <p className="text-foreground">
          Count: <span className="font-bold">{count}</span>
        </p>
        <p className="text-foreground">
          Percentage: <span className="font-bold">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
}

export function StageDistributionChart({ data }: { data: FunnelData[] }) {
  const pieData = data.filter((item) => item.count > 0);

  // Calculate total count
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieData as unknown as Record<string, unknown>[]}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="count"
          nameKey="stage"
          label={renderCustomLabel}
          labelLine={false}
        >
          {pieData.map((entry) => (
            <Cell
              key={`cell-${entry.stage + entry.conversionRate}`}
              fill={entry.color}
            />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={36} />

        <Tooltip content={<CustomTooltip totalCount={totalCount} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
