export interface ProcessedItem {
  filename: string;
  candidateId?: string;
  status: 'success' | 'failure' | 'failed' | 'pending';
  message?: string;
  error?: string;
  processedAt: string;
  _id: string;
  cvParseMode?: 'bulk' | 'premium';
  usedProvider?: string;
  parseProviderLabel?: string;
}

export interface PendingBatchItem {
  filename: string;
  status: 'pending' | 'processed' | 'failed';
  selected: boolean;
  error?: string;
  processedAt?: string;
  file: {
    id?: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

export interface CvBatchOperationsSnapshot {
  assignJob?: boolean;
  jobId?: string;
  updateStatus?: boolean;
  status?: string;
  addRemark?: boolean;
  remark?: string;
  isRemarkPrivate?: boolean;
  remarkRating?: number | null;
}

export interface CvBatchSummary {
  _id: string;
  organizationId: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processingMode?: 'immediate' | 'deferred';
  operationsSnapshot?: CvBatchOperationsSnapshot;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  historyAt?: string;
}

export interface CvBatchDetail extends CvBatchSummary {
  items: ProcessedItem[];
  pendingItems?: PendingBatchItem[];
}

export interface CvBatchHistoryPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CvBatchHistoryQueryArgs {
  organizationId: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface CvBatchHistoryResponse {
  history: {
    data: CvBatchSummary[];
    pagination: CvBatchHistoryPagination;
  };
  deferredBatches: CvBatchDetail[];
  retryableFailedBatchIds: string[];
}

export interface CvBatchDetailQueryArgs {
  organizationId: string;
  batchId: string;
}

export interface CvBatchDetailResponse {
  batch: CvBatchDetail;
}
