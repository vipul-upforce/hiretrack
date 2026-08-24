import { Metadata } from 'next';
import { getPortalMetadata } from '@/lib/getPortalMetadata';
import { generatePortalMetadata } from '@/lib/utils/generatePortalMetadata';
import React from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const portalData = await getPortalMetadata();
  return generatePortalMetadata(portalData, {
    title: 'Login',
    description: `Sign in to ${portalData.portalName} to access your recruitment dashboard and manage your hiring process.`,
  });
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
