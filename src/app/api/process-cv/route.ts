import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import connectToDatabase, {
  Candidate,
  Settings,
  cvBatch as CVBatch,
  History,
} from '@/lib/mongodb';
import { handleSingleFile } from '@/lib/fileUtils';
import { AIProviderFactory, ProcessedResumeData } from '@/lib/ai-providers';
import { decryptProviderKeys } from '@/lib/encryption';
import { NotificationService } from '@/lib/notifications/notificationService';
import { Types } from 'mongoose';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

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

async function processResume(
  base64Resume: string,
  decryptedAiProviders: any, // Changed: Accept already decrypted AI providers
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

    return {
      ...parsedData,
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

// Helper function to process ZIP entries recursively
function processZipEntries(zip: AdmZip): File[] {
  const files: File[] = [];
  const entries = zip.getEntries();

  for (const entry of entries) {
    // Skip macOS system files and hidden files
    if (
      entry.entryName.startsWith('__MACOSX/') ||
      entry.entryName.includes('/._') ||
      entry.entryName.startsWith('._')
    ) {
      continue;
    }

    // Check if it's a directory by checking if the path ends with '/'
    if (entry.entryName.endsWith('/')) {
      continue; // Skip directories as we'll process their contents through their files
    }
    // Check if it's a PDF file
    else if (entry.entryName.toLowerCase().endsWith('.pdf')) {
      const content = entry.getData();
      // Extract just the filename from the full path
      const filename = entry.entryName.split('/').pop() || entry.entryName;
      const file = new File([content as BlobPart], filename, {
        type: 'application/pdf',
      });
      files.push(file);
    }
  }

  return files;
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
  const formData = await request.formData();
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams?.get('organizationId');
  if (!organizationId) {
    return NextResponse.json(
      { error: 'organizationId is required' },
      { status: 400 },
    );
  }
  const cvBatchInfo = new CVBatch({
    organizationId,
    totalFiles: 0,
    status: 'processing',
  });

  try {
    const settings = await Settings.findOne({ organizationId })
      .select('aiProviders gemini fileStorage')
      .lean()
      .exec();
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    // Check if AI providers are configured with backward compatibility
    let { aiProviders } = settings;

    // Handle backward compatibility for legacy Gemini-only installations
    if (!aiProviders) {
      // Check if there's a legacy gemini configuration
      const legacyGeminiKey = settings.gemini?.gemini_key || '';

      aiProviders = {
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
      };
    }

    // Decrypt API keys from database - MOVED UP
    aiProviders = decryptProviderKeys(aiProviders, organizationId);

    const { activeProvider } = aiProviders;
    const apiKey = aiProviders[activeProvider]?.api_key;

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
    const uploadedFiles = formData.getAll('file');

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile instanceof File) {
        if (uploadedFile.name.endsWith('.zip')) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new AdmZip(buffer);

          // Use the new recursive function to process ZIP entries
          const zipFiles = processZipEntries(zip);
          files.push(...zipFiles);
        } else if (uploadedFile.type === 'application/pdf') {
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

    cvBatchInfo.totalFiles = files.length;
    await cvBatchInfo.save();

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // FIXED: Pass decrypted AI providers instead of raw settings
        const candidateData = await processResume(
          base64Data,
          aiProviders, // Pass the already decrypted aiProviders
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
          continue; // Skip to next file
        }

        // Create proper file object for handleSingleFile with the actual file data
        const fileObject = {
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
        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(
          (field) => !candidateData[field],
        );

        if (missingFields.length > 0) {
          throw new Error(
            `Validation Error: Required fields not provided: ${missingFields.join(', ')}`,
          );
        }

        await candidate.save();

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
      triggerUserId: user?.id!,
      triggerUserName: user?.name || 'Unknown User',
    });

    return NextResponse.json({
      message: 'Processing completed',
      batchId: cvBatchInfo._id,
      processed: results,
      errors,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error processing CV batch');
    // If there's an error in the main process, update the batch if it exists
    if (cvBatchInfo) {
      cvBatchInfo.status = 'failed';
      cvBatchInfo.completedAt = new Date();
      await cvBatchInfo.save();
    }

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
