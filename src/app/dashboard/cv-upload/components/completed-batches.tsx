'use client';

import { Batch } from './cv-batch-processor';

export function CompletedBatches({ batches }: { batches: Batch[] }) {
  const sortedBatches = [...batches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Completed Batches</h2>
      <div className="space-y-4">
        {sortedBatches.map((batch, index) => (
          <div
            key={`${batch._id}-${index}`}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {new Date(batch.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-4 mt-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    {' '}
                    {batch.totalFiles}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Successful:</span>
                    {' '}
                    <span className="text-green-600">{batch.successCount}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Failed:</span>
                    {' '}
                    <span className="text-red-600">{batch.failureCount}</span>
                  </p>
                </div>
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs ${
                  batch.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {batch.status}
              </div>
            </div>

            {batch.items && batch.items.length > 0 && (
              <div className="mt-2">
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    View Details
                  </summary>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {batch.items.map((item) => (
                      <div
                        key={item._id}
                        className="p-2 border flex items-center justify-between"
                        style={{ borderRadius: '10px' }}
                      >
                        <span className="truncate flex-1">{item.filename}</span>
                        <div
                          className="flex items-center gap-2 capitalize"
                          style={{ maxWidth: '50%' }}
                        >
                          <span
                            className={`px-2 py-1 rounded-xl text-xs ${
                              item.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                            <div>{item.error}</div>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
