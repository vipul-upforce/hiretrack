import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, {
  EmailHistory,
  User,
  Candidate,
} from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([  
      getAuthenticatedUser(request, "admin"),
      connectToDatabase(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update pending emails older than 5 minutes to failed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await EmailHistory!.updateMany(
      {
        status: "pending",
        createdAt: { $lte: fiveMinutesAgo },
        organizationId: user.organizationId,
      },
      { $set: { status: "failed", updatedAt: new Date() } }
    );

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    const query: any = { organizationId: user.organizationId };

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { recipientEmail: { $regex: search, $options: "i" } },
        { sentByEmail: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get total count
    const totalCount = await EmailHistory!.countDocuments(query);

    // Get paginated results
    const skip = (page - 1) * limit;
    const emailHistory = await EmailHistory!
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      emails: emailHistory,
      pagination: {
        current: page,
        total: Math.ceil(totalCount / limit),
        count: emailHistory.length,
        totalEmails: totalCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching email history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email history" },
      { status: 500 }
    );
  }
}
