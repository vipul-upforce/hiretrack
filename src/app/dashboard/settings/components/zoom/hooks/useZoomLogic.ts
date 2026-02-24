import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import {
  useGetZoomConfigQuery,
  useUpdateZoomConfigMutation,
  useDisconnectZoomMutation,
  useTestZoomConnectionMutation,
} from '@/lib/features/settings';
import { CredentialsFormData, TestResult } from '../types';

export function useZoomLogic() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useGetZoomConfigQuery(undefined);

  const [updateZoom, { isLoading: isUpdating }] = useUpdateZoomConfigMutation();
  const [disconnectZoom, { isLoading: isDisconnecting }] =
    useDisconnectZoomMutation();
  const [testConnection, { isLoading: isTestingConnection }] =
    useTestZoomConnectionMutation();

  const [showConfetti, setShowConfetti] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [formData, setFormData] = useState<CredentialsFormData>({
    accountId: '',
    clientId: '',
    clientSecret: '',
  });

  useEffect(() => {
    if (data?.zoom) {
      setFormData({
        accountId: data.zoom.accountId || '',
        clientId: data.zoom.clientId || '',
        clientSecret: data.zoom.clientSecret || '',
      });
    }
  }, [data]);

  const handleSaveCredentials = async () => {
    try {
      await updateZoom({
        accountId: formData.accountId,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      }).unwrap();

      setShowConfetti(true);
      toast({
        title: 'Success',
        description: 'Zoom credentials saved successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save credentials',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectZoom({}).unwrap();
      toast({
        title: 'Disconnected',
        description: 'Zoom disconnected successfully',
      });
      refetch();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Zoom',
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
        setShowConfetti(true);
        toast({
          title: 'Connection Test Passed',
          description: connectionData.message || 'Zoom connection is working',
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
      const rawResponse = undefined;

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
        data: { rawResponse },
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
    setShowConfetti,
    testResult,
    formData,
    data,
    setFormData,
    handleSaveCredentials,
    handleDisconnect,
    handleTestConnection,
  };
}
