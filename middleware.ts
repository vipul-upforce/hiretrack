// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import CryptoJS from "crypto-js";
// import { jwtVerify } from "jose";
// import { generateOrgJwtSecret } from "@/lib/jwtSecretGenerator";
// // import { log } from "@/lib/logger";

// interface JWTPayload {
//   refresh?: string;
//   iat?: number;
//   exp?: number;
// }

// type RouteMatcher = (pathname: string) => boolean;

// const publicPageMatchers: RouteMatcher[] = [
//   (pathname) => pathname.startsWith("/auth/login"),
//   (pathname) => pathname.startsWith("/auth/signup"),
//   (pathname) => pathname.startsWith("/apply-jobs"),

//   (pathname) => /^\/[^/]+\/apply-jobs(\/.*)?$/.test(pathname),
// ];

// const publicApiMatchers: RouteMatcher[] = [
//   (pathname) => pathname.startsWith("/api/auth/login"),
//   (pathname) => pathname.startsWith("/api/auth/signup"),
//   (pathname) => pathname.startsWith("/api/auth/forgot-password"),
//   (pathname) => pathname.startsWith("/api/auth/reset-password"),
//   (pathname) => pathname.startsWith("/api/candidates/guest-apply"),
//   (pathname) => pathname.startsWith("/api/candidates/apply-application"),
//   (pathname) => pathname.startsWith("/api/jobs/open-jobs"),
//   (pathname) => pathname.startsWith("/api/auth/me"),
//   (pathname) => pathname.startsWith("/api/organization"),
//   (pathname) => pathname.startsWith("/api/orgs"),
//   (pathname) => pathname.startsWith("/api/license-validate"),
//   (pathname) => pathname.startsWith("/api/settings/twofa"),
//   (pathname) => pathname.startsWith("/api/settings/captcha"),
//   (pathname) => pathname.startsWith("/api/settings/portal"),
// ];

// const privatePageMatchers: RouteMatcher[] = [
//   (pathname) => pathname.startsWith("/dashboard"),
//   (pathname) => pathname.startsWith("/jobs"),
//   (pathname) => pathname.startsWith("/backups"),
//   (pathname) => pathname.startsWith("/take-snapshot"),
//   (pathname) =>
//     /^\/[^/]+\/(?!apply-jobs(\/.*)?)(.*)$/.test(pathname) &&
//     !pathname.startsWith("/api"),
// ];

// const privateApiMatchers: RouteMatcher[] = [
//   (pathname) => pathname.startsWith("/api"),
// ];

// function isPublicPageRoute(pathname: string) {
//   return publicPageMatchers.some((matcher) => matcher(pathname));
// }

// function isPublicApiRoute(pathname: string) {
//   if (!pathname.startsWith("/api")) return false;
//   return (
//     publicApiMatchers.some((matcher) => matcher(pathname)) ||
//     apiExemptPaths.some((path) => {
//       if (pathname === path) return true;
//       const normalizedPath = path.endsWith("/") ? path : `${path}/`;
//       return pathname.startsWith(normalizedPath);
//     })
//   );
// }

// function isPrivatePageRoute(pathname: string) {
//   return privatePageMatchers.some((matcher) => matcher(pathname));
// }

// function isPrivateApiRoute(pathname: string) {
//   if (!pathname.startsWith("/api")) return false;
//   if (isPublicApiRoute(pathname)) return false;
//   return privateApiMatchers.some((matcher) => matcher(pathname));
// }

// export async function verifyAndDecryptTokenMiddleware(token: string, orgId: string) {

//   if (!orgId) {
//     return {
//       success: false,
//       error: "Organization ID is missing from cookies",
//     };
//   }

//   const JWT_SECRET = generateOrgJwtSecret(orgId);
//   // console.log(JWT_SECRET, "JWT_SECRET-10");

//   try {
//     if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
//     const secretKey = new TextEncoder().encode(JWT_SECRET);
//     const { payload }: { payload: JWTPayload } = await jwtVerify(
//       token,
//       secretKey
//     );

