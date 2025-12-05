import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";
import { broadcastNotificationCount } from "@/lib/broadcast/broadcastNotifications";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [user, { id }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      connectToDatabase(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const notificationId = id; // Use the resolved id

    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID" },
        { status: 400 }
      );
    }

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
        recipientId: user.id,
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
        recipientId: user.id,
        isRead: false,
      });
      broadcastNotificationCount(user.organizationId, user.id, unread);
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
