import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import connectToDatabase, {
  Candidate,
  Settings,
  cvBatch as CVBatch,
  History,
  DuplicateCandidate,
  Job,
  Organization,
} from '@/lib/mongodb';
import { handleSingleFile } from '@/lib/fileUtils';
import { batchItemFieldsFromParseUsage } from '@/lib/cv-processing/cv-parse-usage';
import {
  batchItemParseFieldsFromContext,
  failedCvBatchItemPayload,
  resolveBatchItemParseFieldsForFailure,
  type BatchItemParseFields,
} from '@/lib/cv-processing/batch-item-parse-fields';
import {
  upsertBatchItemFailure,
  upsertBatchItemSuccess,
} from '@/lib/cv-upload/batch-item-upsert';
import {
  buildOrgCvParseContextFromSettings,
} from '@/lib/cv-processing/server/cv-parse-routing';
import { processOrgResume } from '@/lib/cv-processing/server/process-org-resume';
import { NotificationService } from '@/lib/notifications/notificationService';
import { Types, type PipelineStage } from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { getEffectiveMaxPdfPages } from '@/lib/ai-providers/evaluation-config';
import { ISettings } from '@/lib/models/settings';
import logger from '@/lib/logger';
import type { ICandidateHistory } from '@/lib/models/history';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import type { ICandidate } from '@/lib/models/candidate';
import {
  buildRemarkHistoryEntry,
  buildStatusHistoryEntry,
  getEffectiveSelectedIds,
  normalizeCvBatchOperations,
  parseCvBatchOperations,
  resolveCandidateStatus,
  resolveCandidateStatusObjectId,
  resolveStoredCandidateStatusName,
} from '@/lib/cv-upload/operations';
import { CV_BATCH_UPLOAD_HISTORY_TITLE } from '@/lib/cv-upload/history-titles';
import { collectRetryableFailedItems } from '@/lib/cv-upload/collect-retryable-failed-items';
import { candidateBroadcastPopulate } from '@/lib/candidates/candidate-populate';

/** Avoid stale batch lists behind CDNs / reverse proxies (prod UI not updating after upload). */
const JSON_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
} as const;

export const dynamic = 'force-dynamic';

/** Long-running multipart uploads + storage (S3/Cloudinary). Ignored outside Vercel. */
export const maxDuration = 300;

// Maximum file size limit (10MB) to prevent body size limit errors
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

interface ProcessResult {
  filename: string;
  candidateId?: Types.ObjectId;
  status: 'success' | 'failed';
  error?: string;
}

interface ProcessError {
  filename: string;
  error: string;
}

interface FileObject {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface FileToProcess {
  file: File;
  selected: boolean;
}

interface StoredFileEntry {
  filename: string;
  selected: boolean;
  base64Data: string;
  resumeFile: FileObject;
}

const DUPLICATE_CANDIDATE_SUCCESS_MESSAGE =
  'Candidate already exists; counted as success';
const DEFAULT_HISTORY_PAGE_LIMIT = 5;
const MAX_HISTORY_PAGE_LIMIT = 50;

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maxValue = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, maxValue);
}

function parseHistoryDateBoundary(
  value: string | null,
  boundary: 'start' | 'end',
): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (boundary === 'start') {
    parsed.setHours(0, 0, 0, 0);
  } else {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

function buildBatchHistoryBasePipeline(
  organizationObjectId: Types.ObjectId,
  startDate: Date | null,
  endDate: Date | null,
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        organizationId: organizationObjectId,
        $nor: [{ status: 'pending', processingMode: 'deferred' }],
      },
    },
    {
      $addFields: {
        effectiveHistoryAt: {
          $ifNull: ['$historyAt', { $ifNull: ['$completedAt', '$createdAt'] }],
        },
      },
    },
  ];

  if (startDate || endDate) {
    const effectiveHistoryAt: Record<string, Date> = {};
    if (startDate) {
      effectiveHistoryAt.$gte = startDate;
    }
    if (endDate) {
      effectiveHistoryAt.$lte = endDate;
    }
    pipeline.push({
      $match: {
        effectiveHistoryAt,
      },
    });
  }

  return pipeline;
}

