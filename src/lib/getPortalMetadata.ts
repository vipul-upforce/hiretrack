import connectToDatabase, { Organization, Settings } from "@/lib/mongodb";

/**
 * Fetches portal branding information for metadata generation
 * Uses the same robust approach as the /api/settings/portal endpoint
 */
export async function getPortalMetadata() {
  try {
    await connectToDatabase();

    // Wait for models to initialize (same approach as portal API)
    let retries = 0;
    while ((!Settings || !Organization) && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!Settings || !Organization) {
      console.warn("Database models not initialized for metadata generation, using defaults");
      return getDefaultMetadata();
    }

    // Get the first/default organization (for anonymous/public access)
    const defaultOrg = await Organization.findOne({}).sort({ createdAt: 1 }).lean();

    if (!defaultOrg) {
      return getDefaultMetadata();
    }

    const settings = await Settings.findOne(
      { organizationId: defaultOrg._id.toString() },
      {
        portalConfigs: 1,
      }
    ).lean();

    if (!settings) {
      return {
        portalName: defaultOrg.name || "HireTrack",
        portalLogo: null,
        portalFavicon: null,
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
      };
    }

    return {
      portalName: settings.portalConfigs?.portalName || defaultOrg.name || "HireTrack",
      portalLogo: settings.portalConfigs?.portalLogo || null,
      portalFavicon: settings.portalConfigs?.portalFavicon || null,
      primaryColor: settings.portalConfigs?.primaryColor || "#6366f1",
      secondaryColor: settings.portalConfigs?.secondaryColor || "#8b5cf6",
    };
  } catch (error) {
    console.error("Failed to fetch portal metadata:", error);
    return getDefaultMetadata();
  }
}

function getDefaultMetadata() {
  return {
    portalName: "HireTrack",
    portalLogo: null,
    portalFavicon: null,
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
  };
}
