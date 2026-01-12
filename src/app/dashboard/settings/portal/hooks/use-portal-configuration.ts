'use client';

import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetOrganizationAllowanceQuery } from '@/lib/features/org/orgApi';
import {
  ILocalUser,
  updateUser as updateUserInState,
} from '@/lib/redux/authSlice';
import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  PortalConfigData,
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
} from '@/lib/features/settings';
import { useToast } from '@/hooks/use-toast';
import { PortalSettings, FileUpload } from '../types';

export function usePortalConfiguration() {
  const dispatch = useDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const {
    data: portalData,
    isLoading: loading,
    isFetching: fetching,
    refetch,
  } = useGetPortalConfigsQuery(undefined);

  const { data: allowanceData } = useGetOrganizationAllowanceQuery();
  const { toast } = useToast();

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

  const loadPortalData = (data: PortalConfigData) => {
    if (!data) return;

    setSettings({
      portalName: data.portalName || '',
      portalLogo: (data.portalLogo as FileUpload) || null,
      portalLogoDark: (data.portalLogoDark as FileUpload) || null,
      portalFavicon: (data.portalFavicon as FileUpload) || null,
      portalHeader: (data.portalHeader as FileUpload) || null,
      portalFooter: (data.portalFooter as FileUpload) || null,
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
      toast({
        title: 'File too large.',
        description: 'Favicon must be smaller than 50KB',
        variant: 'destructive',
      });
      return;
    }

    if (
      (type === 'portalLogo' || type === 'portalLogoDark') &&
      file.size > 2000000
    ) {
      toast({
        title: 'File too large.',
        description: 'Portal Logo must be smaller than 3MB',
        variant: 'destructive',
      });
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
    if (!settings.portalName || settings.portalName.trim() === '') {
      toast({
        title: 'Portal Name cannot be empty.',
        description: 'Please Enter valid portal name',
        variant: 'destructive',
      });
      return;
    }

    if (settings.portalName.length > 30) {
      toast({
        title: 'Portal Name too long.',
        description: 'Portal name cannot exceed 30 characters.',
        variant: 'destructive',
      });
      return;
    }

    const nameRegex = /^[a-zA-Z0-9\s-]*$/;

    if (!nameRegex.test(settings.portalName)) {
      toast({
        title:
          'Portal name contains invalid characters. Only letters, numbers, spaces, and hyphens are allowed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { ...settingsWithoutHtmlFiles } = settings;
      const payload = {
        ...settingsWithoutHtmlFiles,
        portalHeaderHtml: headerHtml,
        portalFooterHtml: footerHtml,
      };

      const response = await updatePortalConfigs(payload).unwrap();

      if (response && response.portalConfigs) {
        loadPortalData(response.portalConfigs);
      }

      const updatedUser = {
        ...user,
        organizationInfo: {
          ...user?.organizationInfo,
          name: payload.portalName,
        },
      };
      if (user) {
        dispatch(updateUserInState(updatedUser as ILocalUser));
      }

      toast({
        title: 'Settings Saved',
        description: 'Portal settings saved successfully',
        variant: 'default',
      });
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string } };
      toast({
        title: apiError?.data?.message || 'Failed to save portal settings',
        description: 'Something went wrong while saving the settings',
        variant: 'destructive',
      });
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
