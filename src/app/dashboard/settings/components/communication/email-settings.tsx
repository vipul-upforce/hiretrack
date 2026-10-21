'use client';

import SMTPConfigs from '../mail-config';
import type { SettingComponentProps } from '../setting-dialog';

export default function EmailCommunicationSettings({
  onClose,
}: SettingComponentProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SMTPConfigs onClose={onClose} />
      </div>
    </div>
  );
}
