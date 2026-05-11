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
import { AIProviderFactory, ProcessedResumeData } from '@/lib/ai-providers';
import { AIProviders } from '@/lib/ai-providers/types';
import { decryptProviderKeys, ProvidersConfig } from '@/lib/encryption';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ISettings, IAIProviders } from '@/lib/models/settings';
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

const BATCH_SIZE = 20;

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

interface ExtendedProcessedResumeData extends ProcessedResumeData {
  name: string;
  email?: string;
  location: string;
  contact: string;
  experience: number;
  skills: string[];
  currentCTC: number;
  expectedCTC: number;
  noticePeriod: number;
  organizationId: string;
  status: string;
  isDeleted: boolean;
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

async function processResume(
  base64Resume: string,
  decryptedAiProviders: AIProviders,
  organizationId: string,
): Promise<ExtendedProcessedResumeData> {
  const { activeProvider } = decryptedAiProviders;
  const apiKey = decryptedAiProviders[activeProvider]?.api_key;
  if (!apiKey) {
    throw new Error(`API key not found for active provider: ${activeProvider}`);
  }

  const provider = AIProviderFactory.getProvider(activeProvider);
  const selectedModel =
    decryptedAiProviders[activeProvider]?.customModel ||
    decryptedAiProviders[activeProvider]?.model;

  const parsedData = await provider.processResume(base64Resume, apiKey, selectedModel);
  if (parsedData.error) {
    return {
      ...parsedData,
      organizationId,
      status: 'rejected',
      isDeleted: false,
    };
  }

  const existingCandidate = await Candidate?.findOne({
    name: parsedData.name,
    email: parsedData.email,
    organizationId,
    isDeleted: false,
  });
  if (existingCandidate) {
    return {
      ...parsedData,
      organizationId,
      status: 'rejected',
      isDeleted: false,
      error: 'Candidate with this name and email already exists',
    };
  }

  const { scores: _scores, ...parsedDataWithoutScores } = parsedData;
  return {
    ...parsedDataWithoutScores,
    organizationId,
    status: 'applied',
    isDeleted: false,
  };
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
    .select('aiProviders gemini')
    .lean()
    .exec()) as Pick<ISettings, 'aiProviders' | 'gemini'> | null;
  if (!settings) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
  }

  let aiProvider: IAIProviders | AIProviders | undefined =
    settings.aiProviders as IAIProviders | AIProviders | undefined;
  if (!aiProvider) {
    const legacyGeminiKey = settings.gemini?.gemini_key || '';
    aiProvider = {
      activeProvider: 'gemini',
      gemini: { api_key: legacyGeminiKey, model: 'gemini-1.5-flash', customModel: '' },
      openai: { api_key: '', model: 'gpt-4o-mini', customModel: '' },
      anthropic: { api_key: '', model: 'claude-3-5-sonnet-20241022', customModel: '' },
      perplexity: { api_key: '', model: 'sonar-pro', customModel: '' },
    } as IAIProviders;
  }

  const decryptedAiProviders = decryptProviderKeys(
    aiProvider as ProvidersConfig,
    organizationId,
  ) as AIProviders;
  const apiKey = decryptedAiProviders[decryptedAiProviders.activeProvider]?.api_key;
  if (!apiKey) {
    return NextResponse.json({ error: 'Active AI provider API key not found' }, { status: 404 });
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
      try {
        const fileUrl = item.file?.url || '';
        const base64Data = await loadResumeFileAsBase64FromStoredUrl(
          fileUrl,
          request.url,
          FileUrlMapping,
        );
        const candidateData = await processResume(
          base64Data,
          decryptedAiProviders,
          organizationId as string,
        );
        if (candidateData.error) {
          throw new Error(candidateData.error);
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

        if (!candidateData.name) {
          throw new Error('Validation Error: Required fields not provided: name');
        }

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
              dateTime: new Date(),
              title: 'cv-process retry failed file',
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
          batch.items[failedItemIndex].message =
            'Successfully retried and processed failed deferred file';
          batch.items[failedItemIndex].processedAt = new Date();
          batch.items[failedItemIndex].error = undefined;
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
            batch.items[existingItemIndex].message =
              'Successfully retried and processed failed deferred file';
            batch.items[existingItemIndex].processedAt = new Date();
            batch.items[existingItemIndex].error = undefined;
          } else {
            batch.items.push({
              filename: item.filename,
              candidateId: candidate._id as Types.ObjectId,
              status: 'success',
              message: 'Successfully retried and processed failed deferred file',
              processedAt: new Date(),
            });
          }
          batch.successCount += 1;
        }
        processed += 1;
      } catch (error) {
        const pendingIndex = batch.pendingItems.findIndex(
          (pending: DeferredPendingItem) =>
            pending.filename === item.filename &&
            pending.file?.url === item.file?.url &&
            pending.status === 'failed',
        );
        if (pendingIndex >= 0) {
          batch.pendingItems[pendingIndex].processedAt = new Date();
          batch.pendingItems[pendingIndex].error =
            error instanceof Error ? error.message : 'Unknown error';
        }

        const failedItemIndex = findLatestFailedItemIndex(batch.items, item.filename);
        if (failedItemIndex >= 0) {
          batch.items[failedItemIndex].error =
            error instanceof Error ? error.message : 'Unknown error';
          batch.items[failedItemIndex].processedAt = new Date();
          batch.items[failedItemIndex].message = 'Retry attempt failed';
        } else {
          // Prefer updating an existing latest row for this file to avoid duplicate log entries.
          const existingItemIndex = findLatestItemByFilenameIndex(
            batch.items,
            item.filename,
          );
          if (existingItemIndex >= 0) {
            batch.items[existingItemIndex].status = 'failed';
            batch.items[existingItemIndex].error =
              error instanceof Error ? error.message : 'Unknown error';
            batch.items[existingItemIndex].processedAt = new Date();
            batch.items[existingItemIndex].message = 'Retry attempt failed';
          } else {
            batch.items.push({
              filename: item.filename,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              processedAt: new Date(),
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
