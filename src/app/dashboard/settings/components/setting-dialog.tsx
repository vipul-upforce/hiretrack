'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import React from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import GeminiConfigs from './gemini';
import EmailTemplateEditor from './edit-mail-dialog';
import ManageTagsDialog from '../../jobs/[id]/components/Dialogs/manage-tags-dialog';
import AssetsDialog from './assets';
import GoogleCalendarSettings from './google-calendar';
import BackupsDialog from './backups';
import { EvaluationSettings } from './ai-evaluation-settings';
import AIProvidersConfigs from './ai-providers';
import SMTPConfigs from './mail-config';
import AboutDialog from './about';
import FileStorageOptions from './file-storage';
import twoFASettings from './two-fa';
import MultipleOrgsConfigs from './multiple-org';
import TimeZoneSelect from './time-zone';
import CaptchaSettings from './captcha';

export interface SettingComponentProps {
  onClose: () => void;
  isOpen?: boolean;
}

const settingComponents: Record<
  string,
  React.ComponentType<SettingComponentProps>
> = {
  mail: SMTPConfigs,
  fs: FileStorageOptions,
  gemini: GeminiConfigs,
  'ai-providers': AIProvidersConfigs,
  'google-calendar': GoogleCalendarSettings,
  multipleorgs: MultipleOrgsConfigs,
  backups: BackupsDialog,
  assets: AssetsDialog,
  timezone: TimeZoneSelect,
  templates: EmailTemplateEditor,
  tags: ManageTagsDialog,
  twoFA: twoFASettings,
  captcha: CaptchaSettings,
  version: AboutDialog,
};

function SettingDialog({
  isOpen,
  onClose,
  setting,
}: {
  isOpen: boolean;
  onClose: () => void;
  setting: { title: string; description: string; key: string; orgId?: string };
}) {
  const ComponentToRender = settingComponents[setting.key];
  const { user } = useAppSelector((state) => state.auth || {});
  const orgId = user?.organizationId;

  if (setting.key === 'tags')
    return <ManageTagsDialog onClose={onClose} isOpen={isOpen} orgId={orgId as string} />;

  if (setting.key === 'evaluation')
    return <EvaluationSettings onClose={onClose} isOpen={isOpen} />;

  // Helper to determine dialog size
  const getDialogSize = (key: string) => {
    switch (key) {
      case 'ai-providers':
      case 'google-calendar':
        return '2xl';
      case 'version':
        return 'xl';
      case 'backups':
        return 'lg';
      default:
        return undefined;
    }
  };

  // Helper to determine dialog class name
  const getDialogClassName = (key: string) => {
    switch (key) {
      case 'portal':
      case 'templates':
        return 'flex min-h-[95vh] w-[90vw] max-w-7xl flex-col overflow-hidden';
      case 'ai-providers':
      case 'google-calendar':
        return 'flex max-h-[90vh] flex-col overflow-hidden p-0';
      case 'timezone':
        return 'w-[90vw] max-w-2xl overflow-visible';
      case 'version':
        return 'flex max-h-[90vh] w-[100vw] flex-col overflow-hidden p-0';
      case 'mail':
        return 'hide-scrollbar flex max-h-[90vh] w-[60vw] flex-col overflow-y-auto p-0';
      default:
        return 'overflow-hidden';
    }
  };

  // Helper to render the body content
  const renderDialogBody = () => {
    if (!ComponentToRender || setting.key === 'tags') {
      return (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p>No settings available for this option.</p>
        </div>
      );
    }

    const directRenderKeys = [
      'timezone',
      'fs',
      'mail',
      'multipleorgs',
      'gemini',
      'captcha',
      'twoFA',
    ];

    if (directRenderKeys.includes(setting.key)) {
      return <ComponentToRender onClose={onClose} isOpen={isOpen} />;
    }

    if (setting.key === 'ai-providers' || setting.key === 'google-calendar') {
      return (
        <div className="flex-1 overflow-hidden overflow-y-auto px-6 py-0">
          <ComponentToRender onClose={onClose} isOpen={isOpen} />
        </div>
      );
    }

    if (setting.key === 'version') {
      return (
        <div className="flex-1 overflow-hidden overflow-y-auto py-0">
          <ComponentToRender onClose={onClose} isOpen={isOpen} />
        </div>
      );
    }

    // Default wrapper
    return (
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <ComponentToRender onClose={onClose} isOpen={isOpen} />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        size={getDialogSize(setting.key)}
        className={getDialogClassName(setting.key)}
      >
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>{setting.title}</DialogTitle>
          <DialogDescription>{setting.description}</DialogDescription>
        </DialogHeader>

        {renderDialogBody()}
      </DialogContent>
    </Dialog>
  );
}

export default SettingDialog;
