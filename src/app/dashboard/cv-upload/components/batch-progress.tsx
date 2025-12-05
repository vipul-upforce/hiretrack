'use client';

import { Progress } from '@/components/ui/progress';
import { Batch } from './cv-batch-processor';

export function BatchProgress({ batch }: { batch: Batch }) {
  const progress = batch.totalFiles > 0
    ? ((batch.successCount + batch.failureCount) / batch.totalFiles) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Processing Status</h3>
        <span className="text-sm text-muted-foreground capitalize">
          {batch?.status}
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Total Files</p>
          <p className="font-medium">{batch.totalFiles}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Successful</p>
          <p className="font-medium text-green-600">{batch.successCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Failed</p>
          <p className="font-medium text-red-600">{batch.failureCount}</p>
        </div>
      </div>

      {batch.items && batch.items.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Processed Files</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {batch.items.map((item) => (
              <div
                key={item._id}
                className="text-sm p-2 rounded border flex items-center justify-between"
              >
                <span className="truncate flex-1">{item.filename}</span>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
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
