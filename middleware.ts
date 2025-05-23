import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import CryptoJS from "crypto-js";
import { jwtVerify } from "jose";

interface JWTPayload {
  user: string;
}

export async function verifyAndDecryptToken(token: string) {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      secretKey
    );

    if (!payload || typeof payload !== "object" || !payload.user) {
      throw new Error("Invalid token structure");
    }
    const bytes = CryptoJS.AES.decrypt(payload.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    return { success: true, user: decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Error Occurred",
    };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let userData: { role: string } | undefined;
  const token = request.cookies.get("token");
  if (token?.value) {
    const decryptedResponse = await verifyAndDecryptToken(String(token?.value));
    if (decryptedResponse.success) {
      userData = decryptedResponse.user as unknown as {
        role: string;
      };
    }
  }

  // Handle API routes authentication
  if (
    pathname.startsWith("/api") &&
    !apiExemptPaths.some(
      (path) => pathname === path || pathname?.includes(path)
    )
  ) {
    if (!userData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // Extract organization name from the path if it exists
  const pathParts = pathname.split("/").filter(Boolean);
  const isOrgPath =
    pathParts.length > 1 &&
    !["dashboard", "auth", "api", "jobs", "calendar"].includes(pathParts[0]);

  if (isOrgPath) {
    const subPath = `/${pathParts[1]}`;
    if (subPath === "/apply-jobs") {
    }
  } else {
    if (
      !userData &&
      redirectPaths.some((path) => {
        if (path.includes(":orgName")) return false;
        return pathname.startsWith(path);
      })
    ) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Allow access to the Calendar page for all authenticated users
  if (pathname?.includes("/calendar")) {
    return NextResponse.next();
  }

  // Role-based access control
  if (userData) {
    const userRole = userData.role;
    // Allow all pages for admin and hr roles
    if (userRole === "admin") {
      return NextResponse.next();
    }
    if (userRole === "hr") {
      if (
        pathname?.includes("/auth/signup") ||
        pathname?.includes("/dashboard/settings")
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    // Redirect candidate role to apply-jobs route
    if (userRole === "candidate") {
      if (
        pathname?.includes("/dashboard") ||
        pathname?.includes("/dashboard/:path*")
      ) {
        return NextResponse.redirect(
          new URL(`/${pathParts[0]}/apply-jobs`, request.url)
        );
      }
    }
    // Restrict access for interviewer role
    if (userRole === "interviewer") {
      if (
        unauthorizedInterviewerPages.some((path) => pathname?.includes(path))
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url)); // Redirect to an unauthorized page
      }
      if (
        unauthorizedInterviewerAPIRoutes.some((path) =>
          pathname?.includes(path)
        )
      ) {
        return new NextResponse("Permission denied", { status: 403 });
      }
    }

    // Restrict access for candidate role
    if (userRole !== "candidate" && pathname?.includes("/apply-jobs")) {
      return NextResponse.redirect(new URL("/dashboard", request.url)); // Redirect to an unauthorized page
    }
    if (userRole !== "admin" && pathname?.includes("/backups")) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  if (pathname?.includes("/backups") && !userData) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/signup",
    "/api/:path*",
    "/:orgName/:path*",
    "/backups",
    "/take-snapshot",
  ],
};

const unauthorizedInterviewerPages = [
  "/jobs-board",
  "/jobs",
  "/auth/signup",
  "/dashboard/settings",
  "/dashboard/search",
  "/dashboard/cv-upload",
];

const unauthorizedInterviewerAPIRoutes = ["/api/candidates/filter"];

const apiExemptPaths = [
  "/api/jobs/open-jobs",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/organization",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/event-mail",
  "/api/candidates/signup",
  "/api/candidates/evaluate",
  "/api/candidates/event-mail",
  // "/api/files",
  "/api/candidates/guest-apply",
  "/api/candidates/apply-application",
  "/apply-jobs",
  "/api/organization/cs/",
];

const redirectPaths = [
  "/dashboard",
  "/jobs",
  "/auth/signup",
  "/:orgName/apply-jobs",
];
