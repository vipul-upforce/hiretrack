import { JobPerformanceData } from "@/app/api/analytics/types";
import { Badge } from "@/components/ui/badge";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Applications vs Time-to-Fill Scatter Plot
export const ApplicationsTimeScatterChart: React.FC<{
  data: JobPerformanceData[];
}> = ({ data }) => {
  const scatterData = data.map((job) => ({
    ...job,
    // Add size based on success rate for better visualization
    size: Math.max(job.successRate * 2, 5),
  }));

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[450px] text-muted-foreground">
        No job performance data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 13 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="applications"
          name="Applications"
          label={{
            value: "Number of Applications",
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          dataKey="timeToFill"
          name="Time to Fill (Days)"
          label={{
            value: "Time to Fill (Days)",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload as JobPerformanceData;
              return (
                <span className="bg-background border block rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.title}</p>
                  <p className="text-foreground">
                    Applications:{" "}
                    <span className="font-bold">{data.applications}</span>
                  </p>
                  <p className="text-foreground">
                    Time to Fill:{" "}
                    <span className="font-bold">{data.timeToFill} days</span>
                  </p>
                  <p className="text-foreground">
                    Success Rate:{" "}
                    <span className="font-bold">{data.successRate}%</span>
                  </p>
                  <p className="text-foreground">
                    Status: <Badge variant="outline">{data.status}</Badge>
                  </p>
                </span>
              );
            }
            return null;
          }}
        />
        <Scatter data={scatterData} fill="#8884d8">
          {scatterData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.status === "open" ? "#10B981" : "#6B7280"}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};
