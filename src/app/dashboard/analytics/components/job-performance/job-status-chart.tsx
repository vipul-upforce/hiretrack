import { JobPerformanceData } from "@/app/api/analytics/types";
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Job Status Distribution Pie Chart
export const JobStatusChart: React.FC<{ data: JobPerformanceData[] }> = ({
  data,
}) => {
  const statusCounts = data.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill:
      status === "open"
        ? "#10B981"
        : status === "closed"
          ? "#6B7280"
          : "#F59E0B",
  }));

  // Custom label component for better dark mode support
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    name,
    value,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[450px] text-muted-foreground">
        No job performance data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={120}
          dataKey="value"
          nameKey="name"
          label={renderCustomLabel}
          labelLine={false}
        />
        <Legend verticalAlign="bottom" height={36} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.name}</p>
                  <p className="text-foreground">
                    Count: <span className="font-bold">{payload[0].value}</span>
                  </p>
                  <p className="text-foreground">
                    Status:{" "}
                    <span className="font-bold capitalize">
                      {data.name.toLowerCase()}
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