//     if (!payload || typeof payload !== "object" || !payload.refresh) {
//       throw new Error("Invalid token structure");
//     }
//     const bytes = CryptoJS.AES.decrypt(payload.refresh as string, JWT_SECRET);
//     const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

//     return { success: true, user: decryptedData };
//   } catch (err) {
//     return {
//       success: false,
//       error: err instanceof Error ? err.message : "Unknown Error Occurred",
//     };
//   }
// }

// //creates login redirect URL
// function createLoginRedirectUrl(request: NextRequest, targetPath: string) {
//   const loginUrl = new URL("/auth/login", request.url);
//   if (targetPath !== "/auth/login") {
//     loginUrl.searchParams.set("redirect", targetPath);
//   }
//   return loginUrl;
// }

// export async function middleware(request: NextRequest) {
//   // log(`${request.method} ${request.url}`);
//   const { pathname } = request.nextUrl;
//   const allowedOrigins = (
//     process.env.ALLOWED_ORIGINS || "https://hire.upforce.tech"
//   ).split(",");
//   const origin = request.nextUrl.hostname;

//   if (!allowedOrigins.includes(origin))
//     return NextResponse.json({ error: "Origin Not Allowed" }, { status: 401 });
//   let userData: { role: string } | undefined;

//   // SECURITY FIX: Check both httpOnly and regular tokens for backward compatibility
//   const httpOnlyToken = request.cookies.get("refresh_token");
//   const authToken = request.cookies.get("auth_token")?.value;
//   // const regularToken = request.cookies.get("token");

//   const token = httpOnlyToken?.value;
//   const orgId = request.cookies.get("org_id")?.value;
// //   // 🚫 Skip Next.js internal assets
// // if (
// //   pathname.startsWith("/_next") ||
// //   pathname.startsWith("/static") ||
// //   pathname.endsWith(".js") ||
// //   pathname.endsWith(".css") ||
// //   pathname.endsWith(".png") ||
// //   pathname.endsWith(".jpg") ||
// //   pathname.endsWith(".svg") ||
// //   pathname.endsWith(".ico") ||
// //   pathname.includes("favicon")
// // ) {
// //   return NextResponse.next();
// // }

//   const isNextInternalAsset =
//     pathname.startsWith("/_next") ||
//     pathname.startsWith("/static") ||
//     pathname.endsWith(".js") ||
//     pathname.endsWith(".css") ||
//     pathname.endsWith(".png") ||
//     pathname.endsWith(".jpg") ||
//     pathname.endsWith(".svg") ||
//     pathname.endsWith(".ico") ||
//     pathname.includes("favicon");

//   if (isNextInternalAsset) {
//     return NextResponse.next();
//   }

//   const isPublicPage = isPublicPageRoute(pathname);
//   const isPublicApi = isPublicApiRoute(pathname);
//   const isPrivatePage = isPrivatePageRoute(pathname);
//   const isPrivateApi = isPrivateApiRoute(pathname);
//   const isPageRequest = !pathname.startsWith("/api");

//   if (!token) {
//     if (isPrivateApi && !authToken) {
//       return NextResponse.json(
//         { error: "Authentication required" },
//         { status: 401 }
//       );
//     }

//     if (isPageRequest && (isPrivatePage || !isPublicPage) && !authToken) {
//       return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
//     }

//     // If neither explicitly public nor private, allow through
//     return NextResponse.next();
//   }

//   if (token && orgId) {
//     const decryptedResponse = await verifyAndDecryptTokenMiddleware(String(token), orgId);
//     console.log("decryptedResponse",decryptedResponse, "decryptedResponse-199");
//     if (decryptedResponse.success) {
//       userData = decryptedResponse.user as unknown as {
//         role: string;
//       };
//     }
//   }

//   console.log("userData",userData, "userData-208",pathname);

