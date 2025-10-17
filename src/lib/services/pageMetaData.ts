"use server";

// This function is used by Next.js for initial server-side metadata generation
// Client-side updates are handled in client-layout.tsx
export const pageMetaData = async () => {
  try {
    const url = process.env.BASE_URL || "http://localhost:3000";
    const res = await fetch(`${url}/api/organization`);

    if (!res.ok) throw new Error("Failed to fetch organization data");

    const data = await res.json();
    data.data.forEach((org: any) => {
      console.log("org", org.portalConfigs.portalName);
    });
    // Get the organization data - this will be cached by Next.js
    // We'll use client-side updates to ensure metadata is fresh when switching orgs
    const org = Array.isArray(data) ? data[0] : data?.data?.[0];

    const title = org?.portalConfigs?.portalName || "HireTrack";

    const faviconUrl = org?.portalConfigs?.portalFavicon?.url || "/favicon.png";
    return {
      title,
      icons: {
        icon: faviconUrl,
      },
    };
  } catch (error) {
    // console.log("Error fetching metadata:", error);

    return {
      title: "HireTrack",
      icons: {
        icon: "/favicon.png",
      },
    };
  }
};
