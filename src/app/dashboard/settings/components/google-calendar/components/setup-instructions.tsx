'use client';

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
                Google Calendar integration
              </p>
            </div>

          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-5 pt-0">
          <div className="space-y-6 pl-12">
            {/* Main steps */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />
                Google Cloud Console Configuration
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 text-sm text-foreground">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Google Cloud Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Create a new project or select existing one</li>
                <li>
                  <strong className="text-foreground">Enable Google Calendar API</strong>
                  {' '}
                  in API Library
                </li>
                <li>Go to Credentials → Create Credentials → OAuth 2.0 Client IDs</li>
                <li>Set Application Type to &quot;Web application&quot;</li>
                <li>
                  <strong className="text-foreground">Add the exact redirect URI shown below</strong>
                </li>
                <li>Copy Client ID and Client Secret here</li>
                <li>Save credentials and try connecting</li>
              </ol>
            </section>

            {/* Critical requirements notice */}
            <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
              <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Critical Requirements
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                <li><strong>Enable Google Calendar API</strong> in API Library</li>
                <li><strong>Set OAuth consent screen</strong> to External (unless internal org)</li>
                <li><strong>Add test users</strong> if using external consent screen</li>
                <li><strong>Copy redirect URI exactly</strong> (no extra spaces/characters)</li>
                <li><strong>Ensure scopes include:</strong> Calendar, Calendar Events, Email</li>
              </ul>
              <div className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                If you get &quot;missing authentication credential&quot; errors, it usually means
                the Calendar API is not enabled!
              </div>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
