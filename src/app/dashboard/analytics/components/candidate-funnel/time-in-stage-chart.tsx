import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FunnelData } from './CandidateFunnelChart';

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: unknown;
    value?: number | string;
  }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as FunnelData;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">Stage: {label}</p>
        <p className="text-foreground">
          Average Time:{' '}
          <span className="font-bold">{item.avgTimeInDays} days</span>
        </p>
      </div>
    );
  }
  return null;
}

export function TimeInStageChart({ data }: { data: FunnelData[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="stage" />
        <YAxis />

        <Tooltip content={<CustomTooltip />} />

        <Bar
          dataKey="avgTimeInDays"
          fill="#10B981"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
