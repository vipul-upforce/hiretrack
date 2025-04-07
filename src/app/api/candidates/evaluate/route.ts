import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate, Settings } from "@/lib/mongodb";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";

async function evaluateResume(resumeText: string): Promise<{
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

    return {
        overall: 7,
        experience: 8,
        skills: 6,
        education: 7,
        projects: 5,
        certifications: 4,
        strengths: ["Strong technical background", "Good experience"],
        areas_for_improvement: ["Limited recent certifications"],
        recommendation: "Solid candidate for mid-level roles",
        notes: "Needs more project details",
    };
}

export async function GET() {
    return NextResponse.json({
        message: "SUCESSSS"
    })
}

export async function PUT(request: NextRequest) {
    try {
        console.log("&&&&&&&&&&&&&&&&&&&&&&&& ");
        await connectToDatabase();

        if (!Candidate || !Settings) {
            return NextResponse.json(
                { error: "Database not connected" },
                { status: 400 }
            );
        }

        const data = await request.json();
        console.log("******************* SETTINGSDTA: ", data)
        if (!data || !data.candidateId) {
            return NextResponse.json(
                { error: "Candidate ID is required" },
                { status: 400 }
            );
        }

        const { candidateId, organizationId } = data;
        const settingsData = await Settings.findById({ _id: organizationId });
        if (!settingsData) {
            return NextResponse.json(
                { error: "Gemini API-key not found" },
                { status: 404 }
            )
        }


        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return NextResponse.json(
                { error: "Candidate not found" },
                { status: 404 }
            );
        }

        const resumeUrl = candidate.resume?.url;
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

        const pdfData = await pdfParse(resumeBuffer);
        const resumeText = pdfData.text;

        const scores = await evaluateResume(resumeText);

        candidate.scores = scores;
        await candidate.save();

        return NextResponse.json(
            {
                message: "Candidate scores updated successfully",
                candidate: {
                    _id: candidate._id,
                    name: candidate.name,
                    scores: candidate.scores,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in PUT /candidate:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}