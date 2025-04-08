import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate, Settings } from "@/lib/mongodb";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function evaluateResume(
  resumeText: string,
  api_key: string
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
          As a seasoned senior technology leader with expertise in talent acquisition, you are tasked with evaluating a candidate for the role, skills as The detailed job description is as follows: 
          Junior React Developer
    
          Company: Tech Solutions Inc.
          Location: Ahmedabad, Gujarat, India (or Remote)
    
          Job Summary:
          Tech Solutions Inc. is seeking a motivated and enthusiastic Junior React Developer to join our growing team. You will be responsible for developing and maintaining user interfaces for our web applications using React. This is an excellent opportunity to learn from experienced developers and contribute to impactful projects.
    
          Responsibilities:
    
          Write clean, well-documented, and efficient React code.
          Participate in code reviews and provide constructive feedback.
          Collaborate with designers and backend developers to implement user interfaces.
          Troubleshoot and debug front-end issues.
          Stay up-to-date with the latest React best practices and trends.
          Contribute to the improvement of our development processes.
          Qualifications:
    
          Bachelor's degree in Computer Science or a related field (or equivalent experience).
          Solid understanding of JavaScript, HTML, and CSS.
          Familiarity with React fundamentals (JSX, components, state management, props, hooks).
          Experience with version control (Git).
          Strong problem-solving and communication skills.
          Enthusiasm for learning and working in a team environment.
          Bonus Points:
    
          Experience with state management libraries like Redux or Context API.
          Familiarity with testing frameworks (e.g., Jest, React Testing Library).
          Understanding of RESTful APIs.
          Exposure to build tools (e.g., Webpack, Babel).
          .
    
          Your objective is to assess this CV against the required skills, experience, and the job description. Please provide your evaluation in JSON format, adhering to the following structure and guidelines:
    
          {
            "overall": // An overall rating (out of 10) reflecting the candidate's suitability for the role based on the CV. Consider the alignment of skills, experience, and demonstrated impact with the job description.
            "skills": // A rating (out of 10) specifically assessing the match between the candidate's mentioned skills and the required skills for the role.
            "experience": // A rating (out of 10) evaluating the relevance and depth of the candidate's experience in relation to the job description and required experience levels.
            "strengths": // A concise bulleted list of the candidate's key strengths identified from the CV that align with the role.
            "areas_for_improvement": // A concise bulleted list of potential areas where the candidate's CV could be stronger or where there might be gaps in relation to the requirements.
            "recommendation": // A brief recommendation, such as "Strongly Recommend for Interview," "Recommend for Interview," "Consider for Other Roles," or "Not a Strong Match."
            "notes": // Any additional qualitative observations or context that informed your ratings and recommendation.
            "failure": // If the process encounters a critical error or you cannot provide a meaningful evaluation, include an error message here. Otherwise, this field should be omitted or left empty.
          }
    
    Below is the text content of a Curriculum Vitae (CV) submitted by an applicant:
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
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    const settingsData = await Settings.findOne({
      organizationId: candidate.organizationId,
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

    const response = await fetch(resumeUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch resume file" },
        { status: 500 }
      );
    }
    const resumeBuffer = await response.buffer();
    const base64Resume = resumeBuffer.toString("base64");

    const scores = await evaluateResume(
      base64Resume,
      settingsData.gemini.gemini_key
    );

    candidate.scores = scores;
    await candidate.save();

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
