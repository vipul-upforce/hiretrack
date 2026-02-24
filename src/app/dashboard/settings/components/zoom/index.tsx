"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';
import { SetupInstructions } from './components/setup-instructions';
import { CredentialsCard } from './components/credentials-card';
import { ConnectionStatusCard } from './components/connection-status-card';
import { TestConnectionAlert } from './components/test-connection-alert';
import { SettingsSkeleton } from './components/settings-skeleton';
import { useZoomLogic } from './hooks/useZoomLogic';

export default function ZoomSettings({ onClose }: { onClose: () => void }) {
  const { width, height } = useWindowSize();
  const {
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
  } = useZoomLogic();

  const isConnected = data?.zoom?.isConnected ?? false;

  useEffect(() => {
    if (!showConfetti) return undefined;
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, [showConfetti, setShowConfetti]);

  const isConfigured = Boolean(
    formData.accountId && formData.clientId && formData.clientSecret,
  );

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} />}

      <div className="space-y-6">
        <SetupInstructions isConnected={isConnected} />

        {isLoading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <CredentialsCard
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveCredentials}
              isUpdating={isUpdating}
              isConnected={isConnected}
            />

            <ConnectionStatusCard
              isConnected={isConnected}
              connectedEmail={data?.zoom?.connectedEmail}
              isConfigured={isConfigured}
              isTestingConnection={isTestingConnection}
              isDisconnecting={isDisconnecting}
              onTestConnection={handleTestConnection}
              onDisconnect={handleDisconnect}
            />

            {testResult && <TestConnectionAlert result={testResult} />}

            {isConnected && !testResult && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-300">
                  Zoom Connected!
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  You can now schedule Zoom interviews directly from the
                  candidate assignment dialog.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <Separator />

        <div className="flex justify-end gap-2 pb-5">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
