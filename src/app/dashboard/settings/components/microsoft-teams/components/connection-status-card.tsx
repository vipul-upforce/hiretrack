import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, PlugZap } from 'lucide-react';

interface ConnectionStatusCardProps {
  isConnected: boolean;
  connectedEmail?: string;
  isConfigured: boolean;
  isTestingConnection: boolean;
  isDisconnecting: boolean;
  onConnect?: () => void;
  onTestConnection: () => void;
  onDisconnect: () => void;
}

export function ConnectionStatusCard({
  isConnected,
  connectedEmail,
  isConfigured,
  isTestingConnection,
  isDisconnecting,
  onConnect,
  onTestConnection,
  onDisconnect,
}: ConnectionStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Connection Status</CardTitle>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
        <CardDescription>
          {isConnected
            ? 'Microsoft Teams is connected and ready to schedule meetings'
            : 'Save your credentials and test the connection'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connectedEmail && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PlugZap className="h-4 w-4 text-purple-600" />
            Connected account: <span className="font-medium">{connectedEmail}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!isConnected && onConnect && (
            <Button
              variant="primary"
              onClick={onConnect}
              disabled={!isConfigured}
              className="w-full"
            >
              Connect Microsoft Calendar
            </Button>
          )}
          {!isConnected && (
            <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
              <p>
                <strong>Note:</strong> If you see &quot;Need admin approval&quot; error,
                ensure your admin has granted tenant-wide consent in Azure Portal
                (<strong>API permissions → Grant admin consent</strong>). After admin consent is granted,
                regular users can connect without admin approval prompts.
              </p>
            </div>
          )}
          <Button
            variant={isConnected ? 'primary' : 'outline'}
            onClick={onTestConnection}
            disabled={!isConfigured || isTestingConnection}
            className="w-full"
          >
            {isTestingConnection && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Test Connection
          </Button>
          {isConnected && (
            <Button
              variant="outline"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