//   if (userData) {
//     const userRole = userData.role;

//     // Redirect authenticated users away from login page
//     // if (pathname.startsWith("/auth/login")) {
//     //   console.log("pathname",pathname, "pathname-215");
//     //   // Respect redirect query param if present
//     //   const redirectParam = request.nextUrl.searchParams.get("redirect");
//     //   if (redirectParam &&
//     //       !redirectParam.startsWith("/auth/") &&
//     //       redirectParam.startsWith("/")) {
//     //     return  NextResponse.redirect(createLoginRedirectUrl(request, redirectParam));
//     //   }

//     //   // Role-based default redirects
//     //   if (userRole === "candidate") {
//     //     return  NextResponse.redirect( createLoginRedirectUrl(request, "/apply-jobs"));
//     //   }
//     //   // For admin, hr, interviewer
//     //   return  NextResponse.redirect( createLoginRedirectUrl(request, "/dashboard")  );
//     // }

//     // Redirect authenticated users away from login page
// if (pathname.startsWith("/auth/login")) {
//   // Respect redirect query param if present
//   const redirectParam = request.nextUrl.searchParams.get("redirect");
//   if (redirectParam) {
//     try {
//       // Decode URL-encoded redirect parameter (%2Fdashboard -> /dashboard)
//       const decodedRedirect = decodeURIComponent(redirectParam);

//       // Validate it's a safe internal path
//       if (
//         decodedRedirect.startsWith("/") &&
//         !decodedRedirect.startsWith("//") &&
//         !decodedRedirect.startsWith("/auth/") &&
//         !decodedRedirect.startsWith("http://") &&
//         !decodedRedirect.startsWith("https://")
//       ) {
//         return NextResponse.redirect(new URL(decodedRedirect, request.url));
//       }
//     } catch (error) {
//       console.error("Invalid redirect parameter:", error);
//       // Fall through to default redirect
//     }
//   }

//   // Role-based default redirects (direct URLs, not login URLs)
//   if (userRole === "candidate") {
//     return NextResponse.redirect(new URL("/apply-jobs", request.url));
//   }
//   // For admin, hr, interviewer
//   return NextResponse.redirect(new URL("/dashboard", request.url));
// }
//   }

//   // Handle API routes authentication
//   const isFileApiWithAllowedFile =
//     pathname.startsWith("/api/files") &&
//     (request.nextUrl.searchParams.get("pathName")?.endsWith("header.html") ||
//       request.nextUrl.searchParams.get("pathName")?.endsWith("footer.html") ||
//       request.nextUrl.searchParams.get("pathName")?.endsWith("favicon.png"));

//   if (
//     pathname.startsWith("/api") &&
//     !isPublicApi &&
//     !isFileApiWithAllowedFile &&
//     !userData
//   ) {
//     return NextResponse.json(
//       { error: "Authentication required" },
//       { status: 401 }
//     );
//   }

//   // Extract organization name from the path if it exists
//   const pathParts = pathname.split("/").filter(Boolean);
//   const isOrgPath =
//     pathParts.length > 1 &&
//     !["dashboard", "auth", "api", "jobs", "calendar"].includes(pathParts[0]);

//   if (isOrgPath) {
//     const subPath = `/${pathParts[1]}`;
//     if (subPath === "/apply-jobs") {
//     }
//   } else {
//     if (!userData && isPrivatePage) {
//       return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
//     }
//   }

//   if (pathname?.includes("/backups") && !userData) {
//     return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
//   }

//   if (pathname?.includes("/calendar")) {
//     return NextResponse.next();
//   }

//   if (userData) {
//     const userRole = userData.role;

//     if (userRole === "admin") {
//       return NextResponse.next();
//     }

//     if (userRole === "hr") {
//       if (
//         pathname?.includes("/auth/signup") ||
//         pathname?.includes("/dashboard/settings")
//         // pathname?.includes("/dashboard/analytics")
//       ) {
//         return NextResponse.redirect(new URL("/dashboard", request.url));
//       }
//     }

