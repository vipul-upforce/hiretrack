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
import ManageTagsDialog from '../../jobs/[id]/components/Dialogs/manage-tags-dialog';
import AssetsDialog from './assets';
import GoogleCalendarSettings from './google-calendar';
import ZoomSettings from './zoom';
import MicrosoftTeamsSettings from './microsoft-teams';
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
import { EmailTemplateEditor } from '../templates/components/email-template-editor/EmailTemplateEditor';
import EmailCommunicationSettings from './communication/email-settings';
import AICommunicationSettings from './communication/ai-settings';
import MeetingCommunicationSettings from './communication/meeting-settings';

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
  zoom: ZoomSettings,
  'microsoft-teams': MicrosoftTeamsSettings,
  'communication-email': EmailCommunicationSettings,
  'communication-ai': AICommunicationSettings,
  'communication-meetings': MeetingCommunicationSettings,
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
    return (
      <ManageTagsDialog
        onClose={onClose}
        isOpen={isOpen}
        orgId={orgId as string}
      />
    );

  if (setting.key === 'evaluation')
    return <EvaluationSettings onClose={onClose} isOpen={isOpen} />;

  // Helper to determine dialog size
  const getDialogSize = (key: string) => {
    switch (key) {
      case 'fs':
        return 'lg';
      case 'ai-providers':
      case 'google-calendar':
      case 'zoom':
      case 'microsoft-teams':
      case 'communication-email':
      case 'communication-ai':
      case 'communication-meetings':
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
      case 'communication-email':
        return 'hide-scrollbar flex h-[80vh] max-h-[80vh] w-[30vw] max-w-2xl flex-col overflow-hidden overflow-y-auto p-0';
      case 'communication-ai':
      case 'communication-meetings':
        return 'flex h-[90vh] max-h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden p-0';
      case 'fs':
        return 'flex max-h-[90vh] w-[70vw] max-w-3xl flex-col overflow-hidden p-0';
      case 'ai-providers':
      case 'google-calendar':
      case 'zoom':
      case 'microsoft-teams':
        return 'flex max-h-[90vh] flex-col overflow-hidden p-0';
      case 'timezone':
        return 'w-[90vw] max-w-2xl overflow-visible';
      case 'version':
        return 'flex max-h-[90vh] w-[100vw] flex-col overflow-hidden p-0';
      case 'mail':
        return 'hide-scrollbar flex max-h-[90vh] min-w-[50vw] flex-col overflow-hidden p-0';
      case 'captcha':
        return 'hide-scrollbar flex max-h-[90vh] min-w-[50vw] flex-col overflow-hidden p-0';
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

    if (
      setting.key === 'communication-email' ||
      setting.key === 'communication-ai' ||
      setting.key === 'communication-meetings'
    ) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ComponentToRender onClose={onClose} isOpen={isOpen} />
        </div>
      );
    }

    if (
      setting.key === 'ai-providers' ||
      setting.key === 'google-calendar' ||
      setting.key === 'zoom' ||
      setting.key === 'microsoft-teams'
    ) {
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
