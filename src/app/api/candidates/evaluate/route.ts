import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, {
  Candidate,
  History,
  Job,
  Settings,
} from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";
import { stripHtml } from "@/app/dashboard/jobs-board/schemas/job-schema";
import { broadcastCandidateUpdate } from "@/lib/broadcast/broadCastCandidate";
import { ICandidate } from "@/lib/models/candidate";
import { AIEvaluationService } from "@/lib/ai-providers/evaluation-provider";
import { decryptProviderKeys } from "@/lib/encryption";

const generateBase64 = async (url: any) => {
  // const urlParams = new URLSearchParams(url.split("files?pathName=")[1]);
  // const pathName = urlParams.get("pathName");
  const pathName = url.split("files?pathName=")[1];
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
  experience?: number;
}

// Calculate comparative ranking for a candidate within their job's candidate pool
async function calculateComparativeRanking(
  candidateId: any,
  jobId: any,
  currentScores: any
) {
  try {
    // Get all candidates for this job with scores
    const candidates = await Candidate.find({
      jobId: typeof jobId === "object" && "_id" in jobId ? jobId._id : jobId,
      scores: { $exists: true },
      isDeleted: { $ne: true },
    }).select("scores");

    if (!candidates || candidates.length === 0) {
      return {
        overallRank: 1,
        totalCandidates: 1,
        percentile: 100,
        skillsPercentile: 100,
        experiencePercentile: 100,
        affordabilityPercentile: 100,
        hasTie: false,
        tiedWithCount: 0,
        rankingBasedOn: 'overall' as const,
      };
    }

    const totalCandidates = candidates.length;

    // Determine which score to use for ranking (weighted score if available, otherwise overall)
    const useWeightedScore = currentScores.weightedScore != null;
    const rankingBasedOn: 'overall' | 'weighted' = useWeightedScore ? 'weighted' : 'overall';
    const currentRankingScore = useWeightedScore ? currentScores.weightedScore : currentScores.overall;

    // Calculate percentiles for each dimension (including ties)
    const calculatePercentile = (value: number, allValues: number[]) => {
      const sorted = allValues.filter((v) => v != null).sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < value).length;
      const countEqual = sorted.filter((v) => v === value).length;
      // Use midpoint method for ties: add half of tied values
      const adjustedCount = countBelow + (countEqual - 1) / 2;
      return Math.round((adjustedCount / sorted.length) * 100);
    };

    // Extract scores for all candidates
    const allOverallScores = candidates
      .map((c) => c.scores?.overall)
      .filter((s) => s != null);
    const allSkillsScores = candidates
      .map((c) => c.scores?.skills)
      .filter((s) => s != null);
    const allExperienceScores = candidates
      .map((c) => c.scores?.experience)
      .filter((s) => s != null);
    const allAffordabilityScores = candidates
      .map((c) => c.scores?.affordability)
      .filter((s) => s != null);

    // Sort candidates by ranking score (weighted if available, otherwise overall)
    const sortedCandidates = candidates
      .filter((c) => {
        if (useWeightedScore) {
          return c.scores?.weightedScore != null;
        }
        return c.scores?.overall != null;
      })
      .sort((a, b) => {
        const scoreA = useWeightedScore ? (a.scores?.weightedScore || 0) : (a.scores?.overall || 0);
        const scoreB = useWeightedScore ? (b.scores?.weightedScore || 0) : (b.scores?.overall || 0);
        return scoreB - scoreA; // Highest first
      });

    const currentCandidateRank =
      sortedCandidates.findIndex(
        (c) => c._id.toString() === candidateId.toString()
      ) + 1;

    // Check for ties at the same ranking score
    const candidatesWithSameScore = sortedCandidates.filter((c) => {
      const score = useWeightedScore ? c.scores?.weightedScore : c.scores?.overall;
      return score === currentRankingScore;
    });
    const hasTie = candidatesWithSameScore.length > 1;
    const tiedWithCount = candidatesWithSameScore.length - 1; // Excluding current candidate

    // Get all ranking scores for percentile calculation
    const allRankingScores = sortedCandidates.map((c) =>
      useWeightedScore ? (c.scores?.weightedScore || 0) : (c.scores?.overall || 0)
    );

    return {
      overallRank: currentCandidateRank || 1,
      totalCandidates,
      percentile: calculatePercentile(currentRankingScore, allRankingScores),
      skillsPercentile: calculatePercentile(
        currentScores.skills,
        allSkillsScores
      ),
      experiencePercentile: calculatePercentile(
        currentScores.experience,
        allExperienceScores
      ),
      affordabilityPercentile: calculatePercentile(
        currentScores.affordability || 0,
        allAffordabilityScores
      ),
      hasTie,
      tiedWithCount,
      rankingBasedOn,
    };
  } catch (error) {
    console.error("Error calculating comparative ranking:", error);
    return {
      overallRank: 1,
      totalCandidates: 1,
      percentile: 0,
      skillsPercentile: 0,
      experiencePercentile: 0,
      affordabilityPercentile: 0,
      hasTie: false,
      tiedWithCount: 0,
      rankingBasedOn: 'overall' as const,
    };
  }
}

