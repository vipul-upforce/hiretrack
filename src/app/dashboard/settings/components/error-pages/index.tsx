'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPickerPopover } from '@/app/dashboard/settings/portal/components/color-picker-popover';
import { DEFAULT_ERROR_PAGE_HTML } from './constants';
import { TemplatePreview } from './components/template-preview';
import { CustomHtmlEditor } from './components/custom-html-editor';
import { useErrorPageEditor } from './hooks/useErrorPageEditor';

export interface ErrorPageSettingsProps {
  onClose: () => void;
}

export default function ErrorPageSettings({ onClose }: ErrorPageSettingsProps) {
  const {
    customHtml,
    setCustomHtml,
    supportEmail,
    setSupportEmail,
    orgName,
    setOrgName,
    orgTagline,
    setOrgTagline,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    previewHtml,
    saveCurrent,
    isLoading,
    isSaving,
  } = useErrorPageEditor();

  if (isLoading) {
    return <div className="px-6 py-6 text-sm text-muted-foreground">Loading 502 page...</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-4">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              502 page is served directly by Nginx
            </p>
            <p className="text-xs text-muted-foreground">
              Nginx will automatically serve the latest 502 page you save here.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Organization personalization
            </p>
            <p className="text-xs text-muted-foreground">
              Used by the default 502 page experience.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                placeholder="support@yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">
                Used for the &quot;Contact support&quot; button in the 502 page.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Acme Corporation"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-tagline">Maintenance Message</Label>
            <Textarea
              id="org-tagline"
              value={orgTagline}
              onChange={(event) => setOrgTagline(event.target.value)}
              placeholder="We are performing scheduled maintenance. Please check back soon."
              rows={3}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ColorPickerPopover
              label="Primary Color"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPickerPopover
              label="Secondary Color"
              value={secondaryColor}
              onChange={setSecondaryColor}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <CustomHtmlEditor value={customHtml} onChange={setCustomHtml} />
          <TemplatePreview html={previewHtml} title="Custom 502 preview" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCustomHtml(DEFAULT_ERROR_PAGE_HTML)}
          >
            Reset to default
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCustomHtml('')}
          >
            Clear editor
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="primary" onClick={saveCurrent} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save 502 Page'}
          </Button>
        </div>
      </div>
    </div>
  );
}
