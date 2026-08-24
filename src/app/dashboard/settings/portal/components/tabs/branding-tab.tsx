import React from 'react';
import { PortalSettings } from '../../types';
import { FileUploadCard } from '../file-upload-card';

interface BrandingTabProps {
  settings: PortalSettings;
  handleFileUpload: (file: File, type: keyof PortalSettings) => Promise<void>;
  removeFile: (file: string) => void;
}

export function BrandingTab({
  settings,
  handleFileUpload,
  removeFile,
}: BrandingTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FileUploadCard
        title="Light Theme Logo"
        description="Logo for light theme"
        file={settings.portalLogo}
        type="portalLogo"
        handleFileUpload={handleFileUpload}
        removeFile={removeFile}
      />
      <FileUploadCard
        title="Dark Theme Logo"
        description="Logo for dark theme"
        file={settings.portalLogoDark}
        type="portalLogoDark"
        handleFileUpload={handleFileUpload}
        removeFile={removeFile}
      />
      <FileUploadCard
        title="Favicon"
        description="Browser tab icon (32x32 max)"
        file={settings.portalFavicon}
        type="portalFavicon"
        accept="image/x-icon,image/png"
        maxSize="32x32"
        handleFileUpload={handleFileUpload}
        removeFile={removeFile}
      />
    </div>
  );
}
