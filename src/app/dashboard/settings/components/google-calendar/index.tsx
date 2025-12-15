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
import { useGoogleCalendarLogic } from './hooks/useGoogleCalendarLogic';

export default function GoogleCalendarSettings({
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
  } = useGoogleCalendarLogic();

  const isConnected = data?.googleCalendar?.isConnected ?? false;
  const isConfigured = Boolean(formData.clientId && formData.clientSecret);

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
              connectedEmail={data?.googleCalendar?.connectedEmail}
              isConfigured={isConfigured}
              isTestingConnection={isTestingConnection}
              isDisconnecting={isDisconnecting}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onTestConnection={handleTestConnection}
            />

            {testResult && <TestConnectionAlert result={testResult} />}

            {isConnected && !testResult && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <Sparkles className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-300">
                  Google Calendar Connected!
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  You can now schedule Google Meet interviews directly from the
                  candidate assignment dialog. Use the &quot;Test
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
