import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import connectToDatabase, {
  Candidate,
  Settings,
  cvBatch as CVBatch,
  History,
  DuplicateCandidate,
} from '@/lib/mongodb';
import { handleSingleFile } from '@/lib/fileUtils';
import { AIProviderFactory, ProcessedResumeData } from '@/lib/ai-providers';
import { AIProviders } from '@/lib/ai-providers/types';
import { decryptProviderKeys, ProvidersConfig } from '@/lib/encryption';
import { NotificationService } from '@/lib/notifications/notificationService';
import { Types } from 'mongoose';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ISettings, IAIProviders } from '@/lib/models/settings';
import logger from '@/lib/logger';

// Maximum file size limit (10MB) to prevent body size limit errors
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const MAX_ZIP_SIZE = MAX_FILE_SIZE * 10; // Allow ZIP files up to 100MB

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

async function processResume(
  base64Resume: string,
  decryptedAiProviders: AIProviders,
  organizationId: string,
): Promise<ExtendedProcessedResumeData> {
  try {
    // Use the already decrypted AI providers directly
    const aiProviders = decryptedAiProviders;

    const { activeProvider } = aiProviders;
    const apiKey = aiProviders[activeProvider]?.api_key;
    if (!apiKey) {
      throw new Error(
        `API key not found for active provider: ${activeProvider}`,
      );
    }

    // Get the appropriate AI provider
    const provider = AIProviderFactory.getProvider(activeProvider);

    // Get the selected model for this provider
    const selectedModel =
      aiProviders[activeProvider]?.customModel ||
      aiProviders[activeProvider]?.model;

    // Process the resume using the selected provider and model
    const parsedData = await provider.processResume(
      base64Resume,
      apiKey,
      selectedModel,
    );

    // Check if the response indicates an invalid CV
    if (parsedData.error) {
      return {
        ...parsedData,
        organizationId,
        status: 'rejected',
        isDeleted: false,
      };
    }

    // Check if a candidate with the same name exists
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

    // Exclude scores when status is 'applied'
    const { scores: _scores, ...parsedDataWithoutScores } = parsedData;

    return {
      ...parsedDataWithoutScores,
      organizationId,
      status: 'applied',
      isDeleted: false,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to process resume',
    );
  }
}

