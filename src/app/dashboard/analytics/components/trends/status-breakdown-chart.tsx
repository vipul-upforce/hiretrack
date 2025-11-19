import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendData } from "./ApplicationTrendsChart";

// Status Breakdown Area Chart
export const StatusBreakdownAreaChart: React.FC<{ data: TrendData[] }> = ({
  data,
}) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Area
          type="monotone"
          dataKey="acceptedCount"
          stackId="1"
          stroke="#10B981"
          fill="#10B981"
          name="Accepted"
        />
        <Area
          type="monotone"
          dataKey="processingCount"
          stackId="1"
          stroke="#F59E0B"
          fill="#F59E0B"
          name="Processing"
        />
        <Area
          type="monotone"
          dataKey="screeningCount"
          stackId="1"
          stroke="#3B82F6"
          fill="#3B82F6"
          name="Screening"
        />
        <Area
          type="monotone"
          dataKey="appliedCount"
          stackId="1"
          stroke="#6B7280"
          fill="#6B7280"
          name="Applied"
        />
        <Area
          type="monotone"
          dataKey="rejectedCount"
          stackId="1"
          stroke="#EF4444"
          fill="#EF4444"
          name="Rejected"
        />
        <Legend />
      </AreaChart>
    </ResponsiveContainer>
  );
};
