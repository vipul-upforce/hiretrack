'use client';

import { Progress } from '@/components/ui/progress';
import type { CvBatchDetail } from '@/lib/features/org/cvBatchTypes';
import { dedupeBatchItemsByFilename } from '@/lib/cv-upload/batch-item-dedupe';
import {
  computeBatchDisplayCounts,
  deriveBatchDisplayStatus,
} from '@/lib/cv-upload/batch-display-stats';

export function BatchProgress({ batch }: { batch: CvBatchDetail }) {
  const counts = computeBatchDisplayCounts(batch);
  const displayStatus = deriveBatchDisplayStatus(batch);
  const progress = counts.total > 0
    ? ((counts.success + counts.failed) / counts.total) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Processing Status</h3>
        <span className="text-sm text-muted-foreground capitalize">
          {displayStatus}
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Total Files</p>
          <p className="font-medium">{counts.total}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Successful</p>
          <p className="font-medium text-green-600">{counts.success}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Failed</p>
          <p className="font-medium text-red-600">{counts.failed}</p>
        </div>
      </div>

      {batch.items && batch.items.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium">Processed Files</h4>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {dedupeBatchItemsByFilename(batch.items).map((item) => (
              <div
                key={item._id}
                className="flex flex-col gap-1 rounded border p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{item.filename}</span>
                  {item.parseProviderLabel ? (
                    <span className="block text-xs text-muted-foreground">
                      {item.parseProviderLabel}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                    item.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
