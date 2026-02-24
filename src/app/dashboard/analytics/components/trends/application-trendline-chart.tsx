import { TrendData } from '@/app/api/analytics/types';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendsTooltipProps extends TooltipProps<number, string> {
  showMovingAverage: boolean;
  payload?: {
    payload: unknown;
    value?: number | string;
  }[];
  label?: string;
}

function TrendsTooltip({
  active,
  payload,
  label,
  showMovingAverage,
}: TrendsTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as TrendData;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-foreground">
          Applications: <span className="font-bold">{item.applications}</span>
        </p>
        <p className="text-foreground">
          Growth Rate:{' '}
          <span
            className={`font-bold ${
              item.growthRate >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {item.growthRate >= 0 ? '+' : ''}
            {item.growthRate}%
          </span>
        </p>
        <p className="text-foreground">
          Job Diversity:{' '}
          <span className="font-bold">{item.jobDiversity} jobs</span>
        </p>
        <p className="text-foreground">
          Conversion Rate:{' '}
          <span className="font-bold">{item.conversionRate}%</span>
        </p>
        {showMovingAverage && item.movingAverage && (
          <p className="text-foreground">
            Moving Avg: <span className="font-bold">{item.movingAverage}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
}

export function ApplicationTrendsLineChart({
  data,
  showMovingAverage = true,
}: {
  data: TrendData[];
  showMovingAverage?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="date"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis
          label={{
            value: 'No. of Applications',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fontSize: 16 },
          }}
        />

        <Tooltip
          content={<TrendsTooltip showMovingAverage={showMovingAverage} />}
        />

        <Line
          type="monotone"
          dataKey="applications"
          stroke="#3B82F6"
          strokeWidth={3}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          name="Applications"
        />
        {showMovingAverage && (
          <Line
            type="monotone"
            dataKey="movingAverage"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Moving Average"
          />
        )}
        <Legend />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
