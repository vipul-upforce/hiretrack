import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetGoogleCalendarConfigQuery,
  useUpdateGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
  useTestGoogleCalendarConnectionMutation,
} from '@/lib/features/settings';
import { CredentialsFormData, TestResult } from '../types';

export function useGoogleCalendarLogic() {
  const { toast } = useToast();

  const { data, isLoading, refetch } =
    useGetGoogleCalendarConfigQuery(undefined);

  const [updateGoogleCalendar, { isLoading: isUpdating }] =
    useUpdateGoogleCalendarMutation();
  const [disconnectGoogleCalendar, { isLoading: isDisconnecting }] =
    useDisconnectGoogleCalendarMutation();
  const [testConnection, { isLoading: isTestingConnection }] =
    useTestGoogleCalendarConnectionMutation();

  const [showConfetti, setShowConfetti] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [_authWindow, setAuthWindow] = useState<Window | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [formData, setFormData] = useState<CredentialsFormData>({
    clientId: '',
    clientSecret: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setRedirectUri(`${baseUrl}/api/auth/google/callback`);
    }
  }, []);

  useEffect(() => {
    if (data?.googleCalendar) {
      setFormData({
        clientId: data.googleCalendar.clientId || '',
        clientSecret: data.googleCalendar.clientSecret || '',
      });
    }
  }, [data]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'google-calendar-connected') {
        setShowConfetti(true);
        setAuthWindow(null);
        refetch();
        toast({
          title: 'Success!',
          description: 'Google Calendar connected successfully',
        });
        setTimeout(() => setShowConfetti(false), 5000);
      }

      if (event.data.type === 'google-calendar-error') {
        toast({
          title: 'Error',
          description: event.data.error || 'Failed to connect Google Calendar',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch, toast]);

  const handleSaveCredentials = async () => {
    try {
      await updateGoogleCalendar({
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      }).unwrap();

      toast({
        title: 'Success',
        description: 'Google Calendar credentials saved successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save credentials',
        variant: 'destructive',
      });
    }
  };

  const handleConnect = () => {
    const authUrl = '/api/auth/google/authorize';
    const authWindowFeatures = 'width=600,height=700,left=100,top=100';
    const popup = window.open(
      authUrl,
      'GoogleCalendarAuth',
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
      await disconnectGoogleCalendar({}).unwrap();
      toast({
        title: 'Disconnected',
        description: 'Google Calendar disconnected successfully',
      });
      refetch();
    } catch {
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Calendar',
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
        data: connectionData.data,
      });

      if (connectionData.success) {
        toast({
          title: 'Connection Test Passed ✅',
          description:
            connectionData.message || 'Google Calendar connection is working',
        });
      } else {
        // API returned 200 but logical failure
        toast({
          title: 'Connection Test Failed ❌',
          description:
            connectionData.details ||
            connectionData.error ||
            'Unknown error occurred',
          variant: 'destructive',
        });
      }

      // If backend signaled a status update, ensure UI reflects it
      if (connectionData.connectionStatusUpdated) {
        refetch();
      }
    } catch (error: any) {
      // 3. Handle Errors (Network, 500s, Parsing errors)

      let errorMessage = 'Network connection failed';
      let errorDetails = 'Unknown error';
      const rawResponse = undefined;

      if (error && typeof error === 'object') {
        if ('status' in error) {
          errorMessage = `HTTP ${error.status}`;
          errorDetails =
            JSON.stringify(error.data) || error.statusText || 'Server Error';

          if (
            error.data &&
            typeof error.data === 'object' &&
            'message' in error.data
          ) {
            errorMessage = (error.data as any).message;
          }
        } else if ('message' in error) {
          errorMessage = error.message;
          errorDetails = error.stack || String(error);
        }
      }

      setTestResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
        data: {
          rawResponse,
        },
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
