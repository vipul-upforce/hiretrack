import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const unauthorizedInterviewerPages = [
  "/jobs-board",
  "/jobs",
  "/auth/signup",
  "/dashboard/settings",
  "/dashboard/search",
];

const apiExemptPaths = [
  "/api/jobs/open-jobs",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/organization",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/event-mail",
  "/api/candidates/signup",
  "/api/files",
  "/apply-jobs",
];

const redirectPaths = [
  "/dashboard",
  "/jobs",
  "/auth/signup",
  "/:orgName/apply-jobs",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the user is authenticated
  const user = await request.cookies.get("user")?.value;
  const userData = user ? JSON.parse(user) : null;

  // Handle API routes authentication
  if (
    pathname.startsWith("/api") &&
    !apiExemptPaths.some((path) => pathname === path || pathname.includes(path))
  ) {
    if (!user) {
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
      // if (!user) {
      //   const orgName = pathParts[0];
      //   return NextResponse.redirect(
      //     new URL(`/${orgName}/signup`, request.url)
      //   );
      // }
    }
  } else {
    if (
      !user &&
      redirectPaths.some((path) => {
        if (path.includes(":orgName")) return false;
        return pathname.startsWith(path);
      })
    ) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Allow access to the Calendar page for all authenticated users
  if (pathname.includes("/calendar")) {
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
        pathname.includes("/auth/signup") ||
        pathname.includes("/dashboard/settings")
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    // Redirect candidate role to apply-jobs route
    if (userRole === "candidate") {
      if (
        pathname.includes("/dashboard") ||
        pathname.includes("/dashboard/:path*")
      ) {
        return NextResponse.redirect(
          new URL(`/${pathParts[0]}/apply-jobs`, request.url)
        );
      }
    }
    // Restrict access for interviewer role
    if (userRole === "interviewer") {
      if (
        unauthorizedInterviewerPages.some((path) => pathname.includes(path))
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url)); // Redirect to an unauthorized page
      }
    }

    // Restrict access for candidate role
    if (userRole !== "candidate" && pathname.includes("/apply-jobs")) {
      return NextResponse.redirect(new URL("/dashboard", request.url)); // Redirect to an unauthorized page
    }
  }

  return NextResponse.next();
}
// Specify the paths to apply the middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/signup",
    "/api/:path*",
    "/:orgName/:path*",
  ],
};
