'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
} from '@/lib/features/settings/settingsApi';
import { useGetOrganizationAllowanceQuery } from '@/lib/features/org/orgApi';
import { updateUser as updateUserInState } from '@/lib/redux/authSlice';
import { User } from '@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema';
import logger from '@/lib/logger';
import { PortalSettings, FileUpload } from '../types';

export function usePortalConfiguration() {
  const dispatch = useDispatch();
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {},
  );

  const {
    data: portalData,
    isLoading: loading,
    isFetching: fetching,
    refetch,
  } = useGetPortalConfigsQuery(undefined);
  const { data: allowanceData } = useGetOrganizationAllowanceQuery();

  const [updatePortalConfigs, { isLoading: saving }] =
    useUpdatePortalConfigsMutation();

  const [settings, setSettings] = useState<PortalSettings>({
    portalName: '',
    portalLogo: null,
    portalLogoDark: null,
    portalFavicon: null,
    portalHeader: null,
    portalFooter: null,
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  });

  const [headerHtml, setHeaderHtml] = useState<string>('');
  const [footerHtml, setFooterHtml] = useState<string>('');
  const [hasMultipleOrgs, setHasMultipleOrgs] = useState<boolean>(false);

  // Helpers
  const loadPortalData = (data: any) => {
    setSettings({
      portalName: data.portalName || '',
      portalLogo: data.portalLogo || null,
      portalLogoDark: data.portalLogoDark || null,
      portalFavicon: data.portalFavicon || null,
      portalHeader: data.portalHeader || null,
      portalFooter: data.portalFooter || null,
      primaryColor: data.primaryColor || '#6366f1',
      secondaryColor: data.secondaryColor || '#8b5cf6',
    });

    if (data.portalHeader?.url) {
      fetch(data.portalHeader.url)
        .then((res) => res.text())
        .then((html) => setHeaderHtml(html))
        .catch((err) => logger.error('Failed to load header HTML:', err));
    }
    if (data.portalFooter?.url) {
      fetch(data.portalFooter.url)
        .then((res) => res.text())
        .then((html) => setFooterHtml(html))
        .catch((err) => logger.error('Failed to load footer HTML:', err));
    }
  };

  useEffect(() => {
    if (portalData) {
      loadPortalData(portalData);
    }
  }, [portalData]);

  useEffect(() => {
    if (allowanceData) {
      setHasMultipleOrgs(allowanceData.allow);
    }
  }, [allowanceData]);

  const handleFileUpload = async (file: File, type: keyof PortalSettings) => {
    if (type === 'portalFavicon' && file.size > 50000) {
      toast.error('Favicon must be smaller than 50KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData: FileUpload = {
        id: Date.now().toString(),
        name: file.name,
        url: e.target?.result as string,
        type: file.type,
        size: file.size,
      };
      setSettings((prev) => ({ ...prev, [type]: fileData }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: keyof PortalSettings) => {
    setSettings((prev) => ({ ...prev, [type]: null }));
  };

  const handleSave = async () => {
    try {
      const { ...settingsWithoutHtmlFiles } = settings;
      const payload = {
        ...settingsWithoutHtmlFiles,
        portalHeaderHtml: headerHtml,
        portalFooterHtml: footerHtml,
      };

      await updatePortalConfigs(payload).unwrap();

      const updatedUser = {
        ...user,
        organizaionInfo: {
          ...user?.organizationInfo,
          name: payload.portalName,
        },
      };
      if (user) {
        dispatch(updateUserInState(updatedUser));
      }

      toast.success('Portal settings saved successfully');
    } catch {
      toast.error('Failed to save portal settings');
    }
  };

  const generatePortalUrl = (additionalParams: string[] = []) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let url: string;

    if (hasMultipleOrgs && user?.organizationInfo?.name) {
      const orgParam = `o=${user.organizationInfo.name}`;
      const allParams = [orgParam, ...additionalParams].filter(Boolean);
      url = `${origin}/apply-jobs?${allParams.join('&')}`;
    } else {
      const allParams = additionalParams.filter(Boolean);
      url =
        allParams.length > 0
          ? `${origin}/apply-jobs?${allParams.join('&')}`
          : `${origin}/apply-jobs`;
    }

    return url;
  };

  return {
    settings,
    setSettings,
    headerHtml,
    setHeaderHtml,
    footerHtml,
    setFooterHtml,
    loading,
    saving,
    refetch,
    handleSave,
    handleFileUpload,
    removeFile,
    generatePortalUrl,
    user,
    fetching,
    hasMultipleOrgs,
  };
}
