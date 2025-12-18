import logger from '../logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This function is used by Next.js for initial server-side metadata generation
// Client-side updates are handled in client-layout.tsx
export const pageMetaData = async () => {
  try {
    const url = process.env.BASE_URL || 'http://localhost:3000' ;
    const res = await fetch(`${url}/api/organization?limit=1`, {
      cache: 'no-store', // disable fetch caching
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error('Failed to fetch organization data');

    const data = await res.json();
    const org = Array.isArray(data) ? data[0] : data?.data?.[0];

    const title = org?.portalConfigs?.portalName || 'HireTrack';

    const faviconUrl = org?.portalConfigs?.portalFavicon?.url || '/favicon.png';
    return {
      title,
      icons: {
        icon: faviconUrl,
      },
    };
  } catch (error) {
    logger.error('Error fetching organization data for metadata:', error);
    return {
      title: 'HireTrack',
      icons: {
        icon: '/favicon.png',
      },
    };
  }
};
