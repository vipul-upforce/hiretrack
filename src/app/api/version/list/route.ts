import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const licenseValidationUrl = process.env.LICENSE_VALIDATION_URL;

    if (!licenseValidationUrl) {
      return NextResponse.json(
        { error: "LICENSE_VALIDATION_URL not configured" },
        { status: 500 }
      );
    }

    // Construct the URL for the version list endpoint
    const versionListUrl = `${licenseValidationUrl}/api/version/list`;

    // Fetch version list from the license validation server
    const response = await fetch(versionListUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch version list: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: "Failed to fetch version list from server" },
        { status: response.status }
      );
    }

    const versionData = await response.json();

    return NextResponse.json(versionData);
  } catch (error: any) {
    console.error("Error fetching version list:", error);

    // Handle timeout errors
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timeout - server may be unavailable" },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error while fetching version list" },
      { status: 500 }
    );
  }
}
