'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';
import { SetupInstructions } from './components/setup-instructions';
import { RedirectUriCard } from './components/redirect-uri-card';
import { CredentialsCard } from './components/credentials-card';
import { ConnectionStatusCard } from './components/connection-status-card';
import { TestConnectionAlert } from './components/test-connection-alert';
import { SettingsSkeleton } from './components/settings-skeleton';
import { useTeamsLogic } from './hooks/useTeamsLogic';

export default function MicrosoftTeamsSettings({
  onClose,
}: {
  onClose: () => void;
}) {
  const { width, height } = useWindowSize();
  const {
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
  } = useTeamsLogic();

  const isConnected = data?.microsoftTeams?.isConnected ?? false;
  const isConfigured = Boolean(
    formData.tenantId && formData.clientId && formData.clientSecret,
  );

  if (showConfetti) {
    setTimeout(() => setShowConfetti(false), 5000);
  }

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} />}

      <div className="space-y-6">
        <SetupInstructions />

        {isLoading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <RedirectUriCard redirectUri={redirectUri} />

            <CredentialsCard
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveCredentials}
              isUpdating={isUpdating}
              isConnected={isConnected}
            />

            <ConnectionStatusCard
              isConnected={isConnected}
              connectedEmail={data?.microsoftTeams?.connectedEmail}
              isConfigured={isConfigured}
              isTestingConnection={isTestingConnection}
              isDisconnecting={isDisconnecting}
              onConnect={handleConnect}
              onTestConnection={handleTestConnection}
              onDisconnect={handleDisconnect}
            />

            {testResult && <TestConnectionAlert result={testResult} />}

            {isConnected && !testResult && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-300">
                  Microsoft Calendar Connected!
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  You can now schedule Microsoft Teams meetings and sync with Outlook Calendar
                  directly from the candidate assignment dialog. Use the &quot;Test
                  Connection&quot; button to verify everything is working
                  properly.
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
