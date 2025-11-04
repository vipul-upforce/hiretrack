import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { broadcastNotificationCount } from "@/lib/broadcast/broadcastNotifications";
import mongoose from "mongoose";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
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
    const notificationId = id; // Use the resolved id
    const user = decryptedResponse.user;

    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    if (!Notification) {
      return NextResponse.json(
        { error: "Notification Model not found" },
        { status: 404 }
      );
    }

    // Find and update the notification
    // Only allow users to mark their own notifications as read
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        organizationId: user.organizationId,
        recipientId: user._id,
      },
      {
        isRead: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found or access denied" },
        { status: 404 }
      );
    }

    try {
      const unread = await Notification.countDocuments({
        organizationId: user.organizationId,
        recipientId: user._id,
        isRead: false,
      });
      broadcastNotificationCount(user.organizationId, user._id, unread);
    } catch (e) {
      console.log("Error while broadcasting notifactin count : ", e);
    }

    return NextResponse.json({
      message: "Notification marked as read",
      notification,
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
