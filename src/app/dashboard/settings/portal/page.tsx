'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ImageIcon,
  PaintBucket,
  FileCode,
  Code,
  Home,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePortalConfiguration } from './hooks/use-portal-configuration';
import { GeneralTab } from './components/tabs/general-tab';
import { BrandingTab } from './components/tabs/branding-tab';
import { ColorsTab } from './components/tabs/colors-tab';
import { AdvancedTab } from './components/tabs/advanced-tab';
import { EmbedTab } from './components/tabs/embed-tab';
import { PortalPreviewPane } from './components/preview/portal-preview-pane';

export default function PortalConfigurationPage() {
  const {
    settings,
    setSettings,
    headerHtml,
    setHeaderHtml,
    footerHtml,
    setFooterHtml,
    loading,
    saving,
    refetch,
    handleSave,
    handleFileUpload,
    removeFile,
    generatePortalUrl,
    user,
    hasMultipleOrgs,
    fetching,
  } = usePortalConfiguration();

  const [activeTab, setActiveTab] = useState<string>('general');

  const [embedWidth, setEmbedWidth] = useState<string>('100%');
  const [embedHeight, setEmbedHeight] = useState<string>('600px');
  const [embedShowBorder, setEmbedShowBorder] = useState<boolean>(true);
  const [embedHideHeader, setEmbedHideHeader] = useState<boolean>(false);
  const [embedHideFooter, setEmbedHideFooter] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading portal settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <nav className="flex items-center text-sm font-medium text-muted-foreground">
                <Link
                  href="/dashboard"
                  className="flex items-center transition-colors hover:text-foreground"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
                <ChevronRight className="mx-2 h-4 w-4" />
                <Link
                  href="/dashboard/settings"
                  className="transition-colors hover:text-foreground"
                >
                  Settings
                </Link>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span className="font-semibold text-foreground">
                  Portal Configuration
                </span>
              </nav>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={fetching}
                  onClick={() => refetch()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {fetching ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Tabs */}
          <div className="space-y-6 lg:col-span-2">
            <Tabs
              defaultValue="general"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="general"
                  className="flex items-center gap-2"
                >
                  <SettingsIcon className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="branding"
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <PaintBucket className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="flex items-center gap-2"
                >
                  <FileCode className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="embed" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <GeneralTab
                  settings={settings}
                  setSettings={setSettings}
                  user={user}
                />
              </TabsContent>

              <TabsContent value="branding" className="space-y-4">
                <BrandingTab
                  settings={settings}
                  handleFileUpload={handleFileUpload}
                  removeFile={(key: string) =>
                    removeFile(key as keyof typeof settings)
                  }
                />
              </TabsContent>

              <TabsContent value="colors" className="space-y-4">
                <ColorsTab settings={settings} setSettings={setSettings} />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <AdvancedTab
                  headerHtml={headerHtml}
                  setHeaderHtml={setHeaderHtml}
                  footerHtml={footerHtml}
                  setFooterHtml={setFooterHtml}
                />
              </TabsContent>

              <TabsContent value="embed" className="space-y-4">
                <EmbedTab
                  settings={settings}
                  embedWidth={embedWidth}
                  setEmbedWidth={setEmbedWidth}
                  embedHeight={embedHeight}
                  setEmbedHeight={setEmbedHeight}
                  embedShowBorder={embedShowBorder}
                  setEmbedShowBorder={setEmbedShowBorder}
                  embedHideHeader={embedHideHeader}
                  setEmbedHideHeader={setEmbedHideHeader}
                  embedHideFooter={embedHideFooter}
                  setEmbedHideFooter={setEmbedHideFooter}
                  generatePortalUrl={generatePortalUrl}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-4">
            <PortalPreviewPane
              activeTab={activeTab}
              settings={settings}
              headerHtml={headerHtml}
              footerHtml={footerHtml}
              embedWidth={embedWidth}
              embedHeight={embedHeight}
              embedShowBorder={embedShowBorder}
              embedHideHeader={embedHideHeader}
              embedHideFooter={embedHideFooter}
              user={user}
              hasMultipleOrgs={hasMultipleOrgs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