//     // Candidate role - redirect to apply-jobs if trying to access dashboard
//     if (userRole === "candidate") {
//       if (
//         // pathname?.includes("/dashboard") ||
//         // pathname?.includes("/api/candidates/assignments") ||
//         // pathname?.includes("/dashboard/:path*")

//         unauthorizedCandidateAPIRoutes.some((path) => pathname?.includes(path))
//       ) {
//         const redirectUrl = isOrgPath
//           ? new URL(`/${pathParts[0]}/apply-jobs`, request.url)
//           : new URL("/apply-jobs", request.url);
//         return NextResponse.redirect(redirectUrl);
//       }
//     }

//     // Interviewer role restrictions
//     if (userRole === "interviewer") {
//       if (
//         unauthorizedInterviewerPages.some((path) => pathname?.includes(path))
//       ) {
//         return NextResponse.redirect(new URL("/dashboard", request.url));
//       }
//       if (
//         unauthorizedInterviewerAPIRoutes.some((path) =>
//           pathname?.includes(path)
//         )
//       ) {
//         return new NextResponse("Permission denied", { status: 403 });
//       }
//     }

//     // Restrict access to apply-jobs for non-candidate roles
//     if (userRole !== "candidate" && pathname?.includes("/apply-jobs")) {
//       return NextResponse.redirect(new URL("/dashboard", request.url));
//     }

//     // Admin-only access to backups
//     if (userRole !== "admin" && pathname?.includes("/backups")) {
//       return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
//     }
//   }

//   return NextResponse.next();
//   // const res = NextResponse.next();

//   // res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,");
//   // res.headers.set("Access-Control-Allow-Headers", "Content-Type");
//   // res.headers.set("Access-Control-Allow-Credentials", "true");

//   // // Handle preflight request
//   // if (req.method === "OPTIONS") {
//   //   return new Response(null, {
//   //     headers: res.headers,
//   //     status: 204,
//   //   });
//   // }

//   // return res;
// }

// export const config = {
//   matcher: [
//     "/dashboard/:path*",
//     "/auth/signup",
//     "/api/:path*",
//     // "/:orgName/:path*",
//     "/backups",
//     "/take-snapshot",
//     // "/auth/login",

//   ],
// };

// const unauthorizedInterviewerPages = [
//   "/jobs-board",
//   "/jobs",
//   "/auth/signup",
//   "/dashboard/settings",
//   "/dashboard/search",
//   "/dashboard/cv-upload",
//   "/dashboard/analytics",
//   "/api/organization/tags",
// ];

// const unauthorizedInterviewerAPIRoutes = ["/api/candidates/filter"];
// const unauthorizedCandidateAPIRoutes = [
//   "/api/candidates/assignments",
//   "/dashboard",
//   "/api/candidates/assignments",
//   "/dashboard/:path*",
//   "/api/nginx-logs",
//   "/api/download/assets",
// ];
// const apiExemptPaths = [
//   "/api/jobs/open-jobs",
//   "/api/auth/login",
//   "/api/auth/me",
//   "/api/auth/signup",
//   "/api/organization",
//   "/api/orgs",
//   "/api/auth/forgot-password",
//   "/api/auth/reset-password",
//   "/api/event-mail",
//   "/api/candidates/signup",
//   "/api/candidates/evaluate",
//   "/api/candidates/event-mail",
//   "/api/files",
//   "/api/file-proxy",
//   "/api/file",
//   "/api/candidates/guest-apply",
//   "/api/candidates/apply-application",
//   "/apply-jobs",
//   "/api/organization/cs/",
//   "/api/auth/2fa/send-otp",
//   "/api/auth/2fa/verify-otp",
//   "/api/settings/twofa",
//   "/api/settings/portal",
//   "/api/shared-files",
//   "/api/organization/tags",
//   "/api/auth/google/callback",
//   "/api/auth/google/authorize",
//   "/api/settings/captcha",
//   "/api/license-validate",
// ];

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import CryptoJS from 'crypto-js';
import { jwtVerify } from 'jose';
import { generateOrgJwtSecret } from '@/lib/jwtSecretGenerator';
// import { log } from "@/lib/logger";

