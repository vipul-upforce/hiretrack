import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { User } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { getUserEffectiveNotificationSettings } from "@/lib/services/emailDecisionEngine";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/constants/notificationDefaults";

interface GlobalEmailNotificationSettings {
  newApplications: boolean;
  interviewAssignments: boolean;
  statusUpdates: boolean;
  newRemarks: boolean;
  stepCompleted: boolean;
  mentions: boolean;
  detailsUpdated: boolean;
  meetingScheduled: boolean;
  meetingUpdated: boolean;
  meetingCancelled: boolean;
  meetingInviteAccepted: boolean;
  meetingInviteDeclined: boolean;
  meetingInviteTentative: boolean;
  followupAdded: boolean;
  followupUpdated: boolean;
  followupRemoved: boolean;
  jobCreated: boolean;
  jobUpdated: boolean;
  userAdded: boolean;
  bulkImportCompleted: boolean;
  candidateRejected: boolean;
  interviewCompleted: boolean;
}

/**
 * GET /api/settings/email-notifications/global
 * Get global email notification settings for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const [currentUser] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's current global settings
    
    const userId =  currentUser.id;
    const organizationId = currentUser.organizationId;
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: "Invalid user data in token" },
        { status: 401 }
      );
    }

    const user = await User.findById(userId)
      .select("emailNotificationSettings.global")
      .lean();

    const globalSettings = user?.emailNotificationSettings?.global || DEFAULT_NOTIFICATION_SETTINGS;

    // Get effective settings (global level, no jobId)
    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId.toString(),
      organizationId.toString()
    );

    return NextResponse.json({
      success: true,
      globalSettings,
      effectiveSettings,
    });
  } catch (error) {
    console.error("Get global email notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to get global email notification settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/email-notifications/global
 * Update global email notification settings for the current user
 */
export async function PUT(request: NextRequest) {
  try {

    const [currentUser, body] = await Promise.all([
      getAuthenticatedUser(request),
      request.json(),
      connectToDatabase(),
    ]);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { settings }: { settings: GlobalEmailNotificationSettings } = body;

    // Validate settings
    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings object" },
        { status: 400 }
      );
    }

    const validKeys = [
      "newApplications",
      "interviewAssignments",
      "statusUpdates",
      "newRemarks",
      "stepCompleted",
      "mentions",
      "detailsUpdated",
      "meetingScheduled",
      "meetingUpdated",
      "meetingCancelled",
      "meetingInviteAccepted",
      "meetingInviteDeclined",
      "meetingInviteTentative",
      "followupAdded",
      "followupUpdated",
      "followupRemoved",
      "jobCreated",
      "jobUpdated",
      "userAdded",
      "bulkImportCompleted",
      "candidateRejected",
      "interviewCompleted",
    ];

    for (const key of validKeys) {
      if (settings[key] !== undefined && typeof settings[key] !== "boolean") {
        return NextResponse.json(
          { error: `Invalid value for ${key}` },
          { status: 400 }
        );
      }
    }

    // Update global settings
    const userId =  currentUser.id;
    const organizationId = currentUser.organizationId;

    const result = await User.findByIdAndUpdate(
      userId,
      { $set: { "emailNotificationSettings.global": settings } },
      { new: true, upsert: false }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    // Get updated effective settings
    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId.toString(),
      organizationId.toString()
    );

    return NextResponse.json({
      success: true,
      message: "Global email notification settings updated successfully",
      globalSettings: settings,
      effectiveSettings,
    });
  } catch (error) {
    console.error("Update global email notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to update global email notification settings" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/email-notifications/global
 * Reset global email notification settings to defaults
 */
export async function DELETE(request: NextRequest) {
  try {

    const [currentUser] = await Promise.all([
      getAuthenticatedUser(request),
       connectToDatabase()
      ,
    ]);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset global settings to defaults
    const userId = currentUser.id;
    const organizationId = currentUser.organizationId;

    await User.findByIdAndUpdate(userId, {
      $set: { "emailNotificationSettings.global": DEFAULT_NOTIFICATION_SETTINGS },
    });

    // Get updated effective settings
    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId.toString(),
      organizationId.toString()
    );

    return NextResponse.json({
      success: true,
      message: "Global email notification settings reset to defaults",
      globalSettings: DEFAULT_NOTIFICATION_SETTINGS,
      effectiveSettings,
    });
  } catch (error) {
    console.error("Reset global email notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to reset global email notification settings" },
      { status: 500 }
    );
  }
}
