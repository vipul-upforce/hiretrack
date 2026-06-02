import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectToDatabase, {
  Candidate,
  Settings,
  cvBatch as CVBatch,
  History,
  Job,
  Organization,
  DuplicateCandidate,
  FileUrlMapping,
} from '@/lib/mongodb';
import { batchItemFieldsFromParseUsage } from '@/lib/cv-processing/cv-parse-usage';
import {
  resolveBatchItemParseFieldsForFailure,
  type BatchItemParseFields,
} from '@/lib/cv-processing/batch-item-parse-fields';
import {
  upsertBatchItemFailure,
  upsertBatchItemSuccess,
} from '@/lib/cv-upload/batch-item-upsert';
import { buildOrgCvParseContextFromSettings } from '@/lib/cv-processing/server/cv-parse-routing';
import { processOrgResume } from '@/lib/cv-processing/server/process-org-resume';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ISettings } from '@/lib/models/settings';
import logger from '@/lib/logger';
import type { ICandidateHistory } from '@/lib/models/history';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import type { ICandidate } from '@/lib/models/candidate';
import {
  buildRemarkHistoryEntry,
  buildStatusHistoryEntry,
  resolveCandidateStatus,
} from '@/lib/cv-upload/operations';
import { loadResumeFileAsBase64FromStoredUrl } from '@/lib/cv-upload/load-resume-file-from-stored-url';
import { finalizeCvBatchStatus } from '@/lib/cv-upload/finalize-cv-batch-status';
import { CV_BATCH_UPLOAD_HISTORY_TITLE } from '@/lib/cv-upload/history-titles';

export const dynamic = 'force-dynamic';

/** Long-running deferred batch processing (one batch per client request). */
export const maxDuration = 300;

const BATCH_SIZE = 20;

