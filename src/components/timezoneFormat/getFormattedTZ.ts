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

export async function getFormattedDate(
  req: NextRequest,
  date: Date | string,
  iso?: boolean,
  directOrganizationId?: string,
): Promise<string | Date> {
  try {
    // Get user data from auth (server-side, using cookies)
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new Error('User not authenticated');
    }
    const { organizationId } = user;
    const orgId = directOrganizationId || organizationId;

    // Fetch settings from MongoDB
    const settings: SettingsDoc[] | undefined = await Settings?.find(
      {
        organizationId: orgId,
      },
      { timeZone: 1, organizationId: 1 },
    ).lean();

    if (!settings || settings.length === 0) {
      throw new Error('Settings not found');
    }

    const orgSettings = settings.find((s) => s.organizationId === orgId);
    const timeZone = orgSettings?.timeZone?.name || 'UTC';

    // Convert date to Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

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
    logger.error('Error formatting date:', err);
    return 'Invalid Date';
  }
}
