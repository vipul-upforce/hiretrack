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
  ShieldCheck,
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
                Microsoft Teams scheduling with Microsoft Graph API
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
                Azure Portal Configuration
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 text-sm text-foreground">
                <li>
                  Go to{' '}
                  <a
                    href="https://portal.azure.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Azure Portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  Navigate to <strong className="text-foreground">Azure Active Directory</strong>
                  {' → '}
                  <strong className="text-foreground">App registrations</strong>
                </li>
                <li>Click <strong className="text-foreground">New registration</strong> to create a new app</li>
                <li>Enter a name for your app and select your account type</li>
                <li>After registration, go to <strong className="text-foreground">Certificates & secrets</strong></li>
                <li>Create a new <strong className="text-foreground">Client secret</strong> and copy the value</li>
                <li>
                  Go to <strong className="text-foreground">Authentication</strong> and add the redirect URI
                  shown below
                </li>
                <li>
                  Go to <strong className="text-foreground">API permissions</strong> and add:
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li><strong className="text-foreground">Calendars.ReadWrite</strong> (Delegated)</li>
                    <li><strong className="text-foreground">User.Read</strong> (Delegated)</li>
                    <li><strong className="text-foreground">User.ReadWrite</strong> (Delegated)</li>
                    <li><strong className="text-foreground">OnlineMeetings.ReadWrite</strong> (Delegated)</li>
                    <li><strong className="text-foreground">OnlineMeetings.Read</strong> (Delegated)</li>
                    <li><strong className="text-foreground">offline_access</strong> (Delegated)</li>
                    <li><strong className="text-foreground">openid</strong> (Delegated)</li>
                    <li><strong className="text-foreground">profile</strong> (Delegated)</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">CRITICAL:</strong> Click{' '}
                  <strong className="text-foreground">Grant admin consent</strong> for your organization.
                  <span className="text-destructive font-medium">
                    {' '}Without this, users will see &quot;Need admin approval&quot; error.
                  </span>
                </li>
                <li>Copy the <strong className="text-foreground">Application (client) ID</strong> and <strong className="text-foreground">Directory (tenant) ID</strong></li>
                <li>Enter credentials below and click <strong className="text-foreground">Save Credentials</strong></li>
                <li>Click <strong className="text-foreground">Connect Microsoft Calendar</strong> to authorize</li>
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
                <li>Use <strong>Delegated permissions</strong> for Calendar (Calendars.ReadWrite, User.Read)</li>
                <li>Use <strong>Application permissions</strong> for Teams (OnlineMeetings.ReadWrite)</li>
                <li>Ensure you have admin rights to grant permissions</li>
                <li>Grant admin consent after adding permissions</li>
                <li>Add the redirect URI to Authentication before connecting</li>
              </ul>
            </section>

            {/* Admin approval troubleshooting */}
            <section className="rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-900/30 dark:bg-red-950/20">
              <h4 className="text-sm font-medium flex items-center gap-2 text-red-800 dark:text-red-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                &quot;Need admin approval&quot; troubleshooting
              </h4>
              <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-red-800/90 dark:text-red-300/90">
                <li>Verify admin consent in Azure Portal: <strong>API permissions → Grant admin consent</strong></li>
                <li>Check that the admin used the correct app registration (verify Client ID)</li>
                <li>Ensure the app is in the same tenant as your account</li>
                <li>Wait a few minutes for changes to propagate after admin consent</li>
                <li>Try disconnecting and reconnecting after admin consent</li>
              </ul>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
