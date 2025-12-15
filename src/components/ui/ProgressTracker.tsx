interface ProgressTrackerProps {
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  if (progress.total === 0) return null;

  const percentage = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="mt-6">
      <div className="mb-2 flex justify-between">
        <span>Processing Progress</span>
        <span>
          {percentage}
          %
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 flex gap-4 text-sm">
        <span>
          Total:
          {progress.total}
        </span>
        <span className="text-green-600 dark:text-green-400">
          Completed:
          {' '}
          {progress.completed}
        </span>
        <span className="text-red-600 dark:text-red-400">
          Failed:
          {' '}
          {progress.failed}
        </span>
      </div>
    </div>
  );
}