interface DeferredPendingItem {
  filename: string;
  status: 'pending' | 'processed' | 'failed';
  file: {
    id?: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  selected: boolean;
  error?: string;
  processedAt?: Date;
}

const DUPLICATE_CANDIDATE_SUCCESS_MESSAGE =
  'Candidate already exists; counted as success';

export async function POST(request: NextRequest) {
  await connectToDatabase();
  if (!Candidate || !Settings || !CVBatch || !History) {
    return NextResponse.json({ error: 'Database not connected' }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'User not Authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams?.get('organizationId');
  const batchId = searchParams?.get('batchId');
  const batchIdsRaw = searchParams?.get('batchIds');
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const batchIdsFromQuery = (batchIdsRaw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => Types.ObjectId.isValid(id));

  const settings = (await Settings.findOne({ organizationId })
    .select('bulkCvAi aiProviders gemini')
    .lean()
    .exec()) as Pick<ISettings, 'bulkCvAi' | 'aiProviders' | 'gemini'> | null;
  if (!settings) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
  }

  let cvParseContext;
  try {
    cvParseContext = buildOrgCvParseContextFromSettings(organizationId, settings);
  } catch (routingError) {
    return NextResponse.json(
      {
        error:
          routingError instanceof Error
            ? routingError.message
            : 'CV parsing is not configured',
      },
      { status: 404 },
    );
  }

  const query: Record<string, unknown> = {
    organizationId,
    status: 'pending',
    processingMode: 'deferred',
  };
  if (batchIdsFromQuery.length > 0) {
    query._id = { $in: batchIdsFromQuery };
  } else if (batchId && Types.ObjectId.isValid(batchId)) {
    query._id = batchId;
  }

  const pendingBatches = await CVBatch.find(query).exec();
  if (pendingBatches.length === 0) {
    return NextResponse.json({ message: 'No pending batches found', processedBatches: 0 });
  }

  const createdCandidateIds: string[] = [];
  const batchResults: Array<{ batchId: string; processed: number; failed: number }> = [];

  for (const batch of pendingBatches) {
    batch.status = 'processing';
    await batch.save();

    let processed = 0;
    let failed = 0;

    try {
    const pendingItems = (batch.pendingItems || []).filter(
      (item: DeferredPendingItem) => item.status === 'pending',
    );
    const operationsSnapshot = batch.operationsSnapshot || {};

    let targetJob: { _id: unknown; title?: string; lanes?: string[]; useCustomLanes?: boolean } | null =
      null;
    let resolvedStatus = 'applied';
    if (operationsSnapshot.assignJob && operationsSnapshot.jobId && Job && Organization) {
      targetJob = await Job.findById(operationsSnapshot.jobId)
        .select('_id title lanes useCustomLanes')
        .lean();
      if (targetJob) {
        const organization = await Organization.findById(organizationId)
          .select('defaultLanes')
          .lean();
        resolvedStatus = resolveCandidateStatus({
          job: targetJob,
          organization,
          requestedStatus: operationsSnapshot.updateStatus
            ? operationsSnapshot.status
            : undefined,
        });
      }
    }

    for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
      const chunk = pendingItems.slice(i, i + BATCH_SIZE);
      for (const item of chunk) {
        let lastParseFields: BatchItemParseFields | undefined;
        try {
          const fileUrl = item.file?.url || '';
          const base64Data = await loadResumeFileAsBase64FromStoredUrl(
            fileUrl,
            request.url,
            FileUrlMapping,
          );
          const { data: candidateData, usage: parseUsage } = await processOrgResume(
            cvParseContext,
            {
              base64Resume: base64Data,
              organizationId: organizationId as string,
              filename: item.filename,
            },
          );
          const parseFields = batchItemFieldsFromParseUsage(parseUsage);
          lastParseFields = parseFields;

          if (candidateData.isDuplicate && candidateData.duplicateCandidateId) {
            const pendingIndex = batch.pendingItems.findIndex(
              (pending: DeferredPendingItem) =>
                pending.filename === item.filename
                && pending.file?.url === item.file?.url
                && pending.status === 'pending',
            );
            if (pendingIndex >= 0) {
              batch.pendingItems[pendingIndex].status = 'processed';
              batch.pendingItems[pendingIndex].processedAt = new Date();
              batch.pendingItems[pendingIndex].error = undefined;
            }

            upsertBatchItemSuccess(batch, {
              filename: item.filename,
              candidateId: new Types.ObjectId(candidateData.duplicateCandidateId),
              parseFields,
              message: DUPLICATE_CANDIDATE_SUCCESS_MESSAGE,
            });
            processed += 1;
            // eslint-disable-next-line no-continue
            continue;
          }

          if (candidateData.error) {
            const pendingIndex = batch.pendingItems.findIndex(
              (pending: DeferredPendingItem) =>
                pending.filename === item.filename
                && pending.file?.url === item.file?.url
                && pending.status === 'pending',
            );
            if (pendingIndex >= 0) {
              batch.pendingItems[pendingIndex].status = 'failed';
              batch.pendingItems[pendingIndex].processedAt = new Date();
              batch.pendingItems[pendingIndex].error = candidateData.error;
            }

            upsertBatchItemFailure(batch, {
              filename: item.filename,
              error: candidateData.error,
              parseFields,
            });
            failed += 1;
            // eslint-disable-next-line no-continue
            continue;
          }

          const shouldApplyOperations = item.selected && operationsSnapshot.assignJob;
          const shouldAddRemark = item.selected && operationsSnapshot.addRemark;
          const shouldUpdateStatus =
            item.selected &&
            operationsSnapshot.assignJob &&
            operationsSnapshot.updateStatus;
          const previousStatus = candidateData.status || 'applied';
          const nowIso = new Date().toISOString();

          const remarks = shouldAddRemark
            ? [
                {
                  description: operationsSnapshot.remark || '',
                  date: nowIso,
                  rating:
                    typeof operationsSnapshot.remarkRating === 'number'
                      ? operationsSnapshot.remarkRating
                      : undefined,
                  userId: user.id,
                },
              ]
            : [];

          const statusToApply = shouldApplyOperations
            ? resolvedStatus
            : candidateData.status;

          const candidate = new Candidate({
            ...candidateData,
            jobId: shouldApplyOperations ? operationsSnapshot.jobId : undefined,
            status: statusToApply,
            remarks,
            resume: item.file,
          });

          await candidate.save();
          createdCandidateIds.push(candidate._id.toString());

          if (candidate.email && candidate.organizationId) {
            await DuplicateCandidate?.findOneAndUpdate(
              {
                email: candidate.email.toLowerCase(),
                orgId: candidate.organizationId,
              },
              {
                $addToSet: {
                  duplicates: {
                    candidateId: candidate._id,
                    jobId: candidate.jobId || null,
                  },
                },
              },
              { upsert: true, new: true },
            );
          }

          await History.create({
            candidateId: candidate._id,
            jobId: null,
            history: [
              {
                attachments: [item.file],
                dateTime: new Date(),
                title: CV_BATCH_UPLOAD_HISTORY_TITLE,
                previousInterviewer: null,
                currentInterviewer: null,
                assignmentBy: user.id,
              },
            ],
          });

          if (
            shouldApplyOperations &&
            operationsSnapshot.jobId &&
            History &&
            targetJob
          ) {
            const historyEntries: ICandidateHistory[] = [];
            if (shouldUpdateStatus) {
              historyEntries.push(
                buildStatusHistoryEntry(
                  user,
                  nowIso,
                  previousStatus,
                  resolvedStatus,
                ),
              );
            }
            if (shouldAddRemark && operationsSnapshot.remark) {
              historyEntries.push(
                buildRemarkHistoryEntry(
                  user,
                  nowIso,
                  operationsSnapshot.remark,
                  operationsSnapshot.isRemarkPrivate ?? true,
                  typeof operationsSnapshot.remarkRating === 'number'
                    ? operationsSnapshot.remarkRating
                    : null,
                ),
              );
            }
            if (historyEntries.length > 0) {
              await History.create({
                candidateId: candidate._id.toString(),
                jobId: operationsSnapshot.jobId,
                history: historyEntries,
              });
            }
          }

          const pendingIndex = batch.pendingItems.findIndex(
            (pending: DeferredPendingItem) =>
              pending.filename === item.filename
              && pending.file?.url === item.file?.url
              && pending.status === 'pending',
          );
          if (pendingIndex >= 0) {
            batch.pendingItems[pendingIndex].status = 'processed';
            batch.pendingItems[pendingIndex].processedAt = new Date();
            batch.pendingItems[pendingIndex].error = undefined;
          }

          upsertBatchItemSuccess(batch, {
            filename: item.filename,
            candidateId: candidate._id as Types.ObjectId,
            parseFields,
          });
          processed += 1;
        } catch (error) {
          const parseFields = resolveBatchItemParseFieldsForFailure(
            error,
            cvParseContext,
            item.filename,
            item.file?.size ?? 0,
            lastParseFields,
          );
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          const pendingIndex = batch.pendingItems.findIndex(
            (pending: DeferredPendingItem) =>
              pending.filename === item.filename
              && pending.file?.url === item.file?.url
              && pending.status === 'pending',
          );
          if (pendingIndex >= 0) {
            batch.pendingItems[pendingIndex].status = 'failed';
            batch.pendingItems[pendingIndex].processedAt = new Date();
            batch.pendingItems[pendingIndex].error = errorMessage;
          }

          upsertBatchItemFailure(batch, {
            filename: item.filename,
            error: errorMessage,
            parseFields,
          });
          failed += 1;
        }
      }
      await batch.save();
    }

    await finalizeCvBatchStatus(batch);
    batchResults.push({ batchId: batch._id.toString(), processed, failed });
    } catch (batchError) {
      logger.error(
        { error: batchError, batchId: batch._id.toString(), organizationId },
        'Deferred CV batch processing failed unexpectedly; finalizing batch status',
      );
      try {
        await finalizeCvBatchStatus(batch);
      } catch (finalizeError) {
        logger.error(
          { error: finalizeError, batchId: batch._id.toString() },
          'Failed to finalize deferred CV batch status after processing error',
        );
      }
      batchResults.push({ batchId: batch._id.toString(), processed, failed });
    }
  }

  if (createdCandidateIds.length > 0) {
    try {
      const createdCandidates = await Candidate.find({
        _id: { $in: createdCandidateIds },
      })
        .populate([
          { path: 'assignment.interviewerId', select: '_id name email' },
          { path: 'remarks.userId', select: 'name email' },
          { path: 'followUp.userId', select: '_id name email' },
          { path: 'jobId', select: 'title description' },
        ])
        .lean();
      await broadcastMultipleCandidateUpdate(
        createdCandidates as unknown as Array<
          ICandidate & { history?: ICandidateHistory[] }
        >,
      );
    } catch (broadcastError) {
      logger.error(
        { error: broadcastError },
        'Failed to broadcast deferred batch-created candidates',
      );
    }
  }

  const totals = batchResults.reduce(
    (acc, row) => ({
      processed: acc.processed + row.processed,
      failed: acc.failed + row.failed,
    }),
    { processed: 0, failed: 0 },
  );

  return NextResponse.json({
    message: 'Deferred CV batches processed',
    processedBatches: batchResults.length,
    batchResults,
    totals,
  });
}
