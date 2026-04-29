import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { CredentialsFormData } from '../types';

interface CredentialsCardProps {
  formData: CredentialsFormData;
  setFormData: (data: CredentialsFormData) => void;
  onSave: () => void;
  isUpdating: boolean;
  isConnected?: boolean;
}

export function CredentialsCard({
  formData,
  setFormData,
  onSave,
  isUpdating,
  isConnected,
}: CredentialsCardProps) {
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showBotPassword, setShowBotPassword] = useState(false);

  const handleBotReminderToggle = (checked: boolean) => {
    setFormData({ ...formData, isFollowUpReminderEnabled: checked });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Azure AD App Credentials</CardTitle>
        <CardDescription>
          Enter your Microsoft Azure AD application credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="space-y-2">
          <Label htmlFor="clientId">Application (Client) ID</Label>
          <Input
            id="clientId"
            value={formData.clientId}
            onChange={(e) =>
              setFormData({ ...formData, clientId: e.target.value })
            }
            placeholder="Enter Azure Client ID"
            disabled={isConnected}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenantId">Directory (Tenant) ID</Label>
          <Input
            id="tenantId"
            value={formData.tenantId}
            onChange={(e) =>
              setFormData({ ...formData, tenantId: e.target.value })
            }
            placeholder="Enter Azure Tenant ID"
            disabled={isConnected}
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret Value</Label>
          <div className="flex items-center gap-2">
            <Input
              id="clientSecret"
              type={showClientSecret ? 'text' : 'password'}
              value={formData.clientSecret}
              onChange={(e) =>
                setFormData({ ...formData, clientSecret: e.target.value })
              }
              placeholder="Enter Azure Client Secret Value"
              disabled={isConnected}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowClientSecret(!showClientSecret)}
              disabled={isConnected}
            >
              {showClientSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* <div className="space-y-2">
          <Label htmlFor="connectedEmail">Connected Email (Optional)</Label>
          <Input
            id="connectedEmail"
            value={formData.connectedEmail || ''}
            onChange={(e) =>
              setFormData({ ...formData, connectedEmail: e.target.value })
            }
            placeholder="Enter email for meeting creation (optional)"
            disabled={isConnected}
          />
          <p className="text-xs text-muted-foreground">
            Optional: Email address to use for creating Teams meetings. If not provided, the app will use application context.
          </p>
        </div> */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="teamsReminderToggle">
                Enable Teams Follow-up Reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Turn this on only if you want follow-up reminders in Microsoft
                Teams.
              </p>
            </div>
            <Switch
              id="teamsReminderToggle"
              checked={Boolean(formData.isFollowUpReminderEnabled)}
              onCheckedChange={handleBotReminderToggle}
            />
          </div>

          {formData.isFollowUpReminderEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="botUsername">
                  Bot User Email
                </Label>
                <Input
                  id="botUsername"
                  value={formData.botUsername || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, botUsername: e.target.value })
                  }
                  placeholder="Enter Teams account email"
                  disabled={isConnected}
                />
                <p className="text-xs text-muted-foreground">
                  Use a dedicated Microsoft user account email that will act as
                  your Teams reminder bot.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="botPassword">
                  Bot User Password
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="botPassword"
                    type={showBotPassword ? 'text' : 'password'}
                    value={formData.botPassword || ''}
                    disabled={isConnected}
                    onChange={(e) =>
                      setFormData({ ...formData, botPassword: e.target.value })
                    }
                    placeholder="Enter Teams account password"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isConnected}
                    onClick={() => setShowBotPassword(!showBotPassword)}
                    aria-label={
                      showBotPassword ? 'Hide bot password' : 'Show bot password'
                    }
                  >
                    {showBotPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the password for the same Microsoft bot account.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                This bot account should stay active and have access to the Teams
                chats where reminders need to be posted.
              </p>
            </>
          )}
        </div>

        <Button
          onClick={onSave}
          variant="primary"
          disabled={
            !formData.tenantId ||
            !formData.clientId ||
            !formData.clientSecret ||
            isUpdating
          }
          className="w-full"
        >
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Credentials
        </Button>
      </CardContent>
    </Card>
  );
}
