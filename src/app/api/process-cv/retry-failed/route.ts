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
  failedCvBatchItemPayload,
  resolveBatchItemParseFieldsForFailure,
  type BatchItemParseFields,
} from '@/lib/cv-processing/batch-item-parse-fields';
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
import { CV_BATCH_UPLOAD_HISTORY_TITLE } from '@/lib/cv-upload/history-titles';

const BATCH_SIZE = 20;
const DUPLICATE_CANDIDATE_SUCCESS_MESSAGE =
  'Candidate already exists; counted as success';

function findLatestFailedItemIndex(
  items: Array<{
    filename?: string;
    status?: 'success' | 'failed' | 'pending';
    processedAt?: Date;
  }>,
  filename: string,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const candidate = items[index];
    if (candidate.filename === filename && candidate.status === 'failed') {
      return index;
    }
  }
  return -1;
}

function findLatestItemByFilenameIndex(
  items: Array<{
    filename?: string;
    status?: 'success' | 'failed' | 'pending';
    processedAt?: Date;
  }>,
  filename: string,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].filename === filename) {
      return index;
    }
  }
  return -1;
}

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
  const organizationId = searchParams.get('organizationId');
  const batchId = searchParams.get('batchId');
  const filename = searchParams.get('filename');
  if (!organizationId || !batchId) {
    return NextResponse.json(
      { error: 'organizationId and batchId are required' },
      { status: 400 },
    );
  }

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

  const batch = await CVBatch.findOne({
    _id: batchId,
    organizationId,
  }).exec();
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  batch.status = 'processing';
  await batch.save();

  const retryableFailedItems = (batch.pendingItems || []).filter(
    (item: DeferredPendingItem) =>
      item.status === 'failed' && (filename ? item.filename === filename : true),
  );
  if (retryableFailedItems.length === 0) {
    return NextResponse.json({
      message: filename
        ? `No retryable failed file found for "${filename}" in this batch`
        : 'No retryable failed files found in this batch',
      retried: 0,
    });
  }

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

  const createdCandidateIds: string[] = [];
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < retryableFailedItems.length; i += BATCH_SIZE) {
    const chunk = retryableFailedItems.slice(i, i + BATCH_SIZE);
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
              && pending.status === 'failed',
          );
          if (pendingIndex >= 0) {
            batch.pendingItems[pendingIndex].status = 'processed';
            batch.pendingItems[pendingIndex].processedAt = new Date();
            batch.pendingItems[pendingIndex].error = undefined;
          }

          const existingCandidateId = new Types.ObjectId(
            candidateData.duplicateCandidateId,
          );
          const failedItemIndex = findLatestFailedItemIndex(batch.items, item.filename);
          if (failedItemIndex >= 0) {
            batch.items[failedItemIndex].status = 'success';
            batch.items[failedItemIndex].candidateId = existingCandidateId;
            batch.items[failedItemIndex].message = DUPLICATE_CANDIDATE_SUCCESS_MESSAGE;
            batch.items[failedItemIndex].processedAt = new Date();
            batch.items[failedItemIndex].error = undefined;
            batch.items[failedItemIndex].cvParseMode = parseFields.cvParseMode;
            batch.items[failedItemIndex].usedProvider = parseFields.usedProvider;
            batch.items[failedItemIndex].parseProviderLabel =
              parseFields.parseProviderLabel;
            batch.successCount += 1;
            batch.failureCount = Math.max(batch.failureCount - 1, 0);
          } else {
            const existingItemIndex = findLatestItemByFilenameIndex(
              batch.items,
              item.filename,
            );
            if (existingItemIndex >= 0) {
              batch.items[existingItemIndex].status = 'success';
              batch.items[existingItemIndex].candidateId = existingCandidateId;
              batch.items[existingItemIndex].message =
                DUPLICATE_CANDIDATE_SUCCESS_MESSAGE;
              batch.items[existingItemIndex].processedAt = new Date();
              batch.items[existingItemIndex].error = undefined;
              batch.items[existingItemIndex].cvParseMode = parseFields.cvParseMode;
              batch.items[existingItemIndex].usedProvider = parseFields.usedProvider;
              batch.items[existingItemIndex].parseProviderLabel =
                parseFields.parseProviderLabel;
            } else {
              batch.items.push({
                filename: item.filename,
                candidateId: existingCandidateId,
                status: 'success',
                message: DUPLICATE_CANDIDATE_SUCCESS_MESSAGE,
                processedAt: new Date(),
                ...parseFields,
              });
            }
            batch.successCount += 1;
          }
          processed += 1;
          // eslint-disable-next-line no-continue
          continue;
        }

        if (candidateData.error) {
          const pendingIndex = batch.pendingItems.findIndex(
            (pending: DeferredPendingItem) =>
              pending.filename === item.filename
              && pending.file?.url === item.file?.url
              && pending.status === 'failed',
          );
          if (pendingIndex >= 0) {
            batch.pendingItems[pendingIndex].processedAt = new Date();
            batch.pendingItems[pendingIndex].error = candidateData.error;
          }

          const failedItemIndex = findLatestFailedItemIndex(
            batch.items,
            item.filename,
          );
          if (failedItemIndex >= 0) {
            batch.items[failedItemIndex].error = candidateData.error;
            batch.items[failedItemIndex].processedAt = new Date();
            batch.items[failedItemIndex].message = 'Retry attempt failed';
            batch.items[failedItemIndex].cvParseMode = parseFields.cvParseMode;
            batch.items[failedItemIndex].usedProvider = parseFields.usedProvider;
            batch.items[failedItemIndex].parseProviderLabel =
              parseFields.parseProviderLabel;
          } else {
            batch.items.push({
              ...failedCvBatchItemPayload(
                item.filename,
                candidateData.error,
                parseFields,
              ),
              message: 'Retry attempt failed',
            });
            batch.failureCount += 1;
          }
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
              buildStatusHistoryEntry(user, nowIso, previousStatus, resolvedStatus),
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
            pending.filename === item.filename &&
            pending.file?.url === item.file?.url &&
            pending.status === 'failed',
        );
        if (pendingIndex >= 0) {
          batch.pendingItems[pendingIndex].status = 'processed';
          batch.pendingItems[pendingIndex].processedAt = new Date();
          batch.pendingItems[pendingIndex].error = undefined;
        }

        const failedItemIndex = findLatestFailedItemIndex(batch.items, item.filename);
        if (failedItemIndex >= 0) {
          batch.items[failedItemIndex].status = 'success';
          batch.items[failedItemIndex].candidateId = candidate._id as Types.ObjectId;
          batch.items[failedItemIndex].message = `Retried via ${parseFields.parseProviderLabel}`;
          batch.items[failedItemIndex].processedAt = new Date();
          batch.items[failedItemIndex].error = undefined;
          batch.items[failedItemIndex].cvParseMode = parseFields.cvParseMode;
          batch.items[failedItemIndex].usedProvider = parseFields.usedProvider;
          batch.items[failedItemIndex].parseProviderLabel =
            parseFields.parseProviderLabel;
          batch.successCount += 1;
          batch.failureCount = Math.max(batch.failureCount - 1, 0);
        } else {
          // Prefer updating an existing latest row for this file to avoid duplicate log entries.
          const existingItemIndex = findLatestItemByFilenameIndex(
            batch.items,
            item.filename,
          );
          if (existingItemIndex >= 0) {
            batch.items[existingItemIndex].status = 'success';
            batch.items[existingItemIndex].candidateId =
              candidate._id as Types.ObjectId;
            batch.items[existingItemIndex].message = `Retried via ${parseFields.parseProviderLabel}`;
            batch.items[existingItemIndex].processedAt = new Date();
            batch.items[existingItemIndex].error = undefined;
            batch.items[existingItemIndex].cvParseMode = parseFields.cvParseMode;
            batch.items[existingItemIndex].usedProvider = parseFields.usedProvider;
            batch.items[existingItemIndex].parseProviderLabel =
              parseFields.parseProviderLabel;
          } else {
            batch.items.push({
              filename: item.filename,
              candidateId: candidate._id as Types.ObjectId,
              status: 'success',
              message: `Retried via ${parseFields.parseProviderLabel}`,
              processedAt: new Date(),
              ...parseFields,
            });
          }
          batch.successCount += 1;
        }
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
            pending.filename === item.filename &&
            pending.file?.url === item.file?.url &&
            pending.status === 'failed',
        );
        if (pendingIndex >= 0) {
          batch.pendingItems[pendingIndex].processedAt = new Date();
          batch.pendingItems[pendingIndex].error = errorMessage;
        }

        const applyParseFields = (index: number) => {
          if (!parseFields) return;
          batch.items[index].cvParseMode = parseFields.cvParseMode;
          batch.items[index].usedProvider = parseFields.usedProvider;
          batch.items[index].parseProviderLabel = parseFields.parseProviderLabel;
        };

        const failedItemIndex = findLatestFailedItemIndex(batch.items, item.filename);
        if (failedItemIndex >= 0) {
          batch.items[failedItemIndex].error = errorMessage;
          batch.items[failedItemIndex].processedAt = new Date();
          batch.items[failedItemIndex].message = 'Retry attempt failed';
          applyParseFields(failedItemIndex);
        } else {
          // Prefer updating an existing latest row for this file to avoid duplicate log entries.
          const existingItemIndex = findLatestItemByFilenameIndex(
            batch.items,
            item.filename,
          );
          if (existingItemIndex >= 0) {
            batch.items[existingItemIndex].status = 'failed';
            batch.items[existingItemIndex].error = errorMessage;
            batch.items[existingItemIndex].processedAt = new Date();
            batch.items[existingItemIndex].message = 'Retry attempt failed';
            applyParseFields(existingItemIndex);
          } else {
            batch.items.push({
              ...failedCvBatchItemPayload(item.filename, errorMessage, parseFields),
              message: 'Retry attempt failed',
            });
            batch.failureCount += 1;
          }
        }
        failed += 1;
      }
    }
    await batch.save();
  }

  const hasPending = (batch.pendingItems || []).some(
    (item: DeferredPendingItem) => item.status === 'pending',
  );
  batch.status = hasPending ? 'pending' : 'completed';
  batch.completedAt = hasPending ? undefined : new Date();
  await batch.save();

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
        'Failed to broadcast retried deferred candidates',
      );
    }
  }

  return NextResponse.json({
    message: 'Failed deferred files retried',
    batchId: batch._id.toString(),
    retried: processed + failed,
    processed,
    failed,
  });
}
