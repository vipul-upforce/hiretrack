import { JobPerformanceData } from '@/app/api/analytics/types';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export const TopJobsChart: React.FC<{ data: JobPerformanceData[] }> = ({ data }) => {
  const topJobs = [...data]
    .filter((job) => job.applications >= 3)
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 10);

  if (topJobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No jobs have at least 3 applications to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={topJobs}
        margin={{
          top: 20, right: 30, left: 20, bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="title"
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
              const data = payload[0].payload as JobPerformanceData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p>
                    Applications:
                    <span className="font-bold">{data.applications}</span>
                  </p>
                  <p>
                    Accepted:
                    <span className="font-bold text-green-600 dark:text-green-400">{data.accepted}</span>
                  </p>
                  <p>
                    Success Rate:
                    <span className="font-bold">
                      {data.successRate}
                      %
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="applications"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
