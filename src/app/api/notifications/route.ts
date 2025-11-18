import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase()
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("isRead");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");

    if (!Notification) {
      return NextResponse.json(
        { error: "Notification Model not found" },
        { status: 404 }
      );
    }

    // Build query
    const query: any = {
      organizationId: user.organizationId,
      recipientId: user.id,
    };

    if (isRead !== null && isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    if (type) {
      query.type = type;
    }

    if (priority) {
      query.priority = priority;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination info
    const totalCount = await Notification.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}
