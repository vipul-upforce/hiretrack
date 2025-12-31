import connectToDatabase, { Organization, Settings } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import logger from './logger';

function getDefaultMetadata() {
  return {
    portalName: 'HireTrack',
    portalLogo: null,
    portalFavicon: null,
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  };
}

/**
 * Fetches portal branding information for metadata generation
 * Uses the same robust approach as the /api/settings/portal endpoint
 */
export async function getPortalMetadata() {
  try {
    await connectToDatabase();
    const cookieStore = await cookies();
    const orgId = cookieStore.get('org_id')?.value;
    // Wait for models to initialize (same approach as portal API)
    let retries = 0;
    while ((!Settings || !Organization) && retries < 10) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
      retries += 1;
    }

    if (!Settings || !Organization) {
      return getDefaultMetadata();
    }

    let defaultOrg = null;
    let settings = null;
    if (orgId) {
      console.log("orgId found", orgId);
      settings = await Settings.findOne(
        { organizationId: orgId },
        {
          portalConfigs: 1,
        },
      ).lean();
    } else {
      console.log("orgId not found, getting default organization");
      defaultOrg = await Organization.findOne({}).sort({ createdAt: 1 }).select('_id name').lean();
      if (defaultOrg) {
        settings = await Settings.findOne(
          { organizationId: defaultOrg._id.toString() },
          {
            portalConfigs: 1,
          },
        ).lean();
      }
    }


    if (!settings) {
      return {
        portalName: defaultOrg?.name || 'HireTrack',
        portalLogo: null,
        portalFavicon: null,
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
      };
    }

    return {
      portalName:
        settings.portalConfigs?.portalName || defaultOrg?.name || 'HireTrack',
      portalLogo: settings.portalConfigs?.portalLogo || null,
      portalFavicon: settings.portalConfigs?.portalFavicon || null,
      primaryColor: settings.portalConfigs?.primaryColor || '#6366f1',
      secondaryColor: settings.portalConfigs?.secondaryColor || '#8b5cf6',
    };
  } catch (error) {
    logger.error('Failed to fetch portal metadata:', error);
    return getDefaultMetadata();
  }
}
