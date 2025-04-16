import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AdmZip from "adm-zip";
import connectToDatabase, { Candidate, Settings } from "@/lib/mongodb";
import { handleSingleFile } from "@/lib/fileUtils";
import fs from "fs";

interface ProcessedResumeData {
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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    if (!Candidate || !Settings) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const organizationId = formData.get("organizationId");
    const jobId = formData.get("jobId");

    if (!organizationId || !jobId) {
      return NextResponse.json(
        { error: "organizationId and jobId are required" },
        { status: 400 }
      );
    }

    const settings = await Settings.findOne({ organizationId: organizationId });
    if (!settings?.gemini?.gemini_key) {
      return NextResponse.json(
        { error: "Gemini API key not found" },
        { status: 404 }
      );
    }

    const files: File[] = [];
    const uploadedFiles = formData.getAll("file"); // Get all files

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile instanceof File) {
        if (uploadedFile.name.endsWith(".zip")) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();

          for (const entry of zipEntries) {
            if (entry.entryName.toLowerCase().endsWith(".pdf")) {
              const content = entry.getData();
              const file = new File([content], entry.entryName, {
                type: "application/pdf",
              });
              files.push(file);
            }
          }
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
          jobId,
          resume: resumeFile, // This will now have the correct URL from handleSingleFile
        });

        await candidate.save();
        results.push({
          filename: file.name,
          candidateId: candidate._id,
          status: "success",
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: "Processing completed",
      processed: results,
      errors: errors,
    });
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
