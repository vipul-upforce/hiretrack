import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const unauthorizedInterviewerPages = [
  "/jobs-board",
  "/jobs",
  "/auth/signup",
  "/dashboard/settings",
  "/dashboard/search",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the user is authenticated
  const user = request.cookies.get("user"); // Check if user cookie exists
  const userData = user ? JSON.parse(user.value) : null; // Access the value property

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

  // Allow access to the Calder page for all authenticated users
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
  matcher: ["/dashboard/:path*", "/auth/signup"],
};
