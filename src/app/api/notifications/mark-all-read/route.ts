import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { broadcastNotificationCount } from "@/lib/broadcast/broadcastNotifications";

export async function PUT(request: NextRequest) {
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

    // Mark all unread notifications as read for this user
    const result = await Notification.updateMany(
      {
        organizationId: user.organizationId,
        recipientId: user._id,
        isRead: false,
      },
      {
        isRead: true,
        updatedAt: new Date(),
      }
    );

    try {
      broadcastNotificationCount(user.organizationId, user._id, 0);
    } catch (e) {
      console.log("Broadcast notification failed for mark all read ", e);
    }

    return NextResponse.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
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
