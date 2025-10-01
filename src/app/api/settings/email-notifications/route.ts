import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { User, Settings } from '@/lib/mongodb';
import { verifyAndDecryptToken } from '@/app/actions/auth';
import mongoose from 'mongoose';
import { EmailNotificationSettings } from '@/lib/models/user';
import { OrganizationEmailNotifications } from '@/lib/models/settings';

/**
 * GET /api/settings/email-notifications
 * Get organization email notification settings (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get user from token
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const authResult = await verifyAndDecryptToken(token);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const currentUser = authResult.user;

    // Only admins can view organization settings
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get organization settings
    const settings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(currentUser.organizationId)
    }).lean();

    const orgNotifications = settings?.organizationEmailNotifications || {
      defaultSettings: {
        newApplications: true,
        interviewAssignments: true,
        statusUpdates: true,
        newRemarks: true,
        stepCompleted: true,
        mentions: true,
      },
      adminOverrides: {}
    };

    // Get all HR/Admin users for override management
    const users = await User.find({
      organizationId: new mongoose.Types.ObjectId(currentUser.organizationId),
      role: { $in: ['admin', 'hr'] },
      isDeleted: { $ne: true }
    })
      .select('_id name email role emailNotificationSettings')
      .lean();

    return NextResponse.json({
      success: true,
      organizationSettings: orgNotifications,
      users: users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasCustomSettings: !!user.emailNotificationSettings,
        currentOverride: orgNotifications.adminOverrides[user._id.toString()] || null
      }))
    });

  } catch (error) {
    console.error('Get email notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get email notification settings' },
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
    await dbConnect();

    // Get user from token
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const authResult = await verifyAndDecryptToken(token);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const currentUser = authResult.user;

    // Only admins can update organization settings
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { defaultSettings, adminOverrides } = body;

    // Validate default settings
    if (defaultSettings) {
      const validKeys = ['newApplications', 'interviewAssignments', 'statusUpdates', 'newRemarks', 'stepCompleted', 'mentions'];
      for (const key of validKeys) {
        if (defaultSettings[key] !== undefined && typeof defaultSettings[key] !== 'boolean') {
          return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
        }
      }
    }

    // Validate admin overrides
    if (adminOverrides) {
      for (const [userId, overrideSettings] of Object.entries(adminOverrides)) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return NextResponse.json({ error: `Invalid user ID: ${userId}` }, { status: 400 });
        }

        if (overrideSettings && typeof overrideSettings === 'object') {
          const validKeys = ['newApplications', 'interviewAssignments', 'statusUpdates', 'newRemarks', 'stepCompleted', 'mentions'];
          for (const key of validKeys) {
            if ((overrideSettings as any)[key] !== undefined && typeof (overrideSettings as any)[key] !== 'boolean') {
              return NextResponse.json({ error: `Invalid override value for ${key} in user ${userId}` }, { status: 400 });
            }
          }
        }
      }
    }

    // Update organization settings
    const updateData: any = {};
    if (defaultSettings) {
      updateData['organizationEmailNotifications.defaultSettings'] = defaultSettings;
    }

    if (adminOverrides !== undefined) {
      // Convert adminOverrides to Map format for MongoDB
      const overrideMap = new Map();
      if (adminOverrides && typeof adminOverrides === 'object') {
        Object.entries(adminOverrides).forEach(([userId, settings]) => {
          if (settings) {
            overrideMap.set(userId, settings);
          }
        });
      }
      updateData['organizationEmailNotifications.adminOverrides'] = overrideMap;
    }

    const result = await Settings.findOneAndUpdate(
      { organizationId: new mongoose.Types.ObjectId(currentUser.organizationId) },
      { $set: updateData },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Email notification settings updated successfully',
      settings: result?.organizationEmailNotifications
    });

  } catch (error) {
    console.error('Update email notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update email notification settings' },
      { status: 500 }
    );
  }
}