interface JWTPayload {
  refresh?: string;
  iat?: number;
  exp?: number;
}

const redirectPaths = [
  '/dashboard',
  '/jobs',
  '/auth/signup',
  '/:orgName/apply-jobs',
];

const unauthorizedInterviewerPages = [
  '/jobs-board',
  '/jobs',
  '/dashboard/jobs',
  '/auth/signup',
  '/dashboard/settings',
  '/dashboard/search',
  '/dashboard/cv-upload',
  '/dashboard/analytics',
  '/api/organization/tags',
];

const unauthorizedInterviewerAPIRoutes = ['/api/candidates/filter'];
const unauthorizedCandidateAPIRoutes = [
  '/api/candidates/assignments',
  '/dashboard',
  '/api/candidates/assignments',
  '/dashboard/:path*',
  '/api/nginx-logs',
  '/api/download/assets',
];

const apiExemptPaths = [
  '/api/jobs/open-jobs',
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/signup',
  '/api/organization',
  '/api/orgs',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/event-mail',
  '/api/candidates/signup',
  '/api/candidates/evaluate',
  '/api/candidates/event-mail',
  '/api/files',
  '/api/file-proxy',
  '/api/file',
  '/api/candidates/guest-apply',
  '/api/candidates/apply-application',
  '/apply-jobs',
  '/api/organization/cs/',
  '/api/auth/2fa/send-otp',
  '/api/auth/2fa/verify-otp',
  '/api/settings/twofa',
  '/api/settings/portal',
  '/api/shared-files',
  // "/api/organization/tags",
  '/api/auth/google/callback',
  '/api/auth/google/authorize',
  '/api/auth/microsoft/callback',
  '/api/auth/microsoft/authorize',
  '/api/settings/captcha',
  '/api/license-validate',
];

export async function verifyAndDecryptTokenMiddleware(
  token: string,
  orgId: string,
) {
  if (!orgId) {
    return {
      success: false,
      error: 'Organization ID is missing from cookies',
    };
  }

  const JWT_SECRET = generateOrgJwtSecret(orgId);

  try {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      secretKey,
    );

    if (!payload || typeof payload !== 'object' || !payload.refresh) {
      throw new Error('Invalid token structure');
    }
    const bytes = CryptoJS.AES.decrypt(payload.refresh as string, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    return { success: true, user: decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Error Occurred',
    };
  }
}

// creates login redirect URL — preserves query string (e.g. ?candidateId=) so
// deep-link state survives the login bounce and the candidate dialog opens after auth.
function createLoginRedirectUrl(request: NextRequest, targetPath: string) {
  const loginUrl = new URL('/auth/login', request.url);
  const { search } = request.nextUrl;
  const fullPath = search ? `${targetPath}${search}` : targetPath;
  if (fullPath !== '/auth/login') {
    loginUrl.searchParams.set('redirect', fullPath);
  }
  return loginUrl;
}

