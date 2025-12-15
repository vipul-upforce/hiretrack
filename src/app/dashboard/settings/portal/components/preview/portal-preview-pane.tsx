import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { User } from '@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema';
import { PortalSettings } from '../../types';
import { LivePreview } from './live-preview';
import { EmbedPreview } from './embed-preview';

interface PortalPreviewPaneProps {
  activeTab: string;
  settings: PortalSettings;
  headerHtml: string;
  footerHtml: string;
  embedWidth: string;
  embedHeight: string;
  embedShowBorder: boolean;
  embedHideHeader: boolean;
  embedHideFooter: boolean;
  user: User;
  hasMultipleOrgs: boolean;
}

export function PortalPreviewPane({
  activeTab,
  settings,
  headerHtml,
  footerHtml,
  embedWidth,
  embedHeight,
  embedShowBorder,
  embedHideHeader,
  embedHideFooter,
  user,
  hasMultipleOrgs,
}: PortalPreviewPaneProps) {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {activeTab === 'embed' ? 'Embed Preview' : 'Preview'}
          </CardTitle>
          {activeTab !== 'embed' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
            >
              {previewTheme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <CardDescription>
          {activeTab === 'embed'
            ? 'Preview of how your portal will look when embedded'
            : 'Live preview of your portal settings'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeTab === 'embed' ? (
          <EmbedPreview
            settings={settings}
            embedWidth={embedWidth}
            embedHeight={embedHeight}
            embedShowBorder={embedShowBorder}
            embedHideHeader={embedHideHeader}
            embedHideFooter={embedHideFooter}
            user={user}
            hasMultipleOrgs={hasMultipleOrgs}
          />
        ) : (
          <LivePreview
            settings={settings}
            headerHtml={headerHtml}
            footerHtml={footerHtml}
            theme={previewTheme}
          />
        )}
      </CardContent>
    </Card>
  );
}
