"use client";

import { useState } from "react";
import type { Batch } from "./cv-batch-processor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CompletedBatchesProps {
  batches: Batch[];
}

export function CompletedBatches({ batches }: CompletedBatchesProps) {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  if (batches.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b">
        <h3 className="font-medium">Completed Batches ({batches.length})</h3>
      </div>
      <Accordion
        type="single"
        collapsible
        value={expandedBatch || undefined}
        onValueChange={(value) => setExpandedBatch(value)}
      >
        {batches.map((batch) => {
          const isAllFailed = batch.progress.failed === batch.progress.total;

          return (
            <AccordionItem key={batch.id} value={batch.id}>
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  {isAllFailed || batch.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">
                      Batch {batch.id.substring(0, 8)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(batch.timestamp, {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm">
                    {batch.progress.successful}/{batch.progress.total}{" "}
                    successful
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4">
                  <div className="space-y-2">
                    {batch.files.map((file) => {
                      const isFailed = batch.failedFiles.some(
                        (f) => f.id === file.id
                      );

                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between text-sm p-2 rounded-md border"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{file.file.name}</span>
                          </div>
                          {isFailed ? (
                            <XCircle className="h-4 w-4 text-red-500 ml-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
