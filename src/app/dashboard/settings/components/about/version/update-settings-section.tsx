import { AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle, Download, Loader2 } from 'lucide-react';
import { VersionListResponse } from '../types';

export interface UpdateSettingsSectionProps {
  values: {
    enableAutoUpdate: boolean;
  };
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  isSubmitting: boolean;
  handleCheckForUpdates: () => void;
  checkingUpdatesRTK: boolean;
  updateAvailable: boolean;
  isBeta: boolean;
  versionList: VersionListResponse | null;
}

export function UpdateSettingsSection({
  values,
  setFieldValue,
  isSubmitting,
  handleCheckForUpdates,
  checkingUpdatesRTK,
  updateAvailable,
  isBeta,
  versionList,
}: UpdateSettingsSectionProps) {
  return (
    <div className="flex flex-row justify-between text-center">
      <Card className="border-none shadow-none p-0">
        <CardContent className="space-y-3 py-0 pt-6">
          <div className="flex flex-row gap-3 items-center">
            <Checkbox
              id="enableAutoUpdate"
              checked={values.enableAutoUpdate}
              onCheckedChange={(checked) => setFieldValue('enableAutoUpdate', Boolean(checked))}
              disabled={isSubmitting}
            />
            <Label htmlFor="enableAutoUpdate">Enable Auto-Update</Label>


            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              className="h-[24px] text-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>

            {isBeta && (
              <Badge variant="secondary" className="flex items-center gap-1 h-[24px] text-xs">
                BETA
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none p-0">
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckForUpdates}
              disabled={checkingUpdatesRTK}
              className="bg-transparent"
            >
              {checkingUpdatesRTK ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking for updates...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Check for updates
                </>
              )}
            </Button>
          </div>

          {!updateAvailable && versionList && (
            <div className="flex flex-row items-center w-full gap-3 border px-4 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You are running the latest version.
              </AlertDescription>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
