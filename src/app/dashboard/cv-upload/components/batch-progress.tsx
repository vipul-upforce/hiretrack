"use client";

import type { Batch } from "./cv-batch-processor";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface BatchProgressProps {
  batch: Batch;
}

export function BatchProgress({ batch }: BatchProgressProps) {
  const { progress } = batch;
  const progressPercentage = Math.round(
    (progress.processed / progress.total) * 100
  );

  const isAllFailed = progress.failed === progress.total;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b">
        <h3 className="font-medium">Processing Batch</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {batch.status === "processing" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : isAllFailed || batch.status === "failed" ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="font-medium">
              {batch.status === "processing"
                ? "Processing..."
                : isAllFailed || batch.status === "failed"
                  ? "Processing failed"
                  : "Processing complete"}
            </span>
          </div>
          <span className="text-sm font-medium">
            {progress.processed} of {progress.total} files
          </span>
        </div>

        <Progress value={progressPercentage} className="h-2" />

        <div className="space-y-2">
          {batch.files.map((file) => {
            const isProcessed = progress.processed > batch.files.indexOf(file);
            const isFailed = batch.failedFiles.some((f) => f.id === file.id);

            return (
              <div
                key={file.id}
                className="flex items-center justify-between text-sm p-2 rounded-md border"
              >
                <span className="truncate flex-1">{file.file.name}</span>
                <div className="flex items-center gap-2 ml-2">
                  {isProcessed ? (
                    isFailed ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )
                  ) : (
                    <div className="w-4 h-4" /> /* Placeholder for alignment */
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
