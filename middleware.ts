import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import CryptoJS from 'crypto-js';
import { jwtVerify } from 'jose';
import { generateOrgJwtSecret } from '@/lib/jwtSecretGenerator';
import { apiExemptPaths, redirectPaths, unauthorizedCandidateAPIRoutes, unauthorizedInterviewerAPIRoutes, unauthorizedInterviewerPages } from '@/lib/constants';

interface JWTPayload {
  user: string;
}

export async function verifyAndDecryptTokenMiddleware(token: string, orgId: string) {
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

    if (!payload || typeof payload !== 'object' || !payload.user) {
      throw new Error('Invalid token structure');
    }
    const bytes = CryptoJS.AES.decrypt(payload.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    return { success: true, user: decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Error Occurred',
    };
  }
}

// creates login redirect URL
function createLoginRedirectUrl(request: NextRequest, targetPath: string) {
  const loginUrl = new URL('/auth/login', request.url);
  if (targetPath !== '/auth/login') {
    loginUrl.searchParams.set('redirect', targetPath);
  }
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'https://hire.upforce.tech'
  ).split(',');
  const origin = request.nextUrl.hostname;

  if (!allowedOrigins.includes(origin)) return NextResponse.json({ error: 'Origin Not Allowed' }, { status: 401 });
  let userData: { role: string } | undefined;

  // SECURITY FIX: Check both httpOnly and regular tokens for backward compatibility
  const httpOnlyToken = request.cookies.get('auth_token');
  // const regularToken = request.cookies.get("token");

  const token = httpOnlyToken?.value;
  const orgId = request.cookies.get('org_id')?.value;
  if (token && orgId) {
    const decryptedResponse = await verifyAndDecryptTokenMiddleware(String(token), orgId);
    if (decryptedResponse.success) {
      userData = decryptedResponse.user as unknown as {
        role: string;
      };
    }
  }

  // Handle API routes authentication
  const isFileApiWithAllowedFile = pathname.startsWith('/api/files')
    && (request.nextUrl.searchParams.get('pathName')?.endsWith('header.html')
      || request.nextUrl.searchParams.get('pathName')?.endsWith('footer.html')
      || request.nextUrl.searchParams.get('pathName')?.endsWith('favicon.png'));

  if (
    pathname.startsWith('/api')
    && !apiExemptPaths.some(
      (path) => pathname === path || pathname?.includes(path),
    )
    && !isFileApiWithAllowedFile
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
  const isOrgPath = pathParts.length > 1
    && !['dashboard', 'auth', 'api', 'jobs', 'calendar'].includes(pathParts[0]);

  if (isOrgPath) {
    const subPath = `/${pathParts[1]}`;
    if (subPath === '/apply-jobs') {
      //
    }
  } else if (
    !userData
      && redirectPaths.some((path) => {
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
        pathname?.includes('/auth/signup')
        || pathname?.includes('/dashboard/settings')
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
        unauthorizedInterviewerAPIRoutes.some((path) => pathname?.includes(path))
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