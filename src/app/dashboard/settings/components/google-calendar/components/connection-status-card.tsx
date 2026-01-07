import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Calendar, Check, X, Loader2, LogOut, Shield,
} from 'lucide-react';

interface ConnectionStatusCardProps {
  isConnected: boolean;
  connectedEmail?: string;
  isConfigured: boolean;
  isTestingConnection: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onTestConnection: () => void;
}

export function ConnectionStatusCard({
  isConnected,
  connectedEmail,
  isConfigured,
  isTestingConnection,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onTestConnection,
}: ConnectionStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Connection Status
          {isConnected ? (
            <Badge
              variant="default"
              className="flex items-center gap-1 bg-green-500 text-white hover:bg-green-600"
            >
              <Check className="h-3 w-3" />
              {' '}
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <X className="h-3 w-3" />
              {' '}
              Not Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connectedEmail && (
          <div className="space-y-2">
            <Label>Connected Account</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{connectedEmail}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={onConnect}
              disabled={!isConfigured}
              className="flex-1"
              variant="primary"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Connect Google Calendar
            </Button>
          ) : (
            <>
              <Button
                onClick={onTestConnection}
                disabled={isTestingConnection}
                variant="outline"
                className="flex-1"
              >
                {isTestingConnection ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={onDisconnect}
                disabled={isDisconnecting}
                variant="outline"
                className="flex-1"
              >
                {isDisconnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
