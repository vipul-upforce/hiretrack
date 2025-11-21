"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Save,
  Settings,
  ImageIcon,
  PaintBucket,
  FileCode,
  Code,
  Home,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePortalConfiguration } from "./hooks/use-portal-configuration";
import { GeneralTab } from "./components/tabs/general-tab";
import { BrandingTab } from "./components/tabs/branding-tab";
import { ColorsTab } from "./components/tabs/colors-tab";
import { AdvancedTab } from "./components/tabs/advanced-tab";
import { EmbedTab } from "./components/tabs/embed-tab";
import { PortalPreviewPane } from "./components/preview/portal-preview-pane";

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
    fetching
  } = usePortalConfiguration();

  const [activeTab, setActiveTab] = useState<string>("general");

  const [embedWidth, setEmbedWidth] = useState<string>("100%");
  const [embedHeight, setEmbedHeight] = useState<string>("600px");
  const [embedShowBorder, setEmbedShowBorder] = useState<boolean>(true);
  const [embedHideHeader, setEmbedHideHeader] = useState<boolean>(false);
  const [embedHideFooter, setEmbedHideFooter] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading portal settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            <div className="flex flex-col gap-2">
              <nav className="flex items-center text-sm text-muted-foreground font-medium">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <Link
                  href="/dashboard/settings"
                  className="hover:text-foreground transition-colors"
                >
                  Settings
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-foreground font-semibold">
                  Portal Configuration
                </span>
              </nav>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex gap-2">
                <Button variant="outline" disabled={fetching} onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {fetching ? "Refreshing...": "Refresh"}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tabs */}
          <div className="lg:col-span-2 space-y-6">
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
                  <Settings className="h-4 w-4" />
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
                  removeFile={removeFile}
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
