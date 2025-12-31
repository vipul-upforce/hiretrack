import { Metadata } from 'next';
import { getPortalMetadata } from '@/lib/getPortalMetadata';
import { generatePortalMetadata } from '@/lib/utils/generatePortalMetadata';
import React from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const portalData = await getPortalMetadata();
  return generatePortalMetadata(portalData, {
    title: 'Careers',
    description: `Explore exciting career opportunities at ${portalData.portalName}. Apply to open positions and join our team.`,
  });
}

export default function ApplyJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
