import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { FunnelData } from "./CandidateFunnelChart";

export const StageDistributionChart: React.FC<{ data: FunnelData[] }> = ({ data }) => {
  const pieData = data.filter((item) => item.count > 0);

  // Calculate total count from original data (including stages with 0 count)
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    stage,
    count,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
  // Hide labels <2%
  if (percent < 0.02) return null;

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
        {`${stage}: ${count} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieData as { stage: string; count: number; color: string }[]}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="count"
          nameKey="stage"
          label={renderCustomLabel}
          labelLine={false}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={36} />

        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              const count = payload[0].value as number;
              const percentage =
                totalCount > 0
                  ? ((count / totalCount) * 100).toFixed(1)
                  : "0.0";

              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.stage}</p>
                  <p className="text-foreground">
                    Count: <span className="font-bold">{count}</span>
                  </p>
                  <p className="text-foreground">
                    Percentage: <span className="font-bold">{percentage}%</span>
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
