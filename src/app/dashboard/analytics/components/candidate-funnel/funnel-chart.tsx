import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as FunnelData;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-foreground">
          Count: <span className="font-bold">{item.count}</span>
        </p>
        <p className="text-foreground">
          Conversion Rate:{' '}
          <span className="font-bold">{item.conversionRate}%</span>
        </p>
        <p className="text-foreground">
          Avg Time: <span className="font-bold">{item.avgTimeInDays} days</span>
        </p>
      </div>
    );
  }
  return null;
}

export function CustomFunnelChart({ data }: { data: FunnelData[] }) {
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

        <Bar dataKey="count" radius={[4, 4, 0, 0]} opacity={0.8}>
          {data.map((entry) => (
            <Cell
              key={`cell-${entry.avgTimeInDays + entry.stage}`}
              fill={entry.color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
