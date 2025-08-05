import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { ChecklistTemplate } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { IChecklistTemplate } from "@/lib/models/ChecklistTemplate";

// GET - Get all checklist templates for the organization
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    await connectToDatabase();

    // Check if model is initialized
    if (!ChecklistTemplate) {
      console.error("ChecklistTemplate model not initialized");
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "incoming" | "outgoing" | null;
    const isActive = searchParams.get("active") === "true";

    // Build query
    const query: any = { organizationId: decoded.organizationId };
    if (type) query.type = type;
    if (isActive) query.isActive = true;

    const templates = await ChecklistTemplate.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Error fetching checklist templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Create a new checklist template
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Check if user is admin or HR
    if (!["admin", "hr"].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Only admin and HR can create templates" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Check if model is initialized
    if (!ChecklistTemplate) {
      console.error("ChecklistTemplate model not initialized");
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { name, description, type, fields } = body;

    // Validate required fields
    if (!name || !type || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Name, type, and fields are required" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["incoming", "outgoing"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'incoming' or 'outgoing'" },
        { status: 400 }
      );
    }

    // Create template
    const template = new ChecklistTemplate({
      organizationId: decoded.organizationId,
      name,
      description,
      type,
      fields,
      createdBy: decoded.id,
      isActive: true
    });

    await template.save();
    await template.populate("createdBy", "name email");

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error("Error creating checklist template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}