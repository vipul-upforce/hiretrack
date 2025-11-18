import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { ChecklistTemplate } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

// GET - Get a specific checklist template
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(req),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await ChecklistTemplate!
      .findOne({
        _id: params.id,
        organizationId: user.organizationId,
      })
      .populate("createdBy", "name email")
      .lean()
      .exec();

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
    const [decoded, body] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      req.json(),
      connectToDatabase(),
    ]);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    const [decoded] = await Promise.all([
      getAuthenticatedUser(req, "admin"),
      connectToDatabase(),
    ]);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
