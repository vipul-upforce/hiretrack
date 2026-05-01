'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTeamsLogic } from './hooks/useTeamsLogic';
import { ReminderTemplatesCard } from './components/reminder-templates-card';
import type { SettingComponentProps } from '../setting-dialog';

export default function TeamsReminderTemplatesDialog({ onClose }: SettingComponentProps) {
  const { isLoading, isUpdating, formData, setFormData, handleSaveCredentials } =
    useTeamsLogic();

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <p className="text-sm text-muted-foreground">
          Loading Microsoft Teams reminder settings...
        </p>
      </div>
    );
  }

  if (!formData.isFollowUpReminderEnabled) {
    return (
      <Alert>
        <AlertTitle>Teams reminders are disabled</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Enable Teams follow-up reminders in Microsoft Teams settings to manage
            templates.
          </p>
          <div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ReminderTemplatesCard
      formData={formData}
      setFormData={setFormData}
      onSave={handleSaveCredentials}
      isUpdating={isUpdating}
    />
  );
}
