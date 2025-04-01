import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const unauthorizedInterviewerPages = [
  "/jobs-board",
  "/jobs",
  "/auth/signup",
  "/dashboard/settings",
  "/dashboard/search",
];

export async function middleware(request: NextRequest) {
  const { pathname } = await request.nextUrl;

  // Check if the user is authenticated
  const user = await request.cookies.get("user")?.value; // Check if user cookie exists
  // console.log("REQ COOKIE: ", user);

  const userData = user ? JSON.parse(user) : null; // Access the value property

  // Handle API routes authentication
  if (
    pathname.startsWith("/api") &&
    pathname !== "/api/auth/login" &&
    pathname !== "/api/auth/signup" &&
    pathname !== "/api/organization" &&
    pathname !== "/api/event-mail"
  ) {
    if (!user) {
      console.warn("User cookie is undefined. Authentication required.");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/jobs") ||
      pathname.startsWith("/auth/signup")
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
        return NextResponse.redirect(new URL("/dashboard", request.url)); // Redirect to an unauthorized page
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
  }

  return NextResponse.next();
}

// Specify the paths to apply the middleware
export const config = {
  matcher: ["/dashboard/:path*", "/auth/signup", "/api/:path*"],
};
