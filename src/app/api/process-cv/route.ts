import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AdmZip from "adm-zip";
import connectToDatabase, {
  Candidate,
  Settings,
  cvBatch as CVBatch,
} from "@/lib/mongodb";
import { handleSingleFile } from "@/lib/fileUtils";
import { auth } from "@/lib/auth";

interface ProcessedResumeData
  extends Record<string, string | number | string[] | boolean | undefined> {
  name: string;
  email?: string;
  location: string;
  experience: number;
  skills: string[];
  currentCTC: number;
  expectedCTC: number;
  noticePeriod: number;
  organizationId: string;
  status: string;
  isDeleted: boolean;
  error?: string;
}

async function processResume(
  base64Resume: string,
  api_key: string,
  organizationId: string
): Promise<ProcessedResumeData> {
  try {
    const genAI = new GoogleGenerativeAI(api_key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    please firstly check that it is valid cv or not, 
    if not then dont give me anything just give me message in json like 
    { error : " this is not valid cv"}, 
    If it as then & then only give me fields 
    As an AI assistant specializing in resume parsing, analyze this resume and extract the following information in JSON format:
    {
      "name": "candidate's full name",
      "email": "candidate's email if present",
      "location": "candidate's location/city",
      "experience": number of years of experience (as a number),
      "skills": ["array", "of", "technical", "and", "soft", "skills"],
      "currentCTC": current CTC as a number (in lakhs, 0 if not found),
      "expectedCTC": expected CTC as a number (in lakhs, 0 if not found),
      "noticePeriod": notice period in months (as a number, 0 if not found),
      "scores": {
        "overall": // An overall rating (out of 10),
        "experience": // A rating (out of 10),
        "skills": // A rating (out of 10),
        "strengths": // A list of strengths,
        "areas_for_improvement": // A list of areas for improvement,
        "recommendation": // A recommendation,
        "notes": // Additional notes
      }
    }
    
    Please ensure:
    1. All numeric fields are numbers, not strings
    2. Skills are extracted as an array of strings
    3. Experience is calculated based on work history
    4. CTCs are in lakhs per annum
    5. If any field is not found, use appropriate default values (0 for numbers, empty array for skills)
    
    Below is the resume content:`;

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Resume,
        },
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });
    const response = await result.response;

    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("No valid response from Gemini");
    }

    let jsonString = response.candidates[0].content.parts[0].text;
    jsonString = jsonString
      .replace(/```json\n?/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedData = JSON.parse(jsonString);

    // Check if the response indicates an invalid CV
    if (parsedData.error) {
      return {
        name: "",
        location: "",
        experience: 0,
        skills: [],
        currentCTC: 0,
        expectedCTC: 0,
        noticePeriod: 0,
        organizationId,
        status: "rejected",
        isDeleted: false,
        error: parsedData.error,
      };
    }

    return {
      ...parsedData,
      organizationId,
      status: "applied",
      isDeleted: false,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to process resume"
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
      entry.entryName.startsWith("__MACOSX/") ||
      entry.entryName.includes("/._") ||
      entry.entryName.startsWith("._")
    ) {
      continue;
    }

    // Check if it's a directory by checking if the path ends with '/'
    if (entry.entryName.endsWith("/")) {
      continue; // Skip directories as we'll process their contents through their files
    }
    // Check if it's a PDF file
    else if (entry.entryName.toLowerCase().endsWith(".pdf")) {
      const content = entry.getData();
      // Extract just the filename from the full path
      const filename = entry.entryName.split("/").pop() || entry.entryName;
      const file = new File([content], filename, {
        type: "application/pdf",
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
      { error: "Database not connected" },
      { status: 400 }
    );
  }

  const authInfo = await auth(request);
  if (!authInfo?.user) {
    return NextResponse.json(
      { error: "User not Authenticated" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }
  const cvBatchInfo = new CVBatch({
    organizationId,
    totalFiles: 0,
    status: "processing",
  });

  try {
    const settings = await Settings.findOne({ organizationId: organizationId });
    if (!settings?.gemini?.gemini_key) {
      return NextResponse.json(
        { error: "Gemini API key not found" },
        { status: 404 }
      );
    }

    const files: File[] = [];
    const uploadedFiles = formData.getAll("file");

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile instanceof File) {
        if (uploadedFile.name.endsWith(".zip")) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new AdmZip(buffer);

          // Use the new recursive function to process ZIP entries
          const zipFiles = processZipEntries(zip);
          files.push(...zipFiles);
        } else if (uploadedFile.type === "application/pdf") {
          files.push(uploadedFile);
        } else {
          return NextResponse.json(
            {
              error: "Invalid file type. Only PDF and ZIP files are supported",
            },
            { status: 400 }
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
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const candidateData = await processResume(
          base64Data,
          settings.gemini.gemini_key,
          organizationId as string
        );

        // Check if the CV was invalid
        if (candidateData.error) {
          // Add error item to batch
          cvBatchInfo.items.push({
            filename: file.name,
            status: "failed",
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
          name: file.name,
          type: file.type,
          size: file.size,
          url: `data:${file.type};base64,${base64Data}`,
        };

        // Save the resume using handleSingleFile
        const resumeFile = await handleSingleFile(
          fileObject,
          settings.fileStorage?.storageType || "local",
          organizationId as string
        );

        if (!resumeFile) {
          throw new Error("Failed to save resume file");
        }

        // Create candidate record
        const candidate = new Candidate({
          ...candidateData,
          resume: resumeFile,
        });

        // Validate required fields
        const requiredFields = ["name"];
        const missingFields = requiredFields.filter(
          (field) => !candidateData[field]
        );

        if (missingFields.length > 0) {
          throw new Error(
            `Validation Error: Required fields not provided: ${missingFields.join(", ")}`
          );
        }

        await candidate.save();

        // Add success item to batch
        cvBatchInfo.items.push({
          filename: file.name,
          candidateId: candidate._id,
          status: "success",
          message: "Successfully processed and created candidate",
          processedAt: new Date(),
        });
        cvBatchInfo.successCount += 1;

        results.push({
          filename: file.name,
          candidateId: candidate._id,
          status: "success",
        });
      } catch (error) {
        // Add error item to batch
        cvBatchInfo.items.push({
          filename: file.name,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });
        cvBatchInfo.failureCount += 1;

        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update batch status
    cvBatchInfo.status = "completed";
    cvBatchInfo.completedAt = new Date();
    await cvBatchInfo.save();

    return NextResponse.json({
      message: "Processing completed",
      batchId: cvBatchInfo._id,
      processed: results,
      errors: errors,
    });
  } catch (error) {
    // If there's an error in the main process, update the batch if it exists
    if (cvBatchInfo) {
      cvBatchInfo.status = "failed";
      cvBatchInfo.completedAt = new Date();
      await cvBatchInfo.save();
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// New GET endpoint to fetch batches by organization ID
export async function GET(request: NextRequest) {
  await connectToDatabase();
  if (!Candidate || !Settings || !CVBatch) {
    return NextResponse.json(
      { error: "Database not connected" },
      { status: 400 }
    );
  }

  const authInfo = await auth(request);
  if (!authInfo?.user) {
    return NextResponse.json(
      { error: "User not Authenticated" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  if (!CVBatch) {
    return NextResponse.json({ error: "DB Not Connected" }, { status: 400 });
  }

  try {
    const batches = await CVBatch.find({ organizationId }).lean();

    return NextResponse.json(batches, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