function getPdfPageLimitSkipReason(
  filename: string,
  pageCount: number,
  maxPdfPages: number,
): string {
  return `File "${filename}" has ${pageCount} pages, which exceeds the maximum allowed limit of ${maxPdfPages} pages.`;
}

async function getPdfPageCountFromBytes(pdfBytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(pdfBytes);
  return pdf.getPageCount();
}

// Helper function to process ZIP entries recursively with size + page filtering
async function processZipEntries(
  zip: AdmZip,
  maxPdfPages: number,
): Promise<{
  files: File[];
  skippedFiles: Array<{ filename: string; size: number; reason: string }>;
}> {
  const files: File[] = [];
  const skippedFiles: Array<{ filename: string; size: number; reason: string }> = [];
  const entries = zip.getEntries();

  for (const entry of entries) {
    // Skip macOS system files and hidden files
    if (
      entry.entryName.startsWith('__MACOSX/') ||
      entry.entryName.includes('/._') ||
      entry.entryName.startsWith('._')
    ) {
      continue; // eslint-disable-line no-continue
    }

    // Check if it's a directory by checking if the path ends with '/'
    if (entry.entryName.endsWith('/')) {
      // eslint-disable-next-line no-continue
      continue; // Skip directories as we'll process their contents through their files
    }
    // Check if it's a PDF file
    else if (entry.entryName.toLowerCase().endsWith('.pdf')) {
      const filename = entry.entryName.split('/').pop() || entry.entryName;
      
      // Get file size from header
      // entry.header.size might be 0 for some entries, so we use it as fallback
      const entrySize = entry.header.size || 0;

      try {
        // If we have size info and it's too large, skip before extraction
        if (entrySize > 0 && entrySize > MAX_FILE_SIZE) {
          skippedFiles.push({
            filename,
            size: entrySize,
            reason: `File size (${(entrySize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
          });
          continue; // eslint-disable-line no-continue
        }

        // Extract file content
        const content = entry.getData();
        const actualSize = content.length;

        // Double-check actual size after extraction (in case header size was 0 or incorrect)
        if (actualSize > MAX_FILE_SIZE) {
          skippedFiles.push({
            filename,
            size: actualSize,
            reason: `File size (${(actualSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
          });
          continue; // eslint-disable-line no-continue
        }

        const pdfBytes = new Uint8Array(content);
        if (maxPdfPages > 0) {
          try {
            const pageCount = await getPdfPageCountFromBytes(pdfBytes);
            if (pageCount > maxPdfPages) {
              skippedFiles.push({
                filename,
                size: actualSize,
                reason: getPdfPageLimitSkipReason(
                  filename,
                  pageCount,
                  maxPdfPages,
                ),
              });
              continue; // eslint-disable-line no-continue
            }
          } catch (error) {
            skippedFiles.push({
              filename,
              size: actualSize,
              reason: `Failed to read PDF page count: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
            continue; // eslint-disable-line no-continue
          }
        }

        const file = new File([pdfBytes], filename, {
          type: 'application/pdf',
        });
        files.push(file);
      } catch (error) {
        skippedFiles.push({
          filename,
          size: entrySize || 0,
          reason: `Failed to extract file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
  }

  return { files, skippedFiles };
}

export async function POST(request: NextRequest) {
  await connectToDatabase();
  if (!Candidate || !Settings || !CVBatch) {
    return NextResponse.json(
      { error: 'Database not connected' },
      { status: 400 },
    );
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'User not Authenticated' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams?.get('organizationId');
  
  // Check content type and parse FormData safely
  const contentType = request.headers.get('content-type') || '';
  let formData: FormData;
  
  try {
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 },
      );
    }
    formData = await request.formData();
  } catch (error) {
    logger.error({ error, contentType }, 'Failed to parse FormData');
    return NextResponse.json(
      {
        error: 'Failed to parse form data. Please ensure files are sent as multipart/form-data.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 },
    );
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: 'organizationId is required' },
      { status: 400 },
    );
  }

  const { operations, selectedFileIds } = parseCvBatchOperations(formData);
  const normalizedOperations = normalizeCvBatchOperations(operations);
  const effectiveSelectedIds = getEffectiveSelectedIds(
    normalizedOperations,
    selectedFileIds,
  );

  const cvBatchInfo = new CVBatch({
    organizationId,
    totalFiles: 0,
    successCount: 0,
    failureCount: 0,
    status: 'processing',
    processingMode: 'immediate',
  });

  try {
    const settings = (await Settings.findOne({ organizationId })
      .select('bulkCvAi aiProviders gemini fileStorage evaluationConfig')
      .lean()
      .exec()) as Pick<
      ISettings,
      | 'bulkCvAi'
      | 'aiProviders'
      | 'gemini'
      | 'fileStorage'
      | 'evaluationConfig'
    > | null;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    let cvParseContext;
    try {
      cvParseContext = buildOrgCvParseContextFromSettings(
        organizationId as string,
        settings,
      );
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

    const processingMode =
      normalizedOperations.processingMode === 'deferred'
        ? 'deferred'
        : 'immediate';
    const maxPdfPages = getEffectiveMaxPdfPages(settings.evaluationConfig);

    let targetJob: { _id: unknown; title?: string; lanes?: string[]; useCustomLanes?: boolean } | null =
      null;
    let resolvedStatus = 'applied';

    if (normalizedOperations.assignJob) {
      if (!Job || !Organization) {
        return NextResponse.json(
          { error: 'Job or Organization model not available' },
          { status: 500 },
        );
      }

      targetJob = await Job.findById(normalizedOperations.jobId)
        .select('_id title lanes useCustomLanes')
        .lean();

      if (!targetJob) {
        return NextResponse.json(
          { error: 'Selected job not found' },
          { status: 404 },
        );
      }

      const organization = await Organization.findById(organizationId)
        .select('defaultLanes')
        .lean();

      resolvedStatus = resolveCandidateStatus({
        job: targetJob,
        organization,
        requestedStatus: normalizedOperations.updateStatus
          ? normalizedOperations.status
          : undefined,
      });
    }

    let files: FileToProcess[] = [];
    const skippedFiles: Array<{ filename: string; size: number; reason: string }> = [];
    const uploadedFiles = formData.getAll('file');
    const uploadedFileIds = formData.getAll('fileId');
    const intakeStats = {
      acceptedFiles: 0,
      skippedBySize: 0,
      skippedByPages: 0,
      skippedByType: 0,
      skippedByZip: 0,
      skippedByDuplicateName: 0,
      skippedByOther: 0,
    };

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    for (let index = 0; index < uploadedFiles.length; index += 1) {
      const uploadedFile = uploadedFiles[index];
      const fileIdValue = uploadedFileIds[index];
      const fileId =
        typeof fileIdValue === 'string' && fileIdValue.trim().length > 0
          ? fileIdValue.trim()
          : new Types.ObjectId().toHexString();
      const isSelected = effectiveSelectedIds.has(fileId);

      if (uploadedFile instanceof File) {
        if (uploadedFile.name.endsWith('.zip')) {
          try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const zip = new AdmZip(buffer);

            // Process ZIP entries with size filtering
            const { files: zipFiles, skippedFiles: zipSkippedFiles } =
              await processZipEntries(zip, maxPdfPages);
            zipFiles.forEach((zipFile) => {
              files.push({ file: zipFile, selected: isSelected });
            });
            skippedFiles.push(...zipSkippedFiles);
            intakeStats.acceptedFiles += zipFiles.length;
            intakeStats.skippedByZip += zipSkippedFiles.length;
          } catch (error) {
            skippedFiles.push({
              filename: uploadedFile.name,
              size: uploadedFile.size,
              reason: `Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
            intakeStats.skippedByZip += 1;
          }
        } else if (
          uploadedFile.type === 'application/pdf'
          || uploadedFile.type === 'application/x-pdf'
        ) {
          // Filter individual PDF files by size
          if (uploadedFile.size > MAX_FILE_SIZE) {
            skippedFiles.push({
              filename: uploadedFile.name,
              size: uploadedFile.size,
              reason: `File size (${(uploadedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
            });
            intakeStats.skippedBySize += 1;
            // eslint-disable-next-line no-continue
            continue;
          }
          if (maxPdfPages > 0) {
            try {
              const pdfBytes = new Uint8Array(await uploadedFile.arrayBuffer());
              const pageCount = await getPdfPageCountFromBytes(pdfBytes);
              if (pageCount > maxPdfPages) {
                skippedFiles.push({
                  filename: uploadedFile.name,
                  size: uploadedFile.size,
                  reason: getPdfPageLimitSkipReason(
                    uploadedFile.name,
                    pageCount,
                    maxPdfPages,
                  ),
                });
                intakeStats.skippedByPages += 1;
                // eslint-disable-next-line no-continue
                continue;
              }
            } catch (error) {
              skippedFiles.push({
                filename: uploadedFile.name,
                size: uploadedFile.size,
                reason: `Failed to read PDF page count: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
              intakeStats.skippedByOther += 1;
              // eslint-disable-next-line no-continue
              continue;
            }
          }
          files.push({ file: uploadedFile, selected: isSelected });
          intakeStats.acceptedFiles += 1;
        } else {
          intakeStats.skippedByType += 1;
          return NextResponse.json(
            {
              error: 'Invalid file type. Only PDF and ZIP files are supported',
            },
            { status: 400 },
          );
        }
      }
    }

    logger.info(
      {
        organizationId,
        uploadedCount: uploadedFiles.length,
        intakeStats,
      },
      'CV upload batch intake summary',
    );

    // Update batch info with total files (including skipped files)
    // Note: totalFiles should include all files (processed + skipped) for accurate reporting
    const totalFilesIncludingSkipped = files.length + skippedFiles.length;
    cvBatchInfo.totalFiles = totalFilesIncludingSkipped;
    cvBatchInfo.processingMode = processingMode;
    cvBatchInfo.operationsSnapshot = normalizedOperations;
    
    const intakeParseFields = batchItemParseFieldsFromContext(
      cvParseContext,
      'intake',
      0,
    );

    // Add skipped files to batch items as 'failed' status (schema only supports 'success' or 'failed')
    skippedFiles.forEach((skipped) => {
      cvBatchInfo.items.push(
        failedCvBatchItemPayload(skipped.filename, skipped.reason, intakeParseFields),
      );
      cvBatchInfo.failureCount += 1;
    });

    await cvBatchInfo.save();

    const storedFileEntries: StoredFileEntry[] = [];
    for (const fileEntry of files) {
      const { file, selected } = fileEntry;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const fileObject: FileObject = {
          id: new Types.ObjectId().toHexString(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: `data:${file.type};base64,${base64Data}`,
        };
        const resumeFile = await handleSingleFile(
          fileObject,
          settings.fileStorage?.storageType || 'local',
          organizationId as string,
        );
        if (!resumeFile) {
          throw new Error('Failed to save resume file');
        }

        storedFileEntries.push({
          filename: file.name,
          selected,
          base64Data,
          resumeFile,
        });
        cvBatchInfo.pendingItems.push({
          filename: file.name,
          status: 'pending',
          file: {
            id: resumeFile.id,
            name: resumeFile.name,
            url: resumeFile.url,
            type: resumeFile.type,
            size: resumeFile.size,
          },
          selected,
        });
      } catch (error) {
        const storeParseFields = resolveBatchItemParseFieldsForFailure(
          error,
          cvParseContext,
          file.name,
          file.size,
        );
        cvBatchInfo.items.push(
          failedCvBatchItemPayload(
            file.name,
            error instanceof Error ? error.message : 'Unknown error',
            storeParseFields,
          ),
        );
        cvBatchInfo.failureCount += 1;
      }
    }

    await cvBatchInfo.save();

    if (processingMode === 'deferred') {
      for (const entry of storedFileEntries) {
        cvBatchInfo.items.push({
          filename: entry.filename,
          status: 'pending',
          message: 'Stored for later processing',
          processedAt: new Date(),
        });
      }

      cvBatchInfo.status = 'pending';
      await cvBatchInfo.save();

      const savedBatch = await CVBatch.findById(cvBatchInfo._id).lean();

      return NextResponse.json(
        {
          message: 'Files stored for deferred processing',
          batchId: cvBatchInfo._id,
          batch: savedBatch,
          summary: {
            total: cvBatchInfo.totalFiles,
            pending: cvBatchInfo.pendingItems.length,
            failed: cvBatchInfo.failureCount,
            skipped: skippedFiles.length,
          },
        },
        { status: 200, headers: JSON_NO_STORE_HEADERS },
      );
    }

    const results: ProcessResult[] = [];
    const errors: ProcessError[] = [];
    const createdCandidateIds: string[] = [];

    for (const fileEntry of storedFileEntries) {
      const { filename, selected, resumeFile, base64Data } = fileEntry;
      let lastParseFields: BatchItemParseFields | undefined;
      try {
        const { data: candidateData, usage: parseUsage } = await processOrgResume(
          cvParseContext,
          {
            base64Resume: base64Data,
            organizationId: organizationId as string,
            filename,
          },
        );
        const parseFields = batchItemFieldsFromParseUsage(parseUsage);
        lastParseFields = parseFields;

        const shouldApplyOperations = selected && normalizedOperations.assignJob;
        const shouldAddRemark = selected && normalizedOperations.addRemark;
        const shouldUpdateStatus =
          selected &&
          normalizedOperations.assignJob &&
          normalizedOperations.updateStatus;
        const previousStatus = resolveStoredCandidateStatusName(
          candidateData.status,
        );

        if (candidateData.isDuplicate && candidateData.duplicateCandidateId) {
          upsertBatchItemSuccess(cvBatchInfo, {
            filename,
            candidateId: new Types.ObjectId(candidateData.duplicateCandidateId),
            parseFields,
            message: DUPLICATE_CANDIDATE_SUCCESS_MESSAGE,
          });

          const pendingIndex = cvBatchInfo.pendingItems.findIndex(
            (pendingItem) =>
              pendingItem.filename === filename
              && pendingItem.file?.url === resumeFile.url
              && pendingItem.status === 'pending',
          );
          if (pendingIndex >= 0) {
            cvBatchInfo.pendingItems[pendingIndex].status = 'processed';
            cvBatchInfo.pendingItems[pendingIndex].processedAt = new Date();
            cvBatchInfo.pendingItems[pendingIndex].error = undefined;
          }

          results.push({
            filename,
            candidateId: new Types.ObjectId(candidateData.duplicateCandidateId),
            status: 'success',
          });
          // eslint-disable-next-line no-continue
          continue;
        }

        // Check if the CV was invalid
        if (candidateData.error) {
          // Add error item to batch
          upsertBatchItemFailure(cvBatchInfo, {
            filename,
            error: candidateData.error,
            parseFields,
          });

          const pendingIndex = cvBatchInfo.pendingItems.findIndex(
            (pendingItem) =>
              pendingItem.filename === filename
              && pendingItem.file?.url === resumeFile.url
              && pendingItem.status === 'pending',
          );
          if (pendingIndex >= 0) {
            cvBatchInfo.pendingItems[pendingIndex].status = 'failed';
            cvBatchInfo.pendingItems[pendingIndex].processedAt = new Date();
            cvBatchInfo.pendingItems[pendingIndex].error = candidateData.error;
          }

          errors.push({
            filename,
            error: candidateData.error,
          });
          // eslint-disable-next-line no-continue
          continue; // Skip to next file
        }

        const nowIso = new Date().toISOString();
        const remarks = shouldAddRemark
          ? [
              {
                description: normalizedOperations.remark || '',
                date: nowIso,
                rating:
                  typeof normalizedOperations.remarkRating === 'number'
                    ? normalizedOperations.remarkRating
                    : undefined,
                userId: user.id,
              },
            ]
          : [];

        const laneName =
          (shouldApplyOperations ? resolvedStatus : candidateData.status) ||
          'applied';
        const jobIdForLane = shouldApplyOperations
          ? normalizedOperations.jobId
          : undefined;
        const statusObjectId = await resolveCandidateStatusObjectId(
          organizationId as string,
          laneName,
          jobIdForLane,
        );
        const { status: _parsedStatus, ...candidateFields } = candidateData;

        // Create candidate record
        const candidate = new Candidate({
          ...candidateFields,
          jobId: jobIdForLane,
          status: statusObjectId,
          remarks,
          resume: resumeFile,
        });

        await candidate.save();
        createdCandidateIds.push(candidate._id.toString());

        if (candidate.email && candidate.organizationId) {
          try {
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
          } catch (error) {
            logger.error({ error }, 'Failed to update duplicate candidates from CV upload');
            // We don't want to block candidate creation if this fails
          }
        }

        await History?.create({
          candidateId: candidate._id,
          history: [
            {
              attachments: [resumeFile],
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
          normalizedOperations.jobId &&
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

          if (shouldAddRemark && normalizedOperations.remark) {
            historyEntries.push(
              buildRemarkHistoryEntry(
                user,
                nowIso,
                normalizedOperations.remark,
                normalizedOperations.isRemarkPrivate ?? true,
                typeof normalizedOperations.remarkRating === 'number'
                  ? normalizedOperations.remarkRating
                  : null,
              ),
            );
          }

          if (historyEntries.length > 0) {
            await History.findOneAndUpdate(
              { candidateId: candidate._id.toString() },
              { $push: { history: { $each: historyEntries } } },
              { upsert: true },
            );
          }
        }

        upsertBatchItemSuccess(cvBatchInfo, {
          filename,
          candidateId: candidate._id,
          parseFields,
        });
        const pendingIndex = cvBatchInfo.pendingItems.findIndex(
          (pendingItem) =>
            pendingItem.filename === filename
            && pendingItem.file?.url === resumeFile.url
            && pendingItem.status === 'pending',
        );
        if (pendingIndex >= 0) {
          cvBatchInfo.pendingItems[pendingIndex].status = 'processed';
          cvBatchInfo.pendingItems[pendingIndex].processedAt = new Date();
          cvBatchInfo.pendingItems[pendingIndex].error = undefined;
        }

        results.push({
          filename,
          candidateId: candidate._id,
          status: 'success',
        });
      } catch (error) {
        const parseFields = resolveBatchItemParseFieldsForFailure(
          error,
          cvParseContext,
          filename,
          resumeFile.size,
          lastParseFields,
        );
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        // Add error item to batch
        upsertBatchItemFailure(cvBatchInfo, {
          filename,
          error: errorMessage,
          parseFields,
        });
        const pendingIndex = cvBatchInfo.pendingItems.findIndex(
          (pendingItem) =>
            pendingItem.filename === filename
            && pendingItem.file?.url === resumeFile.url
            && pendingItem.status === 'pending',
        );
        if (pendingIndex >= 0) {
          cvBatchInfo.pendingItems[pendingIndex].status = 'failed';
          cvBatchInfo.pendingItems[pendingIndex].processedAt = new Date();
          cvBatchInfo.pendingItems[pendingIndex].error = errorMessage;
        }

        errors.push({
          filename,
          error: errorMessage,
        });
      }
    }

    // Update batch status

    cvBatchInfo.status = 'completed';
    cvBatchInfo.completedAt = new Date();
    cvBatchInfo.historyAt = cvBatchInfo.completedAt;
    await cvBatchInfo.save();

    if (createdCandidateIds.length > 0) {
      try {
        const createdCandidates = await Candidate.find({
          _id: { $in: createdCandidateIds },
        })
          .populate(candidateBroadcastPopulate)
          .lean();
        await broadcastMultipleCandidateUpdate(
          createdCandidates as unknown as Array<
            ICandidate & { history?: ICandidateHistory[] }
          >,
        );
      } catch (broadcastError) {
        logger.error(
          { error: broadcastError },
          'Failed to broadcast batch-created candidates',
        );
      }
    }

    // Send notification after batch processing is completed
    await NotificationService.notifyBulkImportCompleted({
      organizationId: organizationId as string,
      batchId: cvBatchInfo._id.toString(),
      successCount: cvBatchInfo.successCount,
      failureCount: cvBatchInfo.failureCount,
      triggerUserId: user?.id as string,
      triggerUserName: user?.name || 'Unknown User',
    });

    logger.info(
      {
        organizationId,
        batchId: cvBatchInfo._id.toString(),
        summary: {
          total: files.length + skippedFiles.length,
          processed: results.length,
          failed: errors.length,
          skipped: skippedFiles.length,
          successCount: cvBatchInfo.successCount,
          failureCount: cvBatchInfo.failureCount,
        },
      },
      'CV upload batch processing summary',
    );

    return NextResponse.json({
      message: 'Processing completed',
      batchId: cvBatchInfo._id,
      processed: results,
      errors,
      skipped: skippedFiles,
      summary: {
        total: files.length + skippedFiles.length,
        processed: results.length,
        failed: errors.length,
        skipped: skippedFiles.length,
      },
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error processing CV batch');
    // If there's an error in the main process, update the batch if it exists
    if (cvBatchInfo && cvBatchInfo._id) {
      try {
        cvBatchInfo.status = 'failed';
        cvBatchInfo.completedAt = new Date();
        cvBatchInfo.historyAt = cvBatchInfo.completedAt;
        await cvBatchInfo.save();
      } catch (saveError) {
        logger.error({ error: saveError }, 'Failed to save batch status on error');
      }
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred';

    logger.error(
      { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
      'CV batch processing failed',
    );

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 },
    );
  }
}

// New GET endpoint to fetch batches by organization ID
export async function GET(request: NextRequest) {
  await connectToDatabase();
  if (!Candidate || !Settings || !CVBatch) {
    return NextResponse.json(
      { error: 'Database not connected' },
      { status: 400 },
    );
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'User not Authenticated' },
      { status: 401 },
    );
  }
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams?.get('organizationId');
  const requestedPage = parsePositiveInteger(
    searchParams.get('page'),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const limit = parsePositiveInteger(
    searchParams.get('limit'),
    DEFAULT_HISTORY_PAGE_LIMIT,
    MAX_HISTORY_PAGE_LIMIT,
  );
  const rawStartDate = searchParams.get('startDate');
  const rawEndDate = searchParams.get('endDate');
  const startDate = parseHistoryDateBoundary(rawStartDate, 'start');
  const endDate = parseHistoryDateBoundary(rawEndDate, 'end');

  if (!organizationId) {
    return NextResponse.json(
      { error: 'organizationId is required' },
      { status: 400 },
    );
  }

  if (!Types.ObjectId.isValid(organizationId)) {
    return NextResponse.json(
      { error: 'organizationId must be a valid ObjectId' },
      { status: 400 },
    );
  }

  if (rawStartDate && !startDate) {
    return NextResponse.json(
      { error: 'startDate must be a valid date string' },
      { status: 400 },
    );
  }

  if (rawEndDate && !endDate) {
    return NextResponse.json(
      { error: 'endDate must be a valid date string' },
      { status: 400 },
    );
  }

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return NextResponse.json(
      { error: 'startDate must be before or equal to endDate' },
      { status: 400 },
    );
  }

  if (!CVBatch) {
    return NextResponse.json({ error: 'DB Not Connected' }, { status: 400 });
  }

  try {
    const organizationObjectId = new Types.ObjectId(organizationId);
    const basePipeline = buildBatchHistoryBasePipeline(
      organizationObjectId,
      startDate,
      endDate,
    );

    const countResult = await CVBatch.aggregate([
      ...basePipeline,
      { $count: 'totalCount' },
    ]);
    const totalCount = countResult[0]?.totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * limit;

    const historyRows = await CVBatch.aggregate([
      ...basePipeline,
      { $sort: { effectiveHistoryAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          organizationId: 1,
          totalFiles: 1,
          successCount: 1,
          failureCount: 1,
          status: 1,
          processingMode: 1,
          operationsSnapshot: 1,
          startedAt: 1,
          completedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          historyAt: '$effectiveHistoryAt',
        },
      },
    ]);

    const [deferredBatches, retryableFailedBatchDocs] = await Promise.all([
      CVBatch.find({
        organizationId: organizationObjectId,
        status: 'pending',
        processingMode: 'deferred',
      })
        .select(
          'organizationId totalFiles successCount failureCount status processingMode operationsSnapshot items pendingItems startedAt completedAt createdAt updatedAt historyAt',
        )
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
      CVBatch.find({
        organizationId: organizationObjectId,
        'items.status': 'failed',
      })
        .select('_id pendingItems items')
        .lean(),
    ]);

    const retryableFailedBatchIds = retryableFailedBatchDocs
      .filter((batch) => collectRetryableFailedItems(batch).length > 0)
      .map((batch) => batch._id.toString());

    return NextResponse.json(
      {
        history: {
          data: historyRows,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
        deferredBatches,
        retryableFailedBatchIds,
      },
      {
      status: 200,
      headers: JSON_NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error fetching CV batches');
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