// Helper function to process ZIP entries recursively with size filtering
function processZipEntries(zip: AdmZip): {
  files: File[];
  skippedFiles: Array<{ filename: string; size: number; reason: string }>;
} {
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

        const file = new File([new Uint8Array(content)], filename, {
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
  const cvBatchInfo = new CVBatch({
    organizationId,
    totalFiles: 0,
    successCount: 0,
    failureCount: 0,
    status: 'processing',
  });

  try {
    const settings = (await Settings.findOne({ organizationId })
      .select('aiProviders gemini fileStorage')
      .lean()
      .exec()) as Pick<
      ISettings,
      'aiProviders' | 'gemini' | 'fileStorage'
    > | null;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    // Check if AI providers are configured with backward compatibility
    let aiProvider: IAIProviders | AIProviders | undefined =
      settings.aiProviders as IAIProviders | AIProviders | undefined;

    // Handle backward compatibility for legacy Gemini-only installations
    if (!aiProvider) {
      // Check if there's a legacy gemini configuration
      const legacyGeminiKey = settings.gemini?.gemini_key || '';

      aiProvider = {
        activeProvider: 'gemini',
        gemini: {
          api_key: legacyGeminiKey,
          model: 'gemini-1.5-flash',
          customModel: '',
        },
        openai: {
          api_key: '',
          model: 'gpt-4o-mini',
          customModel: '',
        },
        anthropic: {
          api_key: '',
          model: 'claude-3-5-sonnet-20241022',
          customModel: '',
        },
        perplexity: {
          api_key: '',
          model: 'sonar-pro',
          customModel: '',
        },
      } as IAIProviders;

      logger.log('Using backward compatibility for legacy Gemini settings');
    }

    // Decrypt API keys from database - MOVED UP
    // Note: decryptProviderKeys returns the same structure but with decrypted keys
    const decryptedAiProviders = decryptProviderKeys(
      aiProvider as ProvidersConfig,
      organizationId,
    ) as AIProviders;

    const { activeProvider } = decryptedAiProviders;
    const apiKey = decryptedAiProviders[activeProvider]?.api_key;

    // Add debug logging similar to evaluate API

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `${activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)} API key not found`,
        },
        { status: 404 },
      );
    }

    const files: File[] = [];
    const skippedFiles: Array<{ filename: string; size: number; reason: string }> = [];
    const uploadedFiles = formData.getAll('file');

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile instanceof File) {
        if (uploadedFile.name.endsWith('.zip')) {
          // Check ZIP file size
          if (uploadedFile.size > MAX_ZIP_SIZE) {
            skippedFiles.push({
              filename: uploadedFile.name,
              size: uploadedFile.size,
              reason: `ZIP file size (${(uploadedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (100MB)`,
            });
            // eslint-disable-next-line no-continue
            continue;
          }

          try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const zip = new AdmZip(buffer);

            // Process ZIP entries with size filtering
            const { files: zipFiles, skippedFiles: zipSkippedFiles } =
              processZipEntries(zip);
            files.push(...zipFiles);
            skippedFiles.push(...zipSkippedFiles);
          } catch (error) {
            skippedFiles.push({
              filename: uploadedFile.name,
              size: uploadedFile.size,
              reason: `Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        } else if (uploadedFile.type === 'application/pdf') {
          // Filter individual PDF files by size
          if (uploadedFile.size > MAX_FILE_SIZE) {
            skippedFiles.push({
              filename: uploadedFile.name,
              size: uploadedFile.size,
              reason: `File size (${(uploadedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
            });
            // eslint-disable-next-line no-continue
            continue;
          }
          files.push(uploadedFile);
        } else {
          return NextResponse.json(
            {
              error: 'Invalid file type. Only PDF and ZIP files are supported',
            },
            { status: 400 },
          );
        }
      }
    }

    // Update batch info with total files (including skipped files)
    // Note: totalFiles should include all files (processed + skipped) for accurate reporting
    const totalFilesIncludingSkipped = files.length + skippedFiles.length;
    cvBatchInfo.totalFiles = totalFilesIncludingSkipped;
    
    // Add skipped files to batch items as 'failed' status (schema only supports 'success' or 'failed')
    skippedFiles.forEach((skipped) => {
      cvBatchInfo.items.push({
        filename: skipped.filename,
        status: 'failed',
        error: skipped.reason,
        processedAt: new Date(),
      });
      cvBatchInfo.failureCount += 1;
    });

    await cvBatchInfo.save();

    const results: ProcessResult[] = [];
    const errors: ProcessError[] = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // FIXED: Pass decrypted AI providers instead of raw settings
        const candidateData = await processResume(
          base64Data,
          decryptedAiProviders, // Pass the already decrypted aiProviders
          organizationId as string,
        );
        
        // Check if the CV was invalid
        if (candidateData.error) {
          // Add error item to batch
          cvBatchInfo.items.push({
            filename: file.name,
            status: 'failed',
            error: candidateData.error,
            processedAt: new Date(),
          });
          cvBatchInfo.failureCount += 1;

          errors.push({
            filename: file.name,
            error: candidateData.error,
          });
          // eslint-disable-next-line no-continue
          continue; // Skip to next file
        }

        // Create proper file object for handleSingleFile with the actual file data
        const fileObject: FileObject = {
          id: new Types.ObjectId().toHexString(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: `data:${file.type};base64,${base64Data}`,
        };

        // Save the resume using handleSingleFile
        const resumeFile = await handleSingleFile(
          fileObject,
          settings.fileStorage?.storageType || 'local',
          organizationId as string,
        );

        if (!resumeFile) {
          throw new Error('Failed to save resume file');
        }

        // Create candidate record
        const candidate = new Candidate({
          ...candidateData,
          resume: resumeFile,
        });

        // Validate required fields
        const requiredFields: Array<keyof ExtendedProcessedResumeData> = [
          'name',
        ];
        const missingFields = requiredFields.filter(
          (field) => !candidateData[field],
        );

        if (missingFields.length > 0) {
          throw new Error(
            `Validation Error: Required fields not provided: ${missingFields.join(', ')}`,
          );
        }

        await candidate.save();

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
          jobId: null,
          history: [
            {
              dateTime: new Date(),
              title: 'cv-process batch',
              previousInterviewer: null,
              currentInterviewer: null,
              assignmentBy: user.id,
            },
          ],
        });

        cvBatchInfo.items.push({
          filename: file.name,
          candidateId: candidate._id,
          status: 'success',
          message: 'Successfully processed and created candidate',
          processedAt: new Date(),
        });
        cvBatchInfo.successCount += 1;

        results.push({
          filename: file.name,
          candidateId: candidate._id,
          status: 'success',
        });
      } catch (error) {
        // Add error item to batch
        cvBatchInfo.items.push({
          filename: file.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
        });
        cvBatchInfo.failureCount += 1;

        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update batch status

    cvBatchInfo.status = 'completed';
    cvBatchInfo.completedAt = new Date();
    await cvBatchInfo.save();

    // Send notification after batch processing is completed
    await NotificationService.notifyBulkImportCompleted({
      organizationId: organizationId as string,
      batchId: cvBatchInfo._id.toString(),
      successCount: cvBatchInfo.successCount,
      failureCount: cvBatchInfo.failureCount,
      triggerUserId: user?.id as string,
      triggerUserName: user?.name || 'Unknown User',
    });

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

  if (!organizationId) {
    return NextResponse.json(
      { error: 'organizationId is required' },
      { status: 400 },
    );
  }

  if (!CVBatch) {
    return NextResponse.json({ error: 'DB Not Connected' }, { status: 400 });
  }

  try {
    const batches = await CVBatch.find({ organizationId }).lean();

    return NextResponse.json(batches, { status: 200 });
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
