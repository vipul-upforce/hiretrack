import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTestConnectionMutation } from '@/lib/features/settings/settingsApi';

type StorageType = 'cloudinary' | 's3' | 'smtp';

interface Credentials {
  // Cloudinary credentials
  cloud_name?: string;
  api_key?: string;
  api_secret?: string;
  // AWS credentials
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucketName?:string;
  // SMTP credentials
  user?: string;
  pass?: string;
  host?: string,
  port?: string,
  from?: string,
}

interface UseTestConnectionReturn {
  testConnection: (storageType: StorageType, credentials: Credentials) => Promise<boolean>;
  isConnectionSuccessful: boolean;
  isTesting: boolean;
  resetConnectionStatus: () => void;
}

export function useTestConnection(): UseTestConnectionReturn {
  const { toast } = useToast();
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState(false);
  const [testConnectionMutation, { isLoading: isTesting }] = useTestConnectionMutation();

  const testConnection = async (storageType: StorageType, credentials: Credentials): Promise<boolean> => {
    try {
      setIsConnectionSuccessful(false);
      
      const response = await testConnectionMutation({
        storageType,
        credentials,
      }).unwrap();

      setIsConnectionSuccessful(response.success);

      toast({
        title: response.success ? "Success" : "Error",
        description: response.message,
        variant: response.success ? "default" : "destructive",
      });
      
      return response.success;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          "Failed to test connection, " +
          (
            error as {
              data: {
                message: string;
              };
            }
          ).data?.message || "Unknown error",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const resetConnectionStatus = () => {
    setIsConnectionSuccessful(false);
  };

  return {
    testConnection,
    isConnectionSuccessful,
    isTesting,
    resetConnectionStatus,
  };
} 