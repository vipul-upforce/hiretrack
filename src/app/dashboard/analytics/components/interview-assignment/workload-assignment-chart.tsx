import { AssignmentData } from '@/app/api/analytics/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const WorkloadDistributionChart: React.FC<{
  data: AssignmentData[];
}> = ({ data }) => {
  const chartData = data.slice(0, 10).map((interviewer) => ({
    ...interviewer,
    name:
      interviewer.interviewerName.length > 15
        ? `${interviewer.interviewerName.substring(0, 12)}...`
        : interviewer.interviewerName,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-foreground/70">No assignment data available.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={chartData}
        margin={{
          top: 20, right: 30, left: 20, bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="name"
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
              const data = payload[0].payload as AssignmentData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">
                    {data.interviewerName}
                  </p>
                  <p className="text-foreground">
                    Total Pending Assignments:
                    {' '}
                    <span className="font-bold">{data.assignments}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="assignments"
          fill="#3B82F6"
          radius={[5, 5, 0, 0]}
          opacity={0.8}
        />

      </BarChart>
    </ResponsiveContainer>
  );
};
