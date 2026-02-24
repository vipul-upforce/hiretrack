import React from 'react';
import { Eye, Code } from 'lucide-react';
import { ILocalUser } from '@/lib/redux/authSlice';
import { PortalSettings } from '../../types';

interface EmbedPreviewProps {
  settings: PortalSettings;
  embedWidth: string;
  embedHeight: string;
  embedShowBorder: boolean;
  embedHideHeader: boolean;
  embedHideFooter: boolean;
  user: ILocalUser | null;
  hasMultipleOrgs: boolean;
}

export function EmbedPreview({
  settings,
  embedWidth,
  embedHeight,
  embedShowBorder,
  embedHideHeader,
  embedHideFooter,
  user,
  hasMultipleOrgs,
}: EmbedPreviewProps) {
  const generateIframeSrc = () => {
    const queryParams = [];
    queryParams.push(`hideHeader=${embedHideHeader}`);
    queryParams.push(`hideFooter=${embedHideFooter}`);

    if (hasMultipleOrgs && user?.organizationInfo?.name) {
      const orgParam = `o=${user.organizationInfo.name}`;
      const allParams = [orgParam, ...queryParams];
      return `/apply-jobs?${allParams.join('&')}`;
    }
    return `/apply-jobs?${queryParams.join('&')}`;
  };

  return (
    <div className="space-y-3">
      {/* Browser Frame */}
      <div className="rounded-lg border bg-gray-100 p-2 dark:bg-black">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 rounded bg-white px-3 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            yourwebsite.com/careers
          </div>
        </div>

        {/* Real Iframe */}
        <div className="overflow-auto rounded bg-white p-2 dark:bg-black">
          <div
            style={{
              width: embedWidth.includes('%')
                ? embedWidth
                : `${parseInt(embedWidth, 10) || 400}px`,
              height: embedHeight.includes('px')
                ? embedHeight
                : `${parseInt(embedHeight, 10) || 600}px`,
              maxWidth: '100%',
              maxHeight: '80vh',
            }}
          >
            <iframe
              src={generateIframeSrc()}
              width="100%"
              height="100%"
              frameBorder={embedShowBorder ? '1' : '0'}
              style={{
                border: embedShowBorder ? '1px solid #e5e7eb' : 'none',
                borderRadius: '8px',
                display: 'block',
              }}
              allow="camera; microphone"
              title={settings.portalName || 'Job Portal'}
            />
          </div>
        </div>
      </div>

      {/* Embed Info */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <Code className="h-3 w-3" />
          Dimensions: {embedWidth} × {embedHeight}
        </p>
        {(embedHideHeader || embedHideFooter) && (
          <p className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Hidden:{' '}
            {[embedHideHeader && 'Header', embedHideFooter && 'Footer']
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
