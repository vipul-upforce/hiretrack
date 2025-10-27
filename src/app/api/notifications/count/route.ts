import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];
    const orgId = request.cookies.get("org_id")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token, orgId);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = decryptedResponse.user;

    await connectToDatabase();
    if (!Notification) {
      return NextResponse.json(
        { error: "Notification Model not found" },
        { status: 404 }
      );
    }

    // Count unread notifications for this user
    const unreadCount = await Notification.countDocuments({
      organizationId: user.organizationId,
      recipientId: user._id,
      isRead: false,
    });

    // Also get total count
    const totalCount = await Notification.countDocuments({
      organizationId: user.organizationId,
      recipientId: user._id,
    });

    return NextResponse.json({
      unreadCount,
      totalCount,
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
