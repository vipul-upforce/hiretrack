import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendData } from './ApplicationTrendsChart';

export const GrowthRateChart: React.FC<{ data: TrendData[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={450}>
    <BarChart
      data={data}
      margin={{
        top: 20, right: 30, left: 20, bottom: 60,
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
      <YAxis />
      <Tooltip
        content={({ active, payload, label }) => {
          if (active && payload && payload[0]) {
            const value = payload[0].value as number;
            return (
              <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-semibold text-foreground">
                  Period:
                  {' '}
                  {label}
                </p>
                <p className="text-foreground">
                  Growth Rate:
                  {' '}
                  <span
                    className={`font-bold ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {value >= 0 ? '+' : ''}
                    {value}
                    %
                    </span>
                </p>
              </div>
            );
          }
          return null;
        }}
      />
      <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
      <Bar dataKey="growthRate" radius={[2, 2, 2, 2]} opacity={0.8}>
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={entry?.growthRate! >= 0 ? '#10B981' : '#EF4444'}
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
