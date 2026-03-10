import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization, Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { encryptProviderKeys } from '@/lib/encryption';
import type { CaptchaConfig } from '@/lib/encryption';
import {
  MAX_LENGTHS,
  validateQueryParams,
  VALIDATION_PATTERNS,
} from '@/lib/inputValidation';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

const handleGetCaptcha = async (req: NextRequest) => {
  try {
    const validation = validateQueryParams(req.nextUrl.searchParams, {
      org: {
        type: 'string',
        maxLength: MAX_LENGTHS.shortText,
        pattern: VALIDATION_PATTERNS.safeString,
      },
      subdomain: {
        type: 'string',
        maxLength: MAX_LENGTHS.shortText,
        pattern: VALIDATION_PATTERNS.slug,
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.errors },
        { status: 400 },
      );
    }
    await connectToDatabase();

    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while ((!Settings || !Organization) && retries < 5) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
      retries += 1;
    }

    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }

    let organizationId = '';

    // Try to get organization from auth token
    try {
      const userData = await getAuthenticatedUser(req);
      if (userData) {
        organizationId = userData.organizationId || '';
      }
    } catch {
      logger.warn('Failed to authenticate user from request');
    }
    let settings = null;

    if (organizationId) {
      // Authenticated user - get specific organization settings
      settings = await Settings.findOne({ organizationId }, { captcha: 1 })
        .lean()
        .exec();
    } else {
      // Fallback to default organization
      const defaultOrg = await Organization.findOne({}).sort({
        createdAt: 1,
      });
      if (defaultOrg) {
        settings = await Settings.findOne(
          { organizationId: defaultOrg._id.toString() },
          { captcha: 1 },
        )
          .lean()
          .exec();
      }
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'CAPTCHA settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ captcha: settings.captcha });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};

export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleGetCaptcha);
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const [user, body] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = user.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID missing' },
        { status: 400 },
      );
    }

    const { enableCaptcha, captchaType, captchaVariant, siteKey, secretKey } =
      body;

    if (enableCaptcha && (!siteKey || !secretKey)) {
      return NextResponse.json(
        {
          error:
            'Both site key and secret key are required when enabling CAPTCHA',
        },
        { status: 400 },
      );
    }

    // Validate captchaType
    if (enableCaptcha && captchaType && !['v2', 'v3'].includes(captchaType)) {
      return NextResponse.json(
        {
          error: 'Invalid captcha type. Must be v2 or v3',
        },
        { status: 400 },
      );
    }

    // Validate captchaVariant for v2
    if (
      enableCaptcha &&
      captchaType === 'v2' &&
      captchaVariant &&
      !['checkbox', 'invisible'].includes(captchaVariant)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid captcha variant. Must be checkbox or invisible',
        },
        { status: 400 },
      );
    }

    // Encrypt before saving
    const captchaPayload: CaptchaConfig = {
      enableCaptcha: enableCaptcha || false,
      captchaType: captchaType || 'v2',
      captchaVariant: captchaVariant || 'checkbox',
      siteKey: siteKey || '',
      secretKey: secretKey || '',
    };

    const encryptedProviders = encryptProviderKeys(
      {
        captcha: captchaPayload,
      },
      orgId,
    );

    if (!encryptedProviders || !encryptedProviders.captcha) {
      return NextResponse.json(
        { error: 'Failed to encrypt CAPTCHA settings' },
        { status: 500 },
      );
    }

    const encryptedCaptcha = encryptedProviders.captcha;

    const updatedSettings = await Settings?.findOneAndUpdate(
      { organizationId: orgId },
      { captcha: encryptedCaptcha },
      { new: true, runValidators: true, upsert: true },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'CAPTCHA settings updated successfully',
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'CAPTCHA API error');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