/** Path pattern for job board with a specific candidate (email deep link). */
const JOB_CANDIDATE_DEEP_LINK = /^\/dashboard\/jobs\/[^/]+$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'https://hire.upforce.tech'
  ).split(',');
  const origin = request.nextUrl.hostname;

  if (!allowedOrigins.includes(origin))
    return NextResponse.json({ error: 'Origin Not Allowed' }, { status: 401 });
  let userData: { role: string } | undefined;

  // SECURITY FIX: Check both httpOnly and regular tokens for backward compatibility
  const httpOnlyToken = request.cookies.get('refresh_token');
  // const httpOnlyToken = request.cookies.get("auth_token");
  // const regularToken = request.cookies.get("token");

  const token = httpOnlyToken?.value;
  const orgId = request.cookies.get('org_id')?.value;
  if (token && orgId) {
    const decryptedResponse = await verifyAndDecryptTokenMiddleware(
      String(token),
      orgId,
    );
    // console.log(decryptedResponse, "decryptedResponse-543");
    if (decryptedResponse.success) {
      userData = decryptedResponse.user as unknown as {
        role: string;
      };
    }
  }
  // ✅ ADD THIS: Redirect authenticated users away from /auth/login
  //  console.log("in middleware ", pathname, "pathname-550")
  if (userData && pathname.startsWith('/auth/login')) {
    // console.log("in middleware ", pathname, "pathname-551")
    const userRole = userData.role;
    if (userRole === 'candidate') {
      return NextResponse.redirect(new URL('/apply-jobs', request.url));
    }
    // For admin, hr, interviewer
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Handle API routes authentication
  const isFileApiWithAllowedFile =
    pathname.startsWith('/api/files') &&
    (request.nextUrl.searchParams.get('pathName')?.endsWith('header.html') ||
      request.nextUrl.searchParams.get('pathName')?.endsWith('footer.html') ||
      request.nextUrl.searchParams.get('pathName')?.endsWith('favicon.png'));

  if (
    pathname.startsWith('/api') &&
    !apiExemptPaths.some(
      (path) => pathname === path || pathname?.includes(path),
    ) &&
    !isFileApiWithAllowedFile
  ) {
    if (!userData) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
  }

  // Extract organization name from the path if it exists
  const pathParts = pathname.split('/').filter(Boolean);
  const isOrgPath =
    pathParts.length > 1 &&
    !['dashboard', 'auth', 'api', 'jobs', 'calendar'].includes(pathParts[0]);

  // Allow email links to job board (with or without candidateId): do not redirect to
  // login so the page loads; client-side auth will redirect with full URL if needed.
  const isJobBoardPage = JOB_CANDIDATE_DEEP_LINK.test(pathname);

  if (isOrgPath) {
    const subPath = `/${pathParts[1]}`;
    if (subPath === '/apply-jobs') {
      //
    }
  } else if (
    !userData &&
    !isJobBoardPage &&
    redirectPaths.some((path) => {
      if (path.includes(':orgName')) return false;
      return pathname.startsWith(path);
    })
  ) {
    return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
  }

  if (pathname?.includes('/backups') && !userData) {
    return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
  }

  if (pathname?.includes('/calendar')) {
    return NextResponse.next();
  }

  if (userData) {
    const userRole = userData.role;

    if (userRole === 'admin') {
      return NextResponse.next();
    }

    if (userRole === 'hr') {
      if (
        pathname?.includes('/auth/signup') ||
        pathname?.includes('/dashboard/settings')
      ) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Candidate role - redirect to apply-jobs if trying to access dashboard
    if (userRole === 'candidate') {
      if (
        unauthorizedCandidateAPIRoutes.some((path) => pathname?.includes(path))
      ) {
        const redirectUrl = isOrgPath
          ? new URL(`/${pathParts[0]}/apply-jobs`, request.url)
          : new URL('/apply-jobs', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Interviewer role restrictions
    if (userRole === 'interviewer') {
      if (
        unauthorizedInterviewerPages.some((path) => pathname?.includes(path))
      ) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (
        unauthorizedInterviewerAPIRoutes.some((path) =>
          pathname?.includes(path),
        )
      ) {
        return new NextResponse('Permission denied', { status: 403 });
      }
    }

    // Restrict access to apply-jobs for non-candidate roles
    if (userRole !== 'candidate' && pathname?.includes('/apply-jobs')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Admin-only access to backups
    if (userRole !== 'admin' && pathname?.includes('/backups')) {
      return NextResponse.redirect(createLoginRedirectUrl(request, pathname));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/signup',
    '/api/:path*',
    '/:orgName/:path*',
    '/backups',
    '/take-snapshot',
  ],
};
