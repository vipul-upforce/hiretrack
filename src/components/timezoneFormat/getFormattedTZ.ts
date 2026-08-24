import { formatInTimeZone } from 'date-fns-tz';
import { Settings } from '@/lib/mongodb';
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import logger from '@/lib/logger';

interface TimeZone {
  name: string;
  offset: string;
}

interface SettingsDoc {
  organizationId: string;
  timeZone: TimeZone;
}

/**
 * Formats a date using the organization's timezone settings.
 * Use this when you have organizationId but no NextRequest (e.g. bulk handlers, background jobs).
 * Same output format as getFormattedDate: "25 February 2025, 10:30 am" (en-IN, org timezone).
 */
export async function formatDateForOrganization(
  date: Date | string,
  organizationId: string,
  iso?: boolean,
): Promise<string | Date> {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    let timeZone = 'UTC';
    if (organizationId) {
      try {
        const settings: SettingsDoc[] | undefined = await Settings?.find(
          { organizationId },
          { timeZone: 1, organizationId: 1 },
        ).lean();

        if (settings && settings.length > 0) {
          const orgSettings = settings.find(
            (s) => s.organizationId === organizationId,
          );
          timeZone = orgSettings?.timeZone?.name || 'UTC';
        }
      } catch (settingsError) {
        logger.warn(
          `Failed to fetch timezone settings for orgId ${organizationId}, using UTC:`,
          settingsError,
        );
      }
    }

    if (iso) {
      const isoLikeString = formatInTimeZone(
        dateObj,
        timeZone,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
      );
      return new Date(isoLikeString);
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });

    return formatter.format(dateObj);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid date') {
      logger.error('Error formatting date - invalid date provided:', err);
      return 'Invalid Date';
    }

    logger.warn('Error in formatDateForOrganization, using UTC fallback:', err);

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (Number.isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      if (iso) {
        const isoLikeString = formatInTimeZone(
          dateObj,
          'UTC',
          "yyyy-MM-dd'T'HH:mm:ssXXX",
        );
        return new Date(isoLikeString);
      }

      const formatter = new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });

      return formatter.format(dateObj);
    } catch (fallbackError) {
      logger.error('Error in fallback date formatting:', fallbackError);
      return 'Invalid Date';
    }
  }
}

export async function getFormattedDate(
  req: NextRequest,
  date: Date | string,
  iso?: boolean,
  directOrganizationId?: string,
): Promise<string | Date> {
  try {
    // Convert date to Date object first - validate early
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    // Try to get authenticated user (optional for guest users)
    const user = await getAuthenticatedUser(req);

    // Determine organizationId: prioritize directOrganizationId, then authenticated user's orgId
    const orgId = directOrganizationId || user?.organizationId;

    let timeZone = 'UTC'; // Default fallback timezone

    // If organizationId is available, try to fetch timezone settings
    if (orgId) {
      try {
        const settings: SettingsDoc[] | undefined = await Settings?.find(
          {
            organizationId: orgId,
          },
          { timeZone: 1, organizationId: 1 },
        ).lean();

        if (settings && settings.length > 0) {
          const orgSettings = settings.find((s) => s.organizationId === orgId);
          timeZone = orgSettings?.timeZone?.name || 'UTC';
        }
      } catch (settingsError) {
        // Log but don't fail - use UTC fallback
        logger.warn(
          `Failed to fetch timezone settings for orgId ${orgId}, using UTC:`,
          settingsError,
        );
      }
    }

    // Format date using the determined timezone
    if (iso) {
      const isoLikeString = formatInTimeZone(
        dateObj,
        timeZone,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
      );
      return new Date(isoLikeString);
    }

    // Format date using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });

    const dateTime = formatter.format(dateObj);
    return dateTime;
  } catch (err) {
    // Only return 'Invalid Date' if the date itself is invalid
    // For other errors (auth, settings), still format with UTC fallback
    if (err instanceof Error && err.message === 'Invalid date') {
      logger.error('Error formatting date - invalid date provided:', err);
      return 'Invalid Date';
    }

    // For other errors, log but still format with UTC
    logger.warn('Error in getFormattedDate, using UTC fallback:', err);

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (Number.isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      if (iso) {
        const isoLikeString = formatInTimeZone(
          dateObj,
          'UTC',
          "yyyy-MM-dd'T'HH:mm:ssXXX",
        );
        return new Date(isoLikeString);
      }

      const formatter = new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });

      return formatter.format(dateObj);
    } catch (fallbackError) {
      logger.error('Error in fallback date formatting:', fallbackError);
      return 'Invalid Date';
    }
  }
}
