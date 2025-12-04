import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendData } from './ApplicationTrendsChart';

export const ConversionRateChart: React.FC<{ data: TrendData[] }> = ({
  data,
}) => (
  <ResponsiveContainer width="100%" height={450}>
    <LineChart
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
      <YAxis
        label={{
          value: 'Acceptance / Rejection Rate (%)',
          angle: -90,
          position: 'insideLeft',
          style: { textAnchor: 'middle', fontSize: 16 },
        }}
      />
      <Tooltip
        content={({ active, payload, label }) => {
          if (active && payload && payload.length > 0) {
            return (
              <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-semibold text-foreground">{label}</p>
                {payload.map((entry, index) => (
                  <p key={index} className="text-foreground">
                    {entry.name}
                    :
                      {' '}
                    <span className="font-bold">
                        {entry.value}
                        %
                      </span>
                  </p>
                ))}
              </div>
            );
          }
          return null;
        }}
      />
      <ReferenceLine
        y={20}
        stroke="#10B981"
        strokeDasharray="5 5"
        label="Target: 20%"
      />
      <Line
        type="monotone"
        dataKey="conversionRate"
        stroke="#10B981"
        strokeWidth={2}
        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
        name="Conversion Rate"
      />
      <Line
        type="monotone"
        dataKey="rejectionRate"
        stroke="#EF4444"
        strokeWidth={2}
        dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
        name="Rejection Rate"
      />
      <Legend />
    </LineChart>
  </ResponsiveContainer>
);
