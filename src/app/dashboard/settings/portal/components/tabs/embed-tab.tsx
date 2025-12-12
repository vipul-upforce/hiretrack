import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Code, Check, Copy, ExternalLink,
} from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { PortalSettings } from '../../types';

interface EmbedTabProps {
  settings: PortalSettings;
  embedWidth: string;
  setEmbedWidth: (val: string) => void;
  embedHeight: string;
  setEmbedHeight: (val: string) => void;
  embedShowBorder: boolean;
  setEmbedShowBorder: (val: boolean) => void;
  embedHideHeader: boolean;
  setEmbedHideHeader: (val: boolean) => void;
  embedHideFooter: boolean;
  setEmbedHideFooter: (val: boolean) => void;
  generatePortalUrl: (params: string[]) => string | undefined;
}

export function EmbedTab({
  settings,
  embedWidth,
  setEmbedWidth,
  embedHeight,
  setEmbedHeight,
  embedShowBorder,
  setEmbedShowBorder,
  embedHideHeader,
  setEmbedHideHeader,
  embedHideFooter,
  setEmbedHideFooter,
  generatePortalUrl,
}: EmbedTabProps) {
  const { theme } = useTheme();
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const getEmbedCode = () => {
    const queryParams = [];
    if (embedHideHeader) queryParams.push('hideHeader=true');
    if (embedHideFooter) queryParams.push('hideFooter=true');

    const embedUrl = generatePortalUrl(queryParams);

    return `<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  ${embedShowBorder ? '' : 'frameborder="0"'}
  style="${embedShowBorder ? 'border: 1px solid #e5e7eb;' : 'border: none;'} border-radius: 8px;"
  allow="camera; microphone"
  title="${settings.portalName || 'Job Portal'}"
></iframe>`;
  };

  const handleCopy = () => {
    const embedCode = getEmbedCode();
    navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Embed code copied to clipboard!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Embed Configuration
        </CardTitle>
        <CardDescription>
          Generate an iframe embed code to integrate your candidate portal into
          any website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Embed Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Embed Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="embedWidth">Width</Label>
              <Input
                id="embedWidth"
                value={embedWidth}
                onChange={(e) => setEmbedWidth(e.target.value)}
                placeholder="100% or 800px"
              />
              <p className="text-xs text-muted-foreground">
                Set width in pixels (e.g., 800px) or percentage (e.g., 100%)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="embedHeight">Height</Label>
              <Input
                id="embedHeight"
                value={embedHeight}
                onChange={(e) => setEmbedHeight(e.target.value)}
                placeholder="600px"
              />
              <p className="text-xs text-muted-foreground">
                Set height in pixels (e.g., 600px)
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="embedShowBorder"
                checked={embedShowBorder}
                onChange={(e) => setEmbedShowBorder(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="embedShowBorder">Show border around iframe</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="embedHideHeader"
                checked={embedHideHeader}
                onChange={(e) => setEmbedHideHeader(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="embedHideHeader">Hide portal header</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="embedHideFooter"
                checked={embedHideFooter}
                onChange={(e) => setEmbedHideFooter(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="embedHideFooter">Hide portal footer</Label>
            </div>
          </div>
        </div>

        {/* Generated Embed Code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Generated Embed Code</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="200px"
              language="html"
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              value={getEmbedCode()}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: false,
                readOnly: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Integration Instructions</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <span className="font-semibold">1.</span>
              <p>
                Copy the embed code above by clicking the &quot;Copy Code&quot; button.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">2.</span>
              <p>
                Paste the code into your website&apos;s HTML where you want the
                portal to appear.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">3.</span>
              <p>
                Adjust the width and height settings to fit your website&apos;s
                design.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">4.</span>
              <p>
                The portal will automatically inherit your configured branding
                and colors.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Security Notice
          </h4>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Make sure to only embed this portal on trusted domains. The iframe
            allows camera and microphone access for video interviews. You can
            configure additional security settings like allowed domains in your
            organization settings.
          </p>
        </div>

        {/* Test Link */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              const queryParams = [];
              if (embedHideHeader) queryParams.push('hideHeader=true');
              if (embedHideFooter) queryParams.push('hideFooter=true');
              const url = generatePortalUrl(queryParams);
              if (url) window.open(url, '_blank');
            }}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Portal in New Tab (with current settings)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
