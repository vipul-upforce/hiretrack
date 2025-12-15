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

export const CustomFunnelChart: React.FC<{ data: FunnelData[] }> = ({
  data,
}) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart
      data={data}
      margin={{
        top: 20, right: 30, left: 20, bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="stage" />
      <YAxis />
      <Tooltip
        content={({ active, payload, label }) => {
          if (active && payload && payload[0]) {
            const data = payload[0].payload as FunnelData;
            return (
              <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-foreground">
                  Count:
                  {' '}
                  <span className="font-bold">{data.count}</span>
                </p>
                <p className="text-foreground">
                  Conversion Rate:
                  {' '}
                  <span className="font-bold">
                    {data.conversionRate}
                    %
                    </span>
                </p>
                <p className="text-foreground">
                  Avg Time:
                  {' '}
                  <span className="font-bold">
                    {data.avgTimeInDays}
                    {' '}
                    days
                    </span>
                </p>
              </div>
            );
          }
          return null;
        }}
      />
      <Bar dataKey="count" radius={[4, 4, 0, 0]} opacity={0.8}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
