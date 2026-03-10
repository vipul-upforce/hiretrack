'use client';

import { useEffect, useRef, useState } from 'react';
import { useFetchOpenJobQuery } from '@/lib/features/job/jobApi';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCustomFields } from '@/Custom_Fields/hooks/use-customFields';
import { useFetchAppliedApplicationQuery } from '@/lib/features/candidate/candidateApi';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import useCustomForm, {
  CustomFieldValues,
} from '@/Custom_Fields/hooks/useCustomForm';
import {
  useFetchOrgQuery,
  useLazyGetCustomFieldsByOrgNameQuery,
} from '@/lib/features/org/orgApi';
import { useGetPortalConfigsQuery } from '@/lib/features/settings';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { useLogoutUserMutation } from '@/lib/features/auth/authApi';
import { refreshAccessToken } from '@/lib/api/baseApi';
import logger from '@/lib/logger';
import Cookies from 'js-cookie';
import { useIsIframe } from './IframeDetector';
import { HeaderSection } from './components/header-section';
import { SearchBar } from './components/search-bar';
import { JobGrid } from './components/job-grid';
import { ErrorState } from './components/error-state';
import JobModal from './JobModal';
import {
  buildEmbedUrlWithJobId,
  getApplyJobsBasePath,
  useShouldRedirectToEmbedOnJobClick,
} from './utils/embed-redirect';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experience: number;
  salary?: {
    min: number;
    max: number;
    inText: string;
    isPrivate: boolean;
  };
  customFields?: CustomFieldValues;
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
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isIframe = useIsIframe();
  const shouldRedirectToEmbed = useShouldRedirectToEmbedOnJobClick(isIframe);
  const searchParams = useSearchParams();

  const [orgName, setOrgName] = useState<string>(searchParams?.get('o') || '');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsJobModalOpen] = useState(false);
  const [appliedApplications, setAppliedApplications] = useState<string[]>([]);
  /** Prevents auto-open effect from re-opening the modal right after user closed it (URL update is async). */
  const skipAutoOpenAfterCloseRef = useRef(false);

  const { data: orgResponse, isLoading: isOrgLoading } =
    useFetchOrgQuery(undefined);
  const { data: portalResponse, isLoading: isPortalLoading } =
    useGetPortalConfigsQuery(undefined);
  const [triggerGetCustomFields] = useLazyGetCustomFieldsByOrgNameQuery();
  const { user } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  const { setUserLoggedIn, userLoggedIn, setCustomFields } = useCustomFields();
  const [triggerLogout] = useLogoutUserMutation();

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  useEffect(() => {
    const resolveOrgName = async () => {
      const urlOrgName = searchParams?.get('o');

      // Priority 1: URL Parameter
      if (urlOrgName) {
        setOrgName(urlOrgName);
        return;
      }

      // Priority 2: Logged In User
      if (user) {
        try {
          if (user.organizationInfo && user.organizationInfo.name) {
            setOrgName(user.organizationInfo.name);
            setUserLoggedIn(true);
            return;
          }
        } catch {
          setOrgName('');
          toast({
            title: 'Authentication Error',
            description: 'Please log in again',
            variant: 'destructive',
          });
          await triggerLogout();
          router.push('/auth/login');
          return;
        }
      }

      // Priority 3: Portal Config Default
      if (!isPortalLoading && portalResponse?.portalName) {
        setOrgName(portalResponse.portalName);
        return;
      }

      // Fallback
      if (!isPortalLoading && !portalResponse) {
        setOrgName('');
      }
    };

    resolveOrgName();
  }, [
    searchParams,
    user,
    portalResponse,
    isPortalLoading,
    router,
    toast,
    triggerLogout,
    setUserLoggedIn,
  ]);

  // Manually fetch custom fields if OrgName is resolved but URL param is missing
  useEffect(() => {
    const urlOrgParam = searchParams?.get('o');

    if (orgName && !urlOrgParam) {
      triggerGetCustomFields(orgName)
        .unwrap()
        .then((payload) => {
          setCustomFields(payload);
        })
        .catch((err) => {
          logger.error('Failed to manual fetch custom fields', err);
        });
    }
  }, [orgName, searchParams, triggerGetCustomFields, setCustomFields]);

  const hideHeaderParam = searchParams?.get('hideHeader');
  const hideFooterParam = searchParams?.get('hideFooter');
  const hideHeader = hideHeaderParam === 'true';
  const hideFooter = hideFooterParam === 'true';

  const hasHeaderParam = hideHeaderParam !== null;
  const hasFooterParam = hideFooterParam !== null;
  const authState = Cookies.get('auth_state');
  const shouldShowHeader =
    showHeaderFooter && (hasHeaderParam ? !hideHeader : !isIframe);
  const shouldShowFooter =
    showHeaderFooter && (hasFooterParam ? !hideFooter : !isIframe);

  const isCandidate = user?.role === 'candidate';

  const shouldSkipQuery =
    !isCandidate && (orgName === '' || authState === 'true');

  const { data } = useFetchAppliedApplicationQuery(
    {},
    { skip: shouldSkipQuery || user == null },
  );

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [queryTitle, setQueryTitle] = useState<string>('');
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

  const {
    data: jobs,
    isLoading,
    error,
  } = useFetchOpenJobQuery(
    { orgName, title: queryTitle },
    {
      skip: !orgName,
      refetchOnMountOrArgChange: true,
    },
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
        const config = allowance?.data?.find(
          (org: { portalConfigs: { portalName: string } }) =>
            org?.portalConfigs?.portalName === urlOrgName,
        )?.portalConfigs;

        if (config?.primaryColor) setPrimaryColor(config.primaryColor);
        if (config?.secondaryColor) setSecondaryColor(config.secondaryColor);
        if (config?.portalLogo?.url) setLogoUrl(config.portalLogo.url);
        if (config?.portalName) setPortalName(config.portalName);

        if (portalData) {
          if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
          if (portalData.secondaryColor)
            setSecondaryColor(portalData.secondaryColor);
          if (portalData.portalLogo) {
            const logoUrl2 =
              typeof portalData.portalLogo === 'string'
                ? portalData.portalLogo
                : portalData.portalLogo?.url;
            if (logoUrl2) setLogoUrl(logoUrl2);
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
            logger.error('Failed to fetch header/footer:', err);
            setLayoutState({ headerHTML: '', footerHTML: '' });
          }
        }

        return;
      }

      const config = allowance?.data?.[0]?.portalConfigs;

      if (config?.primaryColor) setPrimaryColor(config.primaryColor);
      if (config?.secondaryColor) setSecondaryColor(config.secondaryColor);
      if (config?.portalLogo?.url) setLogoUrl(config.portalLogo.url);
      if (config?.portalName) setPortalName(config.portalName);

      if (portalData) {
        if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
        if (portalData.secondaryColor)
          setSecondaryColor(portalData.secondaryColor);
        if (portalData.portalLogo) {
          const logoUrl3 =
            typeof portalData.portalLogo === 'string'
              ? portalData.portalLogo
              : portalData.portalLogo?.url;
          if (logoUrl3) setLogoUrl(logoUrl3);
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
    } catch (e) {
      logger.error('Error processing portal settings:', e);
    }
  }
  const orgId = Cookies.get('org_id');
  // Add this useEffect to proactively refresh token if refresh_token exists

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      // Check if refresh_token exists in cookies

      // If we have refresh_token and orgId, but auth_state is not 'true' or user is null,
      // proactively refresh the token
      if (orgId && (!authState || authState !== 'true')) {
        try {
          await refreshAccessToken(dispatch).then(() => setUserLoggedIn(true));
        } catch {
          // Silently fail - don't disrupt the page if refresh fails
          // The user can still use public endpoints
          logger.warn('Proactive token refresh failed:', error);
        }
      }
    };

    checkAndRefreshToken();
  }, [dispatch, user, orgId, authState]);

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

  useEffect(() => {
    if (data) {
      setAppliedApplications(data.appliedApplications);
    }
  }, [data, isModalOpen, selectedJob]);

  /** Auto-open job modal when jobId is present in URL (deep link from cross-origin redirect) */
  const jobIdFromUrl = searchParams?.get('jobId');
  useEffect(() => {
    if (!jobIdFromUrl) {
      skipAutoOpenAfterCloseRef.current = false;
      return;
    }
    if (skipAutoOpenAfterCloseRef.current || !jobs?.length || isModalOpen)
      return;
    const job = jobs.find((j) => j._id === jobIdFromUrl);
    if (job) {
      setSelectedJob(job);
      setIsJobModalOpen(true);
    }
  }, [jobIdFromUrl, jobs, isModalOpen]);

  /** Redirect to embed URL when cross-origin iframe; otherwise open modal in place */
  const handleJobClick = (job: Job) => {
    if (shouldRedirectToEmbed && typeof window !== 'undefined') {
      window.top!.location.href = buildEmbedUrlWithJobId(job._id);
      return;
    }
    setSelectedJob(job);
    setIsJobModalOpen(true);
  };

  const handleSearch = () => {
    if (!searchTerm) {
      setQueryTitle('');
      return;
    }

    const sanitizedTerm = escapeRegExp(searchTerm.trim());
    setQueryTitle(sanitizedTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setQueryTitle('');
  };

  const handleCloseJobModal = () => {
    const hadJobIdInUrl = !!searchParams?.get('jobId');
    if (hadJobIdInUrl && typeof window !== 'undefined') {
      skipAutoOpenAfterCloseRef.current = true;
      router.replace(getApplyJobsBasePath(), { scroll: false });
    }
    setIsJobModalOpen(false);
    setSelectedJob(null);
  };

  const handleLogout = async () => {
    try {
      await triggerLogout().unwrap();
    } catch (e) {
      logger.error('Logout failed', e);
    } finally {
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
      router.push('/auth/login');
    }
  };

  if (error && !isLoading) {
    if (isFetchBaseQueryError(error) && error.status !== 404) {
      return (
        <ErrorState
          imageUrl="/error.webp"
          errorMessage={
            isFetchBaseQueryError(error) &&
            'data' in error &&
            (error.data as { error: string })?.error
          }
        />
      );
    }
    return (
      <ErrorState
        imageUrl="/notfound.jpg"
        errorMessage={
          isFetchBaseQueryError(error) &&
          'data' in error &&
          (error.data as { error: string })?.error
        }
      />
    );
  }

  return (
    <div
      className={
        shouldShowHeader || shouldShowFooter
          ? 'relative flex min-h-screen flex-col'
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
        // eslint-disable-next-line react/no-danger
        <div dangerouslySetInnerHTML={{ __html: layoutState?.headerHTML }} />
      )}

      <main
        className={
          shouldShowHeader || shouldShowFooter
            ? 'relative z-10 flex-1 p-4'
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
            jobs={jobs || []}
            isLoading={isLoading}
            primaryColor={primaryColor}
            formNameObject={formNameObject}
            onJobClick={handleJobClick}
            hasSearch={queryTitle !== ''}
            onClearSearch={handleClearSearch}
          />
        </div>
      </main>

      {shouldShowFooter && (
        // eslint-disable-next-line react/no-danger
        <div dangerouslySetInnerHTML={{ __html: layoutState.footerHTML }} />
      )}

      <JobModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={handleCloseJobModal}
        orgName={orgName}
        readOnly={
          !!(
            appliedApplications &&
            selectedJob &&
            appliedApplications.includes(selectedJob?._id)
          )
        }
      />
    </div>
  );
}
