import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface SummaryProps {
  summary: {
    totalCandidates: number;
    acceptedCandidates: number;
    rejectedCandidates: number;
    overallConversionRate: number;
  };
}

export function SummaryCards({ summary }: SummaryProps) {
  const cards = [
    {
      label: 'Total Applications',
      value: summary.totalCandidates,
      color: 'blue',
    },
    {
      label: 'Accepted',
      value: summary.acceptedCandidates,
      color: 'green',
    },
    {
      label: 'Rejected',
      value: summary.rejectedCandidates,
      color: 'red',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-${c.color}-50 dark:bg-${c.color}-950/20 p-4 rounded-lg border border-${c.color}-200 dark:border-${c.color}-800`}
        >
          <div className={`text-2xl font-bold text-${c.color}-600 dark:text-${c.color}-400`}>
            {c.value}
          </div>
          <div className={`text-sm text-${c.color}-600 dark:text-${c.color}-400`}>
            {c.label}
          </div>
        </div>
      ))}

      {/* Conversion card */}
      <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summary.overallConversionRate}
            %
          </div>
          {summary.overallConversionRate > 10 ? (
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDownIcon className="h-4 w-4 text-red-500" />
          )}
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-400">
          Success Rate
        </div>
      </div>
    </div>
  );
}
