'use client';

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  ExternalLink,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

interface SetupInstructionsProps {
  /** When true, accordion is collapsed by default */
  isConnected?: boolean;
}

export function SetupInstructions({ isConnected = false }: SetupInstructionsProps) {
  /**
   * Accordion open when not connected, closed when connected.
   * Value "setup" = open, value "" = closed.
   * User can still expand manually when connected.
   */
  const [accordionValue, setAccordionValue] = useState(isConnected ? '' : 'setup');

  useEffect(() => {
    if (isConnected) {
      setAccordionValue('');
    } else {
      setAccordionValue('setup');
    }
  }, [isConnected]);

  return (
    <Accordion
      type="single"
      collapsible
      value={accordionValue}
      onValueChange={setAccordionValue}
      className="rounded-lg border bg-card shadow-sm"
    >
      <AccordionItem value="setup" className="border-0 px-4">
        <AccordionTrigger className="hover:no-underline py-5 [&[data-state=open]]:pb-2">
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Setup Instructions</h3>
              <p className="text-sm font-normal text-foreground mt-0.5">
                Zoom scheduling with Server-to-Server OAuth
              </p>
            </div>
            {isConnected && (
              <Badge variant="secondary" className="ml-2 shrink-0">
                Connected
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-5 pt-0">
          <div className="space-y-6 pl-12">
            {/* Main steps */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />
                Zoom App Marketplace Configuration
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 text-sm text-foreground">
                <li>
                  Go to{' '}
                  <a
                    href="https://marketplace.zoom.us"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Zoom App Marketplace
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Navigate to Develop → Build App</li>
                <li>Select <strong className="text-foreground">Server-to-Server OAuth</strong> and create the app</li>
                <li>Open the <strong className="text-foreground">App Credentials</strong> tab</li>
                <li>Copy the <strong className="text-foreground">Account ID</strong>, <strong className="text-foreground">Client ID</strong>, and <strong className="text-foreground">Client Secret</strong></li>
                <li>
                  Add these scopes under the <strong className="text-foreground">Scopes</strong> tab:
                  {' '}
                  <strong className="text-foreground">meeting:write:admin</strong>,{' '}
                  <strong className="text-foreground">meeting:read:admin</strong>,{' '}
                  <strong className="text-foreground">user:read:admin</strong>
                </li>
                <li>Activate the app, then save credentials here</li>
                <li>Click <strong className="text-foreground">Test Connection</strong> to verify</li>
              </ol>
            </section>

            {/* Critical requirements notice */}
            <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
              <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Critical Requirements
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                <li>Use a <strong>Server-to-Server OAuth</strong> app type (not OAuth)</li>
                <li>Ensure your Zoom account has permission to create apps</li>
                <li>
                  Required scopes:
                  {' '}
                  <strong>meeting:write:admin</strong>,{' '}
                  <strong>meeting:read:admin</strong>,{' '}
                  <strong>user:read:admin</strong>
                </li>
                <li>Activate the app before testing</li>
              </ul>
              <div className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                If connection fails, double-check scopes and that the app is active.
              </div>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
