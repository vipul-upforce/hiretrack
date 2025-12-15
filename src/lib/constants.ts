export const wierdFileNamePattern = /[^a-zA-Z0-9(). ]/g;

export const followUpSepretorPatternRegex = /\|\|\|\|\|\n/g;

export const scoreColors: Record<
  number,
  {
    bg: string;
    text: string;
    border: string;
    dark: { bg: string; text: string; border: string };
  }
> = {
  1: {
    bg: 'rgba(254, 202, 202, 1)', // bg-red-200
    text: 'rgba(127, 29, 29, 1)', // text-red-900 - darker for better contrast
    border: 'rgba(252, 165, 165, 1)', // border-red-300
    dark: {
      bg: 'rgba(185, 28, 28, 0.2)', // dark:bg-red-900/20
      text: 'rgba(252, 165, 165, 1)', // dark:text-red-300
      border: 'rgba(159, 18, 18, 1)', // dark:border-red-700
    },
  },
  2: {
    bg: 'rgba(254, 226, 226, 1)', // bg-red-100
    text: 'rgba(153, 27, 27, 1)', // text-red-800 - darker for better contrast
    border: 'rgba(254, 202, 202, 1)', // border-red-200
    dark: {
      bg: 'rgba(185, 28, 28, 0.1)', // dark:bg-red-900/10
      text: 'rgba(239, 68, 68, 1)', // dark:text-red-400
      border: 'rgba(153, 27, 27, 1)', // dark:border-red-800
    },
  },
  3: {
    bg: 'rgba(254, 226, 226, 1)', // bg-red-100
    text: 'rgba(153, 27, 27, 1)', // text-red-800 - darker for better contrast
    border: 'rgba(254, 202, 202, 1)', // border-red-200
    dark: {
      bg: 'rgba(185, 28, 28, 0.1)', // dark:bg-red-900/10
      text: 'rgba(239, 68, 68, 1)', // dark:text-red-400
      border: 'rgba(153, 27, 27, 1)', // dark:border-red-800
    },
  },
  4: {
    bg: 'rgba(255, 237, 213, 1)', // bg-orange-100
    text: 'rgba(194, 65, 12, 1)', // text-orange-800 - darker for better contrast
    border: 'rgba(251, 191, 36, 1)', // border-orange-200
    dark: {
      bg: 'rgba(234, 88, 12, 0.1)', // dark:bg-orange-900/10
      text: 'rgba(249, 115, 22, 1)', // dark:text-orange-400
      border: 'rgba(194, 65, 12, 1)', // dark:border-orange-800
    },
  },
  // Average (5): Amber theme
  5: {
    bg: 'rgba(254, 243, 199, 1)', // bg-amber-50 - fixed alpha value
    text: 'rgba(180, 83, 9, 1)', // text-amber-800 - darker for better contrast
    border: 'rgba(252, 211, 77, 1)', // border-amber-200
    dark: {
      bg: 'rgba(146, 64, 14, 0.1)', // dark:bg-amber-900/10
      text: 'rgba(251, 191, 36, 1)', // dark:text-amber-400
      border: 'rgba(180, 83, 9, 1)', // dark:border-amber-800
    },
  },
  // Above Average (6): Lime theme
  6: {
    bg: 'rgba(236, 252, 203, 1)', // bg-lime-100 - corrected from lime-500
    text: 'rgba(77, 124, 15, 1)', // text-lime-800 - darker for better contrast
    border: 'rgba(190, 242, 100, 1)', // border-lime-200
    dark: {
      bg: 'rgba(77, 124, 15, 0.1)', // dark:bg-lime-900/10
      text: 'rgba(163, 230, 53, 1)', // dark:text-lime-400
      border: 'rgba(77, 124, 15, 1)', // dark:border-lime-800
    },
  },
  // Good (7): Teal theme
  7: {
    bg: 'rgba(204, 251, 241, 1)', // bg-teal-100
    text: 'rgba(19, 78, 74, 1)', // text-teal-800 - darker for better contrast
    border: 'rgba(45, 212, 191, 1)', // border-teal-200
    dark: {
      bg: 'rgba(17, 94, 89, 0.1)', // dark:bg-teal-900/10
      text: 'rgba(45, 212, 191, 1)', // dark:text-teal-400
      border: 'rgba(19, 78, 74, 1)', // dark:border-teal-800
    },
  },
  8: {
    bg: 'rgba(204, 251, 241, 1)', // bg-teal-100
    text: 'rgba(17, 94, 89, 1)', // text-teal-900 - darker for better contrast
    border: 'rgba(45, 212, 191, 1)', // border-teal-200
    dark: {
      bg: 'rgba(17, 94, 89, 0.1)', // dark:bg-teal-900/10
      text: 'rgba(45, 212, 191, 1)', // dark:text-teal-400
      border: 'rgba(19, 78, 74, 1)', // dark:border-teal-800
    },
  },
  // Excellent (9-10): Green theme
  9: {
    bg: 'rgba(209, 250, 229, 1)', // bg-emerald-100
    text: 'rgba(6, 95, 70, 1)', // text-emerald-800 - darker for better contrast
    border: 'rgba(52, 211, 153, 1)', // border-emerald-200
    dark: {
      bg: 'rgba(6, 78, 59, 0.1)', // dark:bg-emerald-900/10
      text: 'rgba(52, 211, 153, 1)', // dark:text-emerald-400
      border: 'rgba(6, 95, 70, 1)', // dark:border-emerald-800
    },
  },
  10: {
    bg: 'rgba(220, 252, 231, 1)', // bg-green-100
    text: 'rgba(22, 101, 52, 1)', // text-green-800 - darker for better contrast
    border: 'rgba(74, 222, 128, 1)', // border-green-200
    dark: {
      bg: 'rgba(20, 83, 45, 0.1)', // dark:bg-green-900/10
      text: 'rgba(74, 222, 128, 1)', // dark:text-green-400
      border: 'rgba(22, 101, 52, 1)', // dark:border-green-800
    },
  },
};


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

export const unauthorizedInterviewerPages = [
  '/jobs-board',
  '/jobs',
  '/auth/signup',
  '/dashboard/settings',
  '/dashboard/search',
  '/dashboard/cv-upload',
  '/dashboard/analytics',
  '/api/organization/tags',
];

export const unauthorizedInterviewerAPIRoutes = ['/api/candidates/filter'];

export const unauthorizedCandidateAPIRoutes = [
  '/api/candidates/assignments',
  '/dashboard',
  '/api/candidates/assignments',
  '/dashboard/:path*',
  '/api/nginx-logs',
  '/api/download/assets',
];
export const apiExemptPaths = [
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
  '/api/organization/tags',
  '/api/auth/google/callback',
  '/api/auth/google/authorize',
  '/api/settings/captcha',
  '/api/license-validate',
];

export const redirectPaths = [
  '/dashboard',
  '/jobs',
  '/auth/signup',
  '/:orgName/apply-jobs',
];
