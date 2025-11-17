import { TrendData } from "@/app/api/analytics/types";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const ApplicationTrendsLineChart: React.FC<{
  data: TrendData[];
  showMovingAverage?: boolean;
}> = ({ data, showMovingAverage = true }) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart
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
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload as TrendData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-foreground">
                    Applications:{" "}
                    <span className="font-bold">{data.applications}</span>
                  </p>
                  <p className="text-foreground">
                    Growth Rate:{" "}
                    <span
                      className={`font-bold ${data.growthRate >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {data.growthRate >= 0 ? "+" : ""}
                      {data.growthRate}%
                    </span>
                  </p>
                  <p className="text-foreground">
                    Job Diversity:{" "}
                    <span className="font-bold">{data.jobDiversity} jobs</span>
                  </p>
                  <p className="text-foreground">
                    Conversion Rate:{" "}
                    <span className="font-bold">{data.conversionRate}%</span>
                  </p>
                  {showMovingAverage && data.movingAverage && (
                    <p className="text-foreground">
                      Moving Avg:{" "}
                      <span className="font-bold">{data.movingAverage}</span>
                    </p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="applications"
          stroke="#3B82F6"
          strokeWidth={3}
          dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
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
};
