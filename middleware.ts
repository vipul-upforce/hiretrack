import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import CryptoJS from "crypto-js";
import { jwtVerify } from "jose";
// import { log } from "@/lib/logger";

interface JWTPayload {
  user: string;
}

export async function verifyAndDecryptToken(token: string) {
  const JWT_SECRET =
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    "your_jwt_secret_key";
  // console.log(JWT_SECRET, "JWT_SECRET-10");

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

//creates login redirect URL
function createLoginRedirectUrl(request: NextRequest, targetPath: string) {
  const loginUrl = new URL("/auth/login", request.url);
  if (targetPath !== "/auth/login") {
    loginUrl.searchParams.set("redirect", targetPath);
  }
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  // log(`${request.method} ${request.url}`);
  const { pathname } = request.nextUrl;
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || "https://hire.upforce.tech"
  ).split(",");
  const origin = request.nextUrl.hostname;

  if (!allowedOrigins.includes(origin))
    return NextResponse.json({ error: "Origin Not Allowed" }, { status: 401 });
  let userData: { role: string } | undefined;

  // SECURITY FIX: Check both httpOnly and regular tokens for backward compatibility
  const httpOnlyToken = request.cookies.get("auth_token");
  // const regularToken = request.cookies.get("token");
  const token = httpOnlyToken?.value;

  if (token) {
    const decryptedResponse = await verifyAndDecryptToken(String(token));
    if (decryptedResponse.success) {
      userData = decryptedResponse.user as unknown as {
        role: string;
      };
    }
  }

  // Handle API routes authentication
  const isFileApiWithAllowedFile =
    pathname.startsWith("/api/files") &&
    (request.nextUrl.searchParams.get("pathName")?.endsWith("header.html") ||
      request.nextUrl.searchParams.get("pathName")?.endsWith("footer.html") ||
      request.nextUrl.searchParams.get("pathName")?.endsWith("favicon.png"));

  if (
    pathname.startsWith("/api") &&
    !apiExemptPaths.some(
      (path) => pathname === path || pathname?.includes(path)
    ) &&
    !isFileApiWithAllowedFile
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
      return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
    }
  }

  if (pathname?.includes("/backups") && !userData) {
    return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
  }

  if (pathname?.includes("/calendar")) {
    return NextResponse.next();
  }

  if (userData) {
    const userRole = userData.role;

    if (userRole === "admin") {
      return NextResponse.next();
    }

    if (userRole === "hr") {
      if (
        pathname?.includes("/auth/signup") ||
        pathname?.includes("/dashboard/settings")
        // pathname?.includes("/dashboard/analytics")
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Candidate role - redirect to apply-jobs if trying to access dashboard
    if (userRole === "candidate") {
      if (
        // pathname?.includes("/dashboard") ||
        // pathname?.includes("/api/candidates/assignments") ||
        // pathname?.includes("/dashboard/:path*")

        unauthorizedCandidateAPIRoutes.some((path) => pathname?.includes(path))
      ) {
        const redirectUrl = isOrgPath
          ? new URL(`/${pathParts[0]}/apply-jobs`, request.url)
          : new URL("/apply-jobs", request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Interviewer role restrictions
    if (userRole === "interviewer") {
      if (
        unauthorizedInterviewerPages.some((path) => pathname?.includes(path))
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (
        unauthorizedInterviewerAPIRoutes.some((path) =>
          pathname?.includes(path)
        )
      ) {
        return new NextResponse("Permission denied", { status: 403 });
      }
    }

    // Restrict access to apply-jobs for non-candidate roles
    if (userRole !== "candidate" && pathname?.includes("/apply-jobs")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin-only access to backups
    if (userRole !== "admin" && pathname?.includes("/backups")) {
      return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
    }
  }

  return NextResponse.next();
  // const res = NextResponse.next();

  // res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,");
  // res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  // res.headers.set("Access-Control-Allow-Credentials", "true");

  // // Handle preflight request
  // if (req.method === "OPTIONS") {
  //   return new Response(null, {
  //     headers: res.headers,
  //     status: 204,
  //   });
  // }

  // return res;
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
  "/dashboard/analytics",
  "/api/organization/tags",
];

const unauthorizedInterviewerAPIRoutes = ["/api/candidates/filter"];
const unauthorizedCandidateAPIRoutes = [
  "/api/candidates/assignments",
  "/dashboard",
  "/api/candidates/assignments",
  "/dashboard/:path*",
  "/api/nginx-logs",
  "/api/download/assets",
];
const apiExemptPaths = [
  "/api/jobs/open-jobs",
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/signup",
  "/api/organization",
  "/api/orgs",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/event-mail",
  "/api/candidates/signup",
  "/api/candidates/evaluate",
  "/api/candidates/event-mail",
  "/api/files",
  "/api/file-proxy",
  "/api/file",
  "/api/candidates/guest-apply",
  "/api/candidates/apply-application",
  "/apply-jobs",
  "/api/organization/cs/",
  "/api/auth/2fa/send-otp",
  "/api/auth/2fa/verify-otp",
  "/api/settings/twofa",
  "/api/settings/portal",
  "/api/shared-files",
  "/api/organization/tags",
  "/api/auth/google/callback",
  "/api/auth/google/authorize",
  "/api/settings/captcha",
  "/api/license-validate",
];

const redirectPaths = [
  "/dashboard",
  "/jobs",
  "/auth/signup",
  "/:orgName/apply-jobs",
];
