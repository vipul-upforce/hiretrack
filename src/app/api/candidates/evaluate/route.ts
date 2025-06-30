import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, {
  Candidate,
  History,
  Job,
  Settings,
} from "@/lib/mongodb";
// import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";
import { stripHtml } from "@/app/dashboard/jobs-board/schemas/job-schema";
import { broadcastCandidateUpdate } from "@/lib/broadcast/broadCastCandidate";
import { ICandidate } from "@/lib/models/candidate";
// import { verifyAndDecryptToken } from "@/app/actions/auth";

const generateBase64 = async (url: any) => {
  const urlParams = new URLSearchParams(url.split("?")[1]);
  const pathName = urlParams.get("pathName");
  if (!pathName) {
    return "";
  }
  const safePath = path.normalize(pathName);
  const filePath = safePath;
  const fileBuffer = await fs.readFile(filePath);
  const base64Resume = fileBuffer.toString("base64");
  return base64Resume;
};

interface JobForEvaluate {
  description: string;
  title: string;
  skills: string[];
  salary?: string;
}

async function evaluateResume(
  resumeText: string,
  api_key: string,
  jobData: JobForEvaluate,
  candidate: ICandidate
): Promise<{
  overall: number;
  experience: number;
  skills: number;
  education: number;
  projects: number;
  certifications: number;
  strengths: string[];
  areas_for_improvement: string[];
  recommendation: string;
  notes: string;
  failure?: string;
}> {
  try {
    const genAI = new GoogleGenerativeAI(api_key);
    const data = resumeText;
    const jobDescription = await stripHtml(jobData?.description);
    const jobTitle = jobData.title;
    const jobSkills = jobData.skills.join(", ");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // console.log("[JOBSALARY ]: ", jobData.salary);
    const prompt = `
    As a seasoned senior technology leader with expertise in talent acquisition, you are conducting a rigorous evaluation of a candidate. You must evaluate each dimension independently and avoid giving similar scores across categories.
    
    Job Details:
    - Job Title: ${jobTitle}
    - Job Description: ${jobDescription}
    - Job Salary: ${jobData.salary}
    - Candidate's Current salary: ${candidate.currentCTC}
    - Candidate's Expected salary: ${candidate.expectedCTC}
    - Required Skills: ${jobSkills}
    
    EVALUATION FRAMEWORK - Each category must be scored independently:
    
    **OVERALL SUITABILITY (1-10):**
    - 9-10: Exceptional fit, exceeds most requirements
    - 7-8: Strong fit, meets most requirements with some standout qualities
    - 5-6: Moderate fit, meets basic requirements but has notable gaps
    - 3-4: Weak fit, significant gaps in multiple areas
    - 1-2: Poor fit, major misalignment with role requirements
    
    **SKILLS ASSESSMENT (1-10) - TECHNICAL FOCUS ONLY:**
    Evaluate ONLY technical/hard skills mentioned in CV vs. job requirements:
    - 9-10: Possesses 90%+ of required skills with advanced proficiency
    - 7-8: Possesses 70-89% of required skills with good proficiency
    - 5-6: Possesses 50-69% of required skills with basic proficiency
    - 3-4: Possesses 30-49% of required skills, significant gaps
    - 1-2: Possesses <30% of required skills, major skill deficiencies
    
    **EXPERIENCE ASSESSMENT (1-10) - WORK HISTORY FOCUS ONLY:**
    Evaluate ONLY professional work experience relevance and duration:
    - 9-10: Highly relevant experience exceeding job requirements (years + domain match)
    - 7-8: Relevant experience meeting job requirements with good domain alignment
    - 5-6: Somewhat relevant experience, partial domain match or insufficient years
    - 3-4: Limited relevant experience, weak domain alignment
    - 1-2: Minimal or irrelevant work experience for this role
    
    **AFFORDABILITY ASSESSMENT (1-10):**
    IMPORTANT: First normalize salary formats before comparison:
    - If candidate expectation is >1000 (e.g., 34000, 45000): Treat as monthly salary in thousands, convert to LPA by dividing by 1000 and multiplying by 12
    - If candidate expectation is ≤100 (e.g., 34, 45): Treat as LPA (Lakhs Per Annum)
    - Apply same logic to job salary for comparison
    
    After normalization, compare candidate's expected CTC with job salary:
    - 9-10: Candidate expectation is 0-10% below job salary (highly affordable)
    - 7-8: Candidate expectation is within ±10% of job salary (affordable)
    - 5-6: Candidate expectation is 10-25% above job salary (moderately affordable)
    - 3-4: Candidate expectation is 25-50% above job salary (challenging)
    - 1-2: Candidate expectation is 50%+ above job salary (unaffordable)
    
    *If no salary expectation is mentioned in CV or Job Salary is not provided, score as N/A*
    
    CRITICAL INSTRUCTIONS:
    1. Each score must reflect the specific criteria above
    2. Be strict and objective - average candidates should receive 4-6 scores, not 7-8
    3. Skills score should ONLY consider technical abilities, not soft skills or education
    4. Experience score should ONLY consider relevant work history duration and domain match
    5. For affordability, clearly show your salary normalization logic in the notes
    6. Provide specific evidence from the CV to justify each score
    
    Return your evaluation in this JSON format:
    {
      "overall": // Overall suitability score (1-10) with brief justification
      "skills": // Technical skills match score (1-10) with specific skill gaps/matches noted
      "experience": // Work experience relevance score (1-10) with years and domain relevance noted
      "affordability": // Salary alignment score (1-10) with calculation shown (include normalization logic)
      "strengths": // Maximum 4 bullet points of genuine strengths from CV
      "areas_for_improvement": // Maximum 4 bullet points of specific gaps or weaknesses
      "recommendation": // One of: "Strongly Recommend", "Recommend", "Consider with Reservations", "Not Recommended"
      "notes": // Specific evidence from CV that influenced your scoring, include salary normalization logic
    }
    
    SALARY NORMALIZATION EXAMPLES:
    - Candidate says "34000 expected": 34000 ÷ 1000 × 12 = 4.08 LPA
    - Candidate says "34 LPA expected": 34 LPA (no conversion needed)
    - Candidate says "45000 current, 50000 expected": 50000 ÷ 1000 × 12 = 6 LPA expected
    
    Below is the CV content for evaluation:
    `;

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: data,
        },
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });
    const response = await result.response;

    if (response && response.candidates && response.candidates.length > 0) {
      const firstCandidate = response.candidates[0];
      if (
        firstCandidate.content &&
        firstCandidate.content.parts &&
        firstCandidate.content.parts.length > 0
      ) {
        let jsonString = firstCandidate.content.parts[0].text;

        // Remove the markdown code block delimiters
        jsonString = jsonString?.replace(/```json\n/i, "");
        jsonString = jsonString?.replace(/```/i, "");
        jsonString = jsonString?.trim();

        try {
          if (!jsonString) throw new Error("No JSON string to parse");
          const parsedObject = JSON.parse(jsonString);
          return parsedObject;
        } catch {
          throw new Error("Failed to parse JSON response from Gemini");
        }
      } else {
        throw new Error("No content parts found in the Gemini response");
      }
    } else {
      throw new Error("No candidates found in the Gemini response");
    }
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to process resume or score it"
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "SUCESSSS",
  });
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    if (!Candidate || !Settings) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const data = await request.json();
    if (!data || !data.candidateId) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    const { candidateId } = data;
    const candidate = await Candidate.findById(candidateId).populate({
      path: "jobId",
      select: "description organizationId title skills",
    });
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    const job = await Job?.findById(
      candidate.jobId &&
        typeof candidate.jobId === "object" &&
        "_id" in candidate.jobId
        ? String(candidate.jobId._id)
        : ""
    );
    const settingsData = await Settings.findOne({
      organizationId:
        candidate.jobId &&
        typeof candidate.jobId === "object" &&
        "organizationId" in candidate.jobId
          ? String(candidate.jobId.organizationId)
          : "",
    });
    if (!settingsData) {
      return NextResponse.json(
        { error: "Gemini API-key not found" },
        { status: 404 }
      );
    }
    const resumeUrl = candidate.resume.url;
    if (!resumeUrl) {
      return NextResponse.json(
        { error: "Resume URL not found" },
        { status: 400 }
      );
    }

    let base64Resume;
    // const cookie = (await request.cookies.get("token")?.value) || "{}";
    // const token = await verifyAndDecryptToken(cookie);
    // const user = (await token).user;
    const fileStorage = settingsData.fileStorage.storageType || "local";
    if (fileStorage === "local") {
      base64Resume = await generateBase64(resumeUrl);
    } else {
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch resume file" },
          { status: 500 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const resumeBuffer = Buffer.from(arrayBuffer);
      base64Resume = resumeBuffer.toString("base64");
    }

    const jobDescription =
      candidate.jobId &&
      typeof candidate.jobId === "object" &&
      "description" in candidate.jobId
        ? String(candidate.jobId.description)
        : "";
    const jobData = {
      description: jobDescription,
      salary: job?.salary && job.salary.inText ? job.salary.inText : undefined,
      title:
        typeof candidate.jobId === "object" && "title" in candidate.jobId
          ? String(candidate.jobId.title)
          : "",
      skills:
        typeof candidate.jobId === "object" && "skills" in candidate.jobId
          ? (candidate.jobId.skills as string[])
          : [],
    };
    const scores = await evaluateResume(
      base64Resume,
      settingsData.gemini.gemini_key,
      jobData,
      candidate
    );

    candidate.scores = scores;
    await candidate.save();

    const fullCandidate = (await Candidate.findById(candidate._id)
      .populate([
        {
          path: "assignment.interviewerId",
          select: "_id name email",
        },
        {
          path: "remarks.userId",
          select: "name email",
        },
        {
          path: "jobId",
          select: "_id description title",
        },
      ])
      .lean()) as ICandidate;

    const candidateHistory = await History?.findOne({
      candidateId: candidate._id,
      jobId:
        typeof fullCandidate.jobId === "object" &&
        "_id" in fullCandidate.jobId &&
        fullCandidate.jobId?._id,
    });
    const candidateHistoryPopulated = await candidateHistory?.populate([
      { path: "history.assignmentBy", select: "_id name email" },
      { path: "history.currentInterviewer", select: "_id name email" },
      { path: "history.previousInterviewer", select: "_id name email" },
      { path: "history.note.userId", select: "_id name email" },
    ]);
    broadcastCandidateUpdate({
      ...fullCandidate,
      history: candidateHistoryPopulated?.history,
    });

    return NextResponse.json(
      {
        message: "Candidate scores updated successfully",
        candidate: scores,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
