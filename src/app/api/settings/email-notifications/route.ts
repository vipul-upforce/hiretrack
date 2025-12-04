import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { User, Settings } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import mongoose from "mongoose";
import { EmailNotificationSettings } from "@/lib/models/user";
import { OrganizationEmailNotifications } from "@/lib/models/settings";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  VALID_NOTIFICATION_KEYS,
} from "@/lib/constants/notificationDefaults";

/**
 * GET /api/settings/email-notifications/[userId]
 * Get organization email notification settings (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get user from token
    const currentUser = await getAuthenticatedUser(request,["admin", "hr"]);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get organization settings
    const settings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(currentUser.organizationId),
    }).select("organizationEmailNotifications").lean();

    const orgNotifications = settings?.organizationEmailNotifications || {
      defaultSettings: DEFAULT_NOTIFICATION_SETTINGS,
      adminOverrides: {},
    };

    // Get all HR/Admin users for override management
    const users = await User.find({
      organizationId: new mongoose.Types.ObjectId(currentUser.organizationId),
      role: { $in: ["admin", "hr"] },
      isDeleted: { $ne: true },
    })
      .select("_id name email role emailNotificationSettings")
      .lean();

    // Convert adminOverrides Map to object for JSON response
    const adminOverridesObj: Record<string, any> = {};
    if (orgNotifications.adminOverrides) {
      if (orgNotifications.adminOverrides instanceof Map) {
        orgNotifications.adminOverrides.forEach((value, key) => {
          adminOverridesObj[key] = value;
        });
      } else {
        Object.assign(adminOverridesObj, orgNotifications.adminOverrides);
      }
    }

    return NextResponse.json({
      success: true,
      organizationSettings: orgNotifications,
      users: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasCustomSettings: !!user.emailNotificationSettings,
        currentOverride: adminOverridesObj[user._id.toString()] || null,
      })),
    });
  } catch (error) {
    console.error("Get email notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to get email notification settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/email-notifications
 * Update organization email notification settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const [currentUser, body] = await Promise.all([
      getAuthenticatedUser(request, "admin"),
      request.json(),
      connectToDatabase(),
    ]);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { defaultSettings, adminOverrides } = body;

    // Validate default settings
    if (defaultSettings) {
      for (const key of VALID_NOTIFICATION_KEYS) {
        if (
          defaultSettings[key] !== undefined &&
          typeof defaultSettings[key] !== "boolean"
        ) {
          return NextResponse.json(
            { error: `Invalid value for ${key}` },
            { status: 400 }
          );
        }
      }
    }

    // Validate admin overrides and verify users exist
    if (adminOverrides) {
      const userIds = Object.keys(adminOverrides);

      // Validate all user IDs first
      for (const userId of userIds) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return NextResponse.json(
            { error: `Invalid user ID: ${userId}` },
            { status: 400 }
          );
        }
      }

      // Verify all users exist and belong to the same organization
      if (userIds.length > 0) {
        const users = await User.find({
          _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
          organizationId: new mongoose.Types.ObjectId(
            currentUser.organizationId
          ),
          isDeleted: { $ne: true },
        })
          .select("_id")
          .lean();

        const foundUserIds = new Set(users.map((u) => u._id.toString()));
        const missingUserIds = userIds.filter((id) => !foundUserIds.has(id));

        if (missingUserIds.length > 0) {
          return NextResponse.json(
            {
              error: `Users not found or access denied: ${missingUserIds.join(", ")}`,
            },
            { status: 404 }
          );
        }
      }

      // Validate override settings structure and values
      for (const [userId, overrideSettings] of Object.entries(adminOverrides)) {
        if (overrideSettings && typeof overrideSettings === "object") {
          for (const key of VALID_NOTIFICATION_KEYS) {
            if (
              (overrideSettings as any)[key] !== undefined &&
              typeof (overrideSettings as any)[key] !== "boolean"
            ) {
              return NextResponse.json(
                {
                  error: `Invalid override value for ${key} in user ${userId}`,
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Get existing settings to merge admin overrides
    const existingSettings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(currentUser.organizationId),
    }).lean();

    // Update organization settings
    const updateData: any = {};
    if (defaultSettings) {
      updateData["organizationEmailNotifications.defaultSettings"] =
        defaultSettings;
    }

    if (adminOverrides !== undefined) {
      // Merge admin overrides with existing ones instead of replacing
      const existingAdminOverrides =
        existingSettings?.organizationEmailNotifications?.adminOverrides ||
        new Map();

      // Convert existing Map to object for easier manipulation
      const mergedOverrides: Record<string, any> = {};
      if (existingAdminOverrides instanceof Map) {
        existingAdminOverrides.forEach((value, key) => {
          mergedOverrides[key] = value;
        });
      } else if (
        existingAdminOverrides &&
        typeof existingAdminOverrides === "object"
      ) {
        Object.assign(mergedOverrides, existingAdminOverrides);
      }

      // Merge new admin overrides with existing ones
      if (adminOverrides && typeof adminOverrides === "object") {
        Object.entries(adminOverrides).forEach(([userId, settings]) => {
          if (settings && typeof settings === "object") {
            // If settings object is empty or all values are undefined, remove the override
            const hasAnyValue = Object.values(settings).some(
              (val) => val !== undefined
            );

            if (!hasAnyValue) {
              // Remove override for this user if all values are undefined
              delete mergedOverrides[userId];
            } else {
              // Merge with existing override for this user
              if (mergedOverrides[userId]) {
                mergedOverrides[userId] = {
                  ...mergedOverrides[userId],
                  ...settings,
                };
              } else {
                mergedOverrides[userId] = { ...settings };
              }
            }
          }
        });
      }

      // Convert merged overrides back to Map format for MongoDB
      const overrideMap = new Map();
      Object.entries(mergedOverrides).forEach(([userId, settings]) => {
        if (settings && typeof settings === "object") {
          overrideMap.set(userId, settings);
        }
      });

      // Use $set with the specific path to update only adminOverrides
      updateData["organizationEmailNotifications.adminOverrides"] = overrideMap;
    }

    const result = await Settings.findOneAndUpdate(
      {
        organizationId: new mongoose.Types.ObjectId(currentUser.organizationId),
      },
      { $set: updateData },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Email notification settings updated successfully",
      settings: result?.organizationEmailNotifications,
    });
  } catch (error) {
    console.error("Update email notification settings error:", error);
    return NextResponse.json(
      { error: "Failed to update email notification settings" },
      { status: 500 }
    );
  }
}
