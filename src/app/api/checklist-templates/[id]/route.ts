import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { ChecklistTemplate } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

// GET - Get a specific checklist template
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = req.cookies.get("org_id")?.value;
    const decryptedResponse = await verifyAndDecryptJWTToken(token, orgId);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    await connectToDatabase();

    const template = await ChecklistTemplate!
      .findOne({
        _id: params.id,
        organizationId: decoded.organizationId,
      })
      .populate("createdBy", "name email");

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching checklist template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT - Update a checklist template
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = req.cookies.get("org_id")?.value;
    const decryptedResponse = await verifyAndDecryptJWTToken(token, orgId);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Check if user is admin or HR
    if (!["admin", "hr"].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Only admin and HR can update templates" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { name, description, fields, isActive } = body;

    const template = await ChecklistTemplate!.findOne({
      _id: params.id,
      organizationId: decoded.organizationId,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Update fields
    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (fields !== undefined) template.fields = fields;
    if (isActive !== undefined) template.isActive = isActive;
    template.updatedAt = new Date();

    await template.save();
    await template.populate("createdBy", "name email");

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error updating checklist template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a checklist template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = req.cookies.get("org_id")?.value;
    const decryptedResponse = await verifyAndDecryptJWTToken(token, orgId);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Check if user is admin
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can delete templates" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const result = await ChecklistTemplate!.findOneAndDelete({
      _id: params.id,
      organizationId: decoded.organizationId,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting checklist template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