// This function is now replaced by AIEvaluationService
// Kept for backward compatibility if needed

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
    const organizationId =
      candidate.jobId &&
      typeof candidate.jobId === "object" &&
      "organizationId" in candidate.jobId
        ? String(candidate.jobId.organizationId)
        : "";

    console.log("Looking for settings with organizationId:", organizationId);

    const settingsData = await Settings.findOne({
      organizationId: organizationId,
    });

    if (!settingsData) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // Check if AI providers are configured with backward compatibility
    let aiProviders = settingsData.aiProviders;

    // Handle backward compatibility for legacy Gemini-only installations
    if (!aiProviders) {
      // Check if there's a legacy gemini configuration
      const legacyGeminiKey = settingsData.gemini?.gemini_key || "";

      aiProviders = {
        activeProvider: "gemini",
        gemini: {
          api_key: legacyGeminiKey,
          model: "gemini-1.5-flash",
          customModel: "",
        },
        openai: {
          api_key: "",
          model: "gpt-4o-mini",
          customModel: "",
        },
        anthropic: {
          api_key: "",
          model: "claude-3-5-sonnet-20241022",
          customModel: "",
        },
        perplexity: {
          api_key: "",
          model: "sonar-pro",
          customModel: "",
        },
      };

      console.log("Using backward compatibility for legacy Gemini settings");
    }

    // Decrypt API keys from database
    aiProviders = decryptProviderKeys(aiProviders, organizationId);

    const activeProvider = aiProviders.activeProvider;
    const apiKey = aiProviders[activeProvider]?.api_key;

    // Debug logging
    console.log(
      "AI Providers from settings:",
      JSON.stringify(
        {
          activeProvider: aiProviders.activeProvider,
          hasGeminiKey: !!aiProviders.gemini?.api_key,
          hasOpenAIKey: !!aiProviders.openai?.api_key,
          hasAnthropicKey: !!aiProviders.anthropic?.api_key,
          hasPerplexityKey: !!aiProviders.perplexity?.api_key,
          anthropicObject: aiProviders.anthropic,
        },
        null,
        2
      )
    );

    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not found for active provider: ${activeProvider}` },
        { status: 404 }
      );
    }
    let resumeUrl = candidate.resume.url;
    if (!resumeUrl.startsWith("http")) {
      resumeUrl = `${request.headers.get("origin")}${resumeUrl}`.trim();
    }
    console.log("📌📌RESUME URL : ", resumeUrl);
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
      if (!resumeUrl.startsWith("http")) {
        console.log("reqHeader: ", request.headers.get("origin"));
        resumeUrl = request.headers.get("origin") + resumeUrl;
      }
      const response = await fetch(resumeUrl.trim());
      // console.log("🔥🔥🔥 Response: ", await response.json());
      if (!response.ok) {
        // console.log("Resumne FETCH",response);
        return NextResponse.json(
          { error: "Failed to fetch resume file" },
          { status: 500 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const resumeBuffer = Buffer.from(arrayBuffer);
      base64Resume = resumeBuffer.toString("base64");
    }

    // Check PDF page count if autoEvaluateAllCandidates is false
    const evaluationConfig = settingsData.evaluationConfig || {
      autoEvaluateAllCandidates: false,
      maxPdfPages: 4,
      temperature: 0.1,
      customPrompt: null,
    };

    if (!evaluationConfig.autoEvaluateAllCandidates) {
      // Check page count
      try {
        const pdfBuffer = Buffer.from(base64Resume, "base64");
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
        const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
        const pageCount = pdf.numPages;

        if (
          evaluationConfig.maxPdfPages > 0 &&
          pageCount > evaluationConfig.maxPdfPages
        ) {
          return NextResponse.json(
            {
              error: `Resume has ${pageCount} pages. Auto-evaluation is limited to ${evaluationConfig.maxPdfPages} pages. Please evaluate manually or update settings.`,
            },
            { status: 400 }
          );
        }
      } catch (pdfError) {
        console.warn("PDF page count check failed:", pdfError);
        // Continue with evaluation if page check fails
      }
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
      experience: job?.experience,
    };
    // Log what we're passing to the evaluation service
    console.log(
      "Passing to AIEvaluationService:",
      JSON.stringify(
        {
          hasAiProviders: !!aiProviders,
          activeProvider: aiProviders.activeProvider,
          geminiKeyLength: aiProviders.gemini?.api_key?.length,
        },
        null,
        2
      )
    );

    // Create settings object with decrypted aiProviders
    const settingsForEvaluation = {
      ...settingsData.toObject(),
      aiProviders: aiProviders, // Override with decrypted version
    };

    // Pass the settings with decrypted aiProviders
    const scores = await AIEvaluationService.evaluateResume(
      base64Resume,
      settingsForEvaluation,
      jobData,
      candidate
    );

    // Calculate weighted score if job has custom weights
    if (job?.evaluationWeights) {
      const weightedScore = AIEvaluationService.calculateWeightedScore(
        {
          overall: scores.overall,
          skills: scores.skills,
          experience: scores.experience,
          affordability: scores.affordability || 0,
        },
        job.evaluationWeights
      );
      scores.weightedScore = weightedScore;
    }

    // Calculate comparative ranking if enabled
    if (evaluationConfig.enableComparativeRanking) {
      const comparativeRanking = await calculateComparativeRanking(
        candidate._id,
        candidate.jobId,
        scores
      );
      scores.comparativeRanking = comparativeRanking;
    }

    // Debug: Check if suggestedAnswer is in scores before saving
    console.log("📝 Scores before saving to DB:", JSON.stringify(scores.interviewQuestions, null, 2));

    candidate.scores = scores;
    candidate.contact = candidate.contact;
    await candidate.save();

    // Debug: Check if suggestedAnswer is in candidate after saving
    console.log("📝 Candidate scores after save:", JSON.stringify(candidate.scores.interviewQuestions, null, 2));

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

    // Debug: Check if suggestedAnswer is in fullCandidate after query
    console.log("📝 Full candidate interviewQuestions after query:", JSON.stringify(fullCandidate.scores?.interviewQuestions, null, 2));
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
    // Debug: Check what's being broadcast
    const dataTobroadcast = {
      ...fullCandidate,
      history: candidateHistoryPopulated?.history,
    };
    console.log("📝 Broadcasting interviewQuestions:", JSON.stringify(dataTobroadcast.scores?.interviewQuestions, null, 2));

    broadcastCandidateUpdate(dataTobroadcast);

    return NextResponse.json(
      {
        message: "Candidate scores updated successfully",
        candidate: scores,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Upper: ", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log(error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
