import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Code, Minimize2, Expand } from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { useTheme } from '@/components/theme-provider';
import { HEADER_EXAMPLE_HTML, FOOTER_EXAMPLE_HTML } from '../../constants';

interface AdvancedTabProps {
  headerHtml: string;
  setHeaderHtml: (value: string) => void;
  footerHtml: string;
  setFooterHtml: (value: string) => void;
}

export function AdvancedTab({
  headerHtml,
  setHeaderHtml,
  footerHtml,
  setFooterHtml,
}: AdvancedTabProps) {
  const { theme } = useTheme();
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState<boolean>(false);

  return (
    <div className="space-y-4">
      {/* Header HTML Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Custom Header HTML
          </CardTitle>
          <CardDescription>
            Add custom HTML content for the portal header. Use CSS variables:
            {' '}
            <code>var(--portal-primary)</code>
            {' '}
            and
            {' '}
            <code>var(--portal-secondary)</code>
            {' '}
            for dynamic colors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="headerHtml">HTML Code</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHeaderHtml(HEADER_EXAMPLE_HTML)}
                >
                  Insert Example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                >
                  {isHeaderExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height={isHeaderExpanded ? '600px' : '200px'}
                language="html"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={headerHtml}
                onChange={(value) => setHeaderHtml(value || '')}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer HTML Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Custom Footer HTML
          </CardTitle>
          <CardDescription>
            Add custom HTML content for the portal footer. Use CSS variables:
            {' '}
            <code>var(--portal-primary)</code>
            {' '}
            and
            {' '}
            <code>var(--portal-secondary)</code>
            {' '}
            for dynamic colors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="footerHtml">HTML Code</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFooterHtml(FOOTER_EXAMPLE_HTML)}
                >
                  Insert Example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFooterExpanded(!isFooterExpanded)}
                >
                  {isFooterExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height={isFooterExpanded ? '600px' : '200px'}
                language="html"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={footerHtml}
                onChange={(value) => setFooterHtml(value || '')}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
