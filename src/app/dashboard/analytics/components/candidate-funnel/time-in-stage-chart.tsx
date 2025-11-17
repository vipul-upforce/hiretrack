import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FunnelData } from "../CandidateFunnelChart";

export const TimeInStageChart: React.FC<{ data: FunnelData[] }> = ({
  data,
}) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const value = payload[0].value as number;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">
                    Stage: {label}
                  </p>
                  <p className="text-foreground">
                    Average Time:{" "}
                    <span className="font-bold">{value} days</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="avgTimeInDays"
          fill="#10B981"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
