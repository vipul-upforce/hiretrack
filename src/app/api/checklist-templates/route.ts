import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { ChecklistTemplate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

// GET - Get all checklist templates for the organization
export async function GET(req: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(req),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if model is initialized
    if (!ChecklistTemplate) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'incoming' | 'outgoing' | null;
    const isActive = searchParams.get('active') === 'true';

    // Build query
    const query: any = { organizationId: user.organizationId };
    if (type) query.type = type;
    if (isActive) query.isActive = true;

    const templates = await ChecklistTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Error fetching checklist templates.',
    );
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 },
    );
  }
}

// POST - Create a new checklist template
export async function POST(req: NextRequest) {
  try {
    const [decoded, body] = await Promise.all([
      getAuthenticatedUser(req, ['admin', 'hr']),
      req.json(),
      connectToDatabase(),
    ]);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if model is initialized
    if (!ChecklistTemplate) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }

    let { name, description, type, fields } = body;

    // Validate required fields
    if (!name || !type || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'Name, type, and fields are required' },
        { status: 400 },
      );
    }

    // Validate type
    if (!['incoming', 'outgoing'].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'incoming' or 'outgoing'" },
        { status: 400 },
      );
    }

    // Check for existing templates with the same name or name with suffix
    const baseName = name.trim();
    const regex = new RegExp(
      `^${baseName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(\\s\\(\\d+\\))?$`,
    );
    const existingTemplates = await ChecklistTemplate.find({
      organizationId: decoded.organizationId,
      name: { $regex: regex },
      isActive: true,
    });

    // If there are existing templates, find the next available suffix
    if (existingTemplates.length > 0) {
      const suffixes = existingTemplates
        .map((t) => {
          const match = t.name.match(/\((\d+)\)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter((num) => !isNaN(num));

      const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0;
      const nextSuffix = maxSuffix + 1;
      name = `${baseName} (${nextSuffix})`;
    }

    // Create template
    const template = new ChecklistTemplate({
      organizationId: decoded.organizationId,
      name,
      description,
      type,
      fields,
      createdBy: decoded.id,
      isActive: true,
    });

    await template.save();
    await template.populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error creating checklist template');
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 },
    );
  }
}
