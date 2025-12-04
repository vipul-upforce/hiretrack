'use client';

import { useEffect, useState } from 'react';
import { useFetchOpenJobQuery } from '@/lib/features/job/jobApi';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { useCustomFields } from '@/Custom_Fields/hooks/use-customFields';
import { useFetchAppliedApplicationQuery } from '@/lib/features/candidate/candidateApi';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/lib/redux/authSlice';
import { useFetchOrgQuery } from '@/lib/features/org/orgApi';
import { useGetPortalConfigsQuery } from '@/lib/features/settings/settingsApi';
import { useIsIframe } from './IframeDetector';
import JobModal from './JobModal';
import { HeaderSection } from './components/header-section';
import { SearchBar } from './components/search-bar';
import { JobGrid } from './components/job-grid';
import { ErrorState } from './components/error-state';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experience: number;
  salary?: {
    min: 0;
    max: 0;
    inText: string;
    isPrivate: false;
  };
  customFields?: Record<string, any>;
}

function isFetchBaseQueryError(
  error: FetchBaseQueryError | SerializedError | unknown,
): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

export default function ApplyJobsContent({
  showHeaderFooter = true,
}: {
  showHeaderFooter?: boolean;
}) {
  const isIframe = useIsIframe();
  const searchParams = useSearchParams();
  const [orgName, setOrgName] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsJobModalOpen] = useState(false);
  const [appliedApplications, setAppliedApplications] = useState<string[]>([]);

  const { data: orgResponse, isLoading: isOrgLoading } = useFetchOrgQuery(undefined);

  const { data: portalResponse, isLoading: isPortalLoading } = useGetPortalConfigsQuery(undefined);

  const hideHeaderParam = searchParams.get('hideHeader');
  const hideFooterParam = searchParams.get('hideFooter');
  const hideHeader = hideHeaderParam === 'true';
  const hideFooter = hideFooterParam === 'true';

  const hasHeaderParam = hideHeaderParam !== null;
  const hasFooterParam = hideFooterParam !== null;

  const shouldShowHeader = showHeaderFooter && (hasHeaderParam ? !hideHeader : !isIframe);
  const shouldShowFooter = showHeaderFooter && (hasFooterParam ? !hideFooter : !isIframe);

  const { data } = useFetchAppliedApplicationQuery(
    {},
    { skip: orgName === '' },
  );
  const { user } = useSelector((state: any) => state.auth || null);

  const { toast } = useToast();
  const { setUserLoggedIn, userLoggedIn } = useCustomFields();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [queryTitle, setQueryTitle] = useState<string>('');
  const [invalidPage, setInvalidPage] = useState<boolean>(false);
  const [layoutState, setLayoutState] = useState<{
    headerHTML: string;
    footerHTML: string;
  }>({
    headerHTML: '',
    footerHTML: '',
  });

  const [primaryColor, setPrimaryColor] = useState<string>('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState<string>('#8b5cf6');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [portalName, setPortalName] = useState<string>('');
  const dispatch = useDispatch();

  const {
    data: jobs,
    isLoading,
    error,
  } = useFetchOpenJobQuery(
    { orgName, title: queryTitle },
    { skip: orgName === null },
  ) as {
    data: Job[];
    isLoading: boolean;
    error: FetchBaseQueryError | SerializedError;
  };

  const { formNameObject } = useCustomForm('Job Position');

  async function checkAllowance() {
    const urlOrgName = searchParams?.get('o') || orgName;

    if (!orgResponse || !orgResponse.data) return;

    try {
      const allowance = orgResponse;
      const portalData = portalResponse || null;

      if (urlOrgName) {
        setInvalidPage(false);

        const config = allowance?.data?.find(
          (org: any) => org?.portalConfigs?.portalName === urlOrgName,
        )?.portalConfigs;

        if (config?.primaryColor) setPrimaryColor(config.primaryColor);
        if (config?.secondaryColor) setSecondaryColor(config.secondaryColor);
        if (config?.portalLogo?.url) setLogoUrl(config.portalLogo.url);
        if (config?.portalName) setPortalName(config.portalName);

        if (portalData) {
          if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
          if (portalData.secondaryColor) setSecondaryColor(portalData.secondaryColor);
          if (portalData.portalLogo) {
            const logoUrl = typeof portalData.portalLogo === 'string'
              ? portalData.portalLogo
              : portalData.portalLogo?.url;
            if (logoUrl) setLogoUrl(logoUrl);
          }
          if (portalData.portalName) setPortalName(portalData.portalName);
        }

        if (config?.portalHeader?.url && config?.portalFooter?.url) {
          try {
            const [headerRes, footerRes] = await Promise.all([
              fetch(config.portalHeader.url),
              fetch(config.portalFooter.url),
            ]);
            const [headerHTML, footerHTML] = await Promise.all([
              headerRes.text(),
              footerRes.text(),
            ]);
            setLayoutState({ headerHTML, footerHTML });
          } catch (err) {
            console.error('Failed to fetch header/footer:', err);
            setLayoutState({ headerHTML: '', footerHTML: '' });
          }
        }

        return;
      }

      if (allowance.allow) {
        // setInvalidPage(true);
      }

      const config = allowance?.data?.[0]?.portalConfigs;

      if (config?.primaryColor) setPrimaryColor(config.primaryColor);
      if (config?.secondaryColor) setSecondaryColor(config.secondaryColor);
      if (config?.portalLogo?.url) setLogoUrl(config.portalLogo.url);
      if (config?.portalName) setPortalName(config.portalName);

      if (portalData) {
        if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
        if (portalData.secondaryColor) setSecondaryColor(portalData.secondaryColor);
        if (portalData.portalLogo) {
          const logoUrl = typeof portalData.portalLogo === 'string'
            ? portalData.portalLogo
            : portalData.portalLogo?.url;
          if (logoUrl) setLogoUrl(logoUrl);
        }
        if (portalData.portalName) setPortalName(portalData.portalName);
      }

      if (config?.portalHeader?.url && config?.portalFooter?.url) {
        const [headerRes, footerRes] = await Promise.all([
          fetch(config.portalHeader.url),
          fetch(config.portalFooter.url),
        ]);
        const [headerHTML, footerHTML] = await Promise.all([
          headerRes.text(),
          footerRes.text(),
        ]);
        setLayoutState({ headerHTML, footerHTML });
      }
    } catch (error) {
      console.error('Error processing portal settings:', error);
    }
  }

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--portal-primary',
      primaryColor,
    );
    document.documentElement.style.setProperty(
      '--portal-secondary',
      secondaryColor,
    );
    document.documentElement.style.setProperty(
      '--portal-logo',
      logoUrl ? `url('${logoUrl}')` : 'none',
    );
    document.documentElement.style.setProperty(
      '--portal-name',
      `"${portalName || 'Your Portal Name'}"`,
    );
  }, [primaryColor, secondaryColor, logoUrl, portalName]);

  useEffect(() => {
    if (!isOrgLoading && !isPortalLoading && orgResponse) {
      checkAllowance();
    }
  }, [orgResponse, portalResponse, searchParams, orgName]);

  const pageInit = async () => {
    const urlOrgName = searchParams?.get('o');
    if (user) {
      try {
        if (user.organizationInfo && user.organizationInfo.name) {
          setOrgName(user.organizationInfo.name);
          setUserLoggedIn(true);
        } else {
          setOrgName(urlOrgName || '');
        }
      } catch {
        setOrgName(urlOrgName || '');
        toast({
          title: 'Authentication Error',
          description: 'Please log in again',
          variant: 'destructive',
        });
        dispatch(logout());
        localStorage.removeItem('persist:auth');
        localStorage.removeItem('persist:organization');
        await fetch('/api/auth/logout');
        window.location.href = '/auth/login';
      }
    } else {
      setOrgName(urlOrgName || '');
    }
  };

  useEffect(() => {
    pageInit();
  }, [searchParams]);

  useEffect(() => {
    if (data) {
      setAppliedApplications(data.appliedApplications);
    }
  }, [data, isModalOpen, selectedJob]);

  const handleSearch = () => {
    setQueryTitle(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setQueryTitle('');
  };

  const handleLogout = async () => {
    dispatch(logout());
    localStorage.removeItem('persist:auth');
    localStorage.removeItem('persist:organization');
    await fetch('/api/auth/logout');
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
    window.location.href = '/auth/login';
  };

  // if (invalidPage) {
  //   return <InvalidPage message="Page Doesn't Exist" />;
  // }

  if (error && !isLoading) {
    if (isFetchBaseQueryError(error) && error.status !== 404) {
      return (
        <ErrorState
          imageUrl="/error.webp"
          errorMessage={
            isFetchBaseQueryError(error)
            && 'data' in error
            && (error.data as { error: string })?.error
          }
        />
      );
    }
    return (
      <ErrorState
        imageUrl="/notfound.jpg"
        errorMessage={
            isFetchBaseQueryError(error)
            && 'data' in error
            && (error.data as { error: string })?.error
          }
      />
    );
  }

  return (
    <div
      className={
        shouldShowHeader || shouldShowFooter
          ? 'flex flex-col min-h-screen relative'
          : 'relative'
      }
    >
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, ${primaryColor}22 0%, transparent 60%), 
                             radial-gradient(circle at 80% 20%, ${secondaryColor}22 0%, transparent 60%),
                             radial-gradient(circle at 40% 40%, ${primaryColor}11 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, ${primaryColor}05 50%, transparent 100%)`,
          }}
        />
      </div>

      {shouldShowHeader && (
        <div dangerouslySetInnerHTML={{ __html: layoutState?.headerHTML }} />
      )}

      <main
        className={
          shouldShowHeader || shouldShowFooter
            ? 'flex-1 p-4 relative z-10'
            : 'relative z-10'
        }
      >
        <div className="container mx-auto p-2">
          <HeaderSection
            orgName={orgName}
            userLoggedIn={userLoggedIn}
            onLogout={handleLogout}
          />

          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSearch={handleSearch}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />

          <JobGrid
            jobs={jobs}
            isLoading={isLoading}
            primaryColor={primaryColor}
            formNameObject={formNameObject}
            onJobClick={(job) => {
              setSelectedJob(job);
              setIsJobModalOpen(true);
            }}
            hasSearch={queryTitle !== ''}
            onClearSearch={handleClearSearch}
          />
        </div>
      </main>

      {shouldShowFooter && (
        <div dangerouslySetInnerHTML={{ __html: layoutState.footerHTML }} />
      )}

      <JobModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        orgName={orgName}
        readOnly={
          !!(
            appliedApplications
            && selectedJob
            && appliedApplications.includes(selectedJob?._id)
          )
        }
      />
    </div>
  );
}
