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
  onTestConnection: () => void;
  onDisconnect: () => void;
}

export function ConnectionStatusCard({
  isConnected,
  connectedEmail,
  isConfigured,
  isTestingConnection,
  isDisconnecting,
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
            ? 'Zoom is connected and ready to schedule meetings'
            : 'Save your credentials and test the connection'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connectedEmail && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PlugZap className="h-4 w-4 text-green-600" />
            Connected account: <span className="font-medium">{connectedEmail}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="primary"
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
