import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ILocalUser } from '@/lib/redux/authSlice';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { PortalSettings } from '../../types';

interface GeneralTabProps {
  settings: PortalSettings;
  setSettings: React.Dispatch<React.SetStateAction<PortalSettings>>;
  user: ILocalUser | null;
}

export function GeneralTab({ settings, setSettings, user }: GeneralTabProps) {
  const [error, setError] = useState<string | null>(null);

  const originalName = user?.organizationInfo?.name || '';

  const currentValue =
    settings.portalName !== undefined ? settings.portalName : originalName;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    const isRegexValid = /^[a-zA-Z0-9\s-]*$/.test(value);

    // Check Regex Validity
    if (!isRegexValid) {
      setError(
        'Portal name can only contain letters, numbers, spaces, and hyphens.',
      );
      return;
    }

    // Check Character Limit (Max 30)
    if (value.length > 30) {
      setError('Portal name cannot exceed 30 characters.');
      return;
    }

    // If valid, clear error and update state
    setError(null);
    setSettings((prev) => ({
      ...prev,
      portalName: value,
    }));
  };

  const handleRestore = () => {
    setSettings((prev) => ({
      ...prev,
      portalName: originalName,
    }));
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal Information</CardTitle>
        <CardDescription>Basic settings for your portal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {/* Label Row with Restore Button */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="portalName"
              className={error ? 'text-destructive' : ''}
            >
              Portal Name
            </Label>

            {currentValue === '' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                className="hover:bg-primary/10 h-6 px-2 text-xs text-primary"
                title="Restore original name"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Restore Original
              </Button>
            )}
          </div>

          <Input
            id="portalName"
            value={currentValue}
            onChange={handleNameChange}
            placeholder="Enter your portal name"
            className={
              error ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />

          {error ? (
            <div className="mt-1 flex items-center text-xs text-destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              {error}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Max 30 chars. Allowed: Letters, numbers, spaces, hyphens.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
