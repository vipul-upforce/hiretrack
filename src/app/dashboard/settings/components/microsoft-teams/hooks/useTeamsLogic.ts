import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import {
  useGetMicrosoftTeamsConfigQuery,
  useUpdateMicrosoftTeamsConfigMutation,
  useDisconnectMicrosoftTeamsMutation,
  useTestMicrosoftTeamsConnectionMutation,
} from '@/lib/features/settings';
import { CredentialsFormData, TestResult } from '../types';
import { normalizeTeamsReminderTemplates } from '@/lib/microsoft-teams/reminderTemplates';

export function useTeamsLogic() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useGetMicrosoftTeamsConfigQuery(undefined);

  const [updateTeams, { isLoading: isUpdating }] =
    useUpdateMicrosoftTeamsConfigMutation();
  const [disconnectTeams, { isLoading: isDisconnecting }] =
    useDisconnectMicrosoftTeamsMutation();
  const [testConnection, { isLoading: isTestingConnection }] =
    useTestMicrosoftTeamsConnectionMutation();

  const [showConfetti, setShowConfetti] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [_authWindow, setAuthWindow] = useState<Window | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [formData, setFormData] = useState<CredentialsFormData>({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    connectedEmail: '',
    isFollowUpReminderEnabled: false,
    followUpReminderOffsetMinutes: 5,
    botUsername: '',
    botPassword: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setRedirectUri(`${baseUrl}/api/auth/microsoft/callback`);
    }
  }, []);

  useEffect(() => {
    if (data?.microsoftTeams) {
      setFormData({
        tenantId: data.microsoftTeams.tenantId || '',
        clientId: data.microsoftTeams.clientId || '',
        clientSecret: data.microsoftTeams.clientSecret || '',
        connectedEmail: data.microsoftTeams.connectedEmail || '',
        isFollowUpReminderEnabled:
          data.microsoftTeams.isFollowUpReminderEnabled || false,
        followUpReminderOffsetMinutes:
          data.microsoftTeams.followUpReminderOffsetMinutes ?? 5,
        botUsername: data.microsoftTeams.botUsername || '',
        botPassword: data.microsoftTeams.botPassword || '',
        messageTemplates: normalizeTeamsReminderTemplates(
          data.microsoftTeams.messageTemplates,
        ),
      });
    }
  }, [data]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'microsoft-calendar-connected') {
        setShowConfetti(true);
        setAuthWindow(null);
        refetch();
        toast({
          title: 'Success!',
          description: 'Microsoft Calendar connected successfully',
        });
        setTimeout(() => setShowConfetti(false), 5000);
      }

      if (event.data.type === 'microsoft-calendar-error') {
        toast({
          title: 'Error',
          description: event.data.error || 'Failed to connect Microsoft Calendar',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch, toast]);

  const handleSaveCredentials = async () => {
    try {
      await updateTeams({
        tenantId: formData.tenantId,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        connectedEmail: formData.connectedEmail,
        isFollowUpReminderEnabled: formData.isFollowUpReminderEnabled || false,
        followUpReminderOffsetMinutes:
          formData.followUpReminderOffsetMinutes ?? 5,
        botUsername: formData.botUsername,
        botPassword: formData.botPassword,
        messageTemplates: formData.messageTemplates,
      }).unwrap();

      toast({
        title: 'Success',
        description: 'Microsoft Teams credentials saved successfully',
      });
      refetch();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save credentials',
        variant: 'destructive',
      });
    }
  };

  const handleConnect = (_useAdminConsent = false) => {
    // Always use regular OAuth flow - admin consent should be granted in Azure Portal
    // If admin consent is already granted, users can connect directly
    const authUrl = '/api/auth/microsoft/authorize';
    const authWindowFeatures = 'width=600,height=700,left=100,top=100';
    const popup = window.open(
      authUrl,
      'MicrosoftCalendarAuth',
      authWindowFeatures,
    );
    setAuthWindow(popup);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    try {
      await disconnectTeams({}).unwrap();
      toast({
        title: 'Disconnected',
        description: 'Microsoft Calendar disconnected successfully',
      });
      refetch();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Microsoft Calendar',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);

    try {
      const connectionData = await testConnection().unwrap();

      setTestResult({
        success: connectionData.success || false,
        message:
          connectionData.message ||
          connectionData.error ||
          'Connection successful',
        details: connectionData.details,
        data: connectionData.data as TestResult['data'],
      });

      if (connectionData.success) {
        toast({
          title: 'Connection Test Passed',
          description:
            connectionData.message || 'Microsoft Teams connection is working',
        });
      } else {
        toast({
          title: 'Connection Test Failed',
          description:
            connectionData.details ||
            connectionData.error ||
            'Unknown error occurred',
          variant: 'destructive',
        });
      }

      if (connectionData.connectionStatusUpdated) {
        refetch();
      }
    } catch (error: unknown) {
      let errorMessage = 'Network connection failed';
      let errorDetails = 'Unknown error';

      if (error && typeof error === 'object') {
        if ('status' in error) {
          const fetchError = error as FetchBaseQueryError;
          errorMessage = `HTTP ${fetchError.status}`;
          errorDetails =
            JSON.stringify(fetchError.data) ||
            (fetchError as { statusText?: string }).statusText ||
            'Server Error';

          if (
            fetchError.data &&
            typeof fetchError.data === 'object' &&
            'message' in fetchError.data
          ) {
            const errorData = fetchError.data as { message?: string };
            errorMessage = errorData.message || errorMessage;
          }
        } else if ('message' in error) {
          const serializedError = error as SerializedError | Error;
          errorMessage = serializedError.message || 'Unknown error occurred';
          errorDetails =
            'stack' in serializedError && serializedError.stack
              ? serializedError.stack
              : String(error);
        }
      }

      setTestResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
        data: { rawResponse: errorDetails },
      });

      toast({
        title: 'Connection Test Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return {
    isLoading,
    isUpdating,
    isDisconnecting,
    isTestingConnection,
    showConfetti,
    redirectUri,
    testResult,
    formData,
    data,
    setFormData,
    setShowConfetti,
    handleSaveCredentials,
    handleConnect,
    handleDisconnect,
    handleTestConnection,
  };
}
