"use server";

export const pageMetaData = async () => {
  try {
    const url = process.env.BASE_URL || "http://localhost:3000";
    const res = await fetch(`${url}/api/organization`);

    if (!res.ok) throw new Error("Failed to fetch organization data");

    const data = await res.json();
    const org = Array.isArray(data) ? data[0] : data?.data?.[0];

    const title = org?.portalConfigs?.portalName ||"HireTrack"  ;
    
    return {
      title,
    };
  } catch (error) {
    // console.error("Error fetching metadata:", error);

    return {
      title: "HireTrack",
    };
  }
};