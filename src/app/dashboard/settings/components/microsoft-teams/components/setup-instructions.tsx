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
  ShieldCheck,
  AlertTriangle,
  Users,
  CalendarCheck,
  Copy,
  Check,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SetupInstructionsProps {
  /** When true, accordion is collapsed by default */
  isConnected?: boolean;
}

/** Small inline code block with one-click copy */
function InlineCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
      title="Click to copy"
    >
      {children}
      {copied ? (
        <Check className="h-2.5 w-2.5 text-green-600" />
      ) : (
        <Copy className="h-2.5 w-2.5 opacity-40" />
      )}
    </button>
  );
}

/** Copyable code block for multi-line commands */
function CopyBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable
    }
  };

  return (
    <div className="group relative mt-1 rounded bg-amber-100/60 dark:bg-amber-900/30 p-2.5 pr-9 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
      {children}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded bg-amber-200/80 dark:bg-amber-800/60  transition-opacity hover:bg-amber-300 dark:hover:bg-amber-700"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-amber-800 dark:text-amber-200" />
        )}
      </button>
    </div>
  );
}

export function SetupInstructions({
  isConnected = false,
}: SetupInstructionsProps) {
  const delegatedPermissions = [
    'Calendars.Read',
    'Calendars.ReadWrite',
    'Chat.Create',
    'Chat.ReadWrite',
    'ChatMessage.Send',
    'OnlineMeetings.Read',
    'OnlineMeetings.ReadWrite',
    'User.Read',
    'User.Read.All',
    'User.ReadWrite',
    'offline_access',
    'openid',
    'profile',
  ];

  const applicationPermissions = [
    'Calendars.Read',
    'Calendars.ReadBasic.All',
    'Calendars.ReadWrite',
    'Chat.Create',
    'Chat.ReadWrite.All',
    'OnlineMeetings.Read.All',
    'OnlineMeetings.ReadWrite.All',
    'TeamsAppInstallation.ReadWriteForUser.All',
    'Teamwork.Migrate.All',
    'User.Read.All',
  ];

  const [accordionValue, setAccordionValue] = useState(
    isConnected ? '' : 'setup',
  );

  useEffect(() => {
    setAccordionValue(isConnected ? '' : 'setup');
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
                Microsoft Teams & Outlook calendar setup via Microsoft Graph API
              </p>
            </div>

          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-5 pt-0">
          <div className="space-y-6 pl-12">
            {/* ───── Step 1: Azure App Registration ───── */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />
                Step 1 &mdash; Azure App Registration
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
                  </a>{' '}
                  &rarr;{' '}
                  <strong className="text-foreground">
                    Microsoft Entra ID (Azure AD)
                  </strong>{' '}
                  &rarr;{' '}
                  <strong className="text-foreground">App registrations</strong>
                </li>
                <li>
                  Click{' '}
                  <strong className="text-foreground">New registration</strong>,
                  name your app (e.g.{' '}
                  <InlineCode>HireTrack Teams</InlineCode>), select your account
                  type
                </li>
                <li>
                  After registration, go to{' '}
                  <strong className="text-foreground">
                    Certificates & secrets
                  </strong>{' '}
                  &rarr; create a{' '}
                  <strong className="text-foreground">Client secret</strong> and
                  copy the value
                </li>
                <li>
                  Go to{' '}
                  <strong className="text-foreground">Authentication</strong>{' '}
                  and add the{' '}
                  <strong className="text-foreground">Redirect URI</strong>{' '}
                  shown below
                </li>
                <li>
                  Copy the{' '}
                  <strong className="text-foreground">
                    Application (client) ID
                  </strong>{' '}
                  and{' '}
                  <strong className="text-foreground">
                    Directory (tenant) ID
                  </strong>
                </li>
              </ol>
            </section>

            <Separator />

            {/* ───── Step 2: API Permissions ───── */}
            <section className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Step 2 &mdash; API Permissions
              </h4>

              <p className="text-sm text-muted-foreground">
                HireTrack sends meeting invitations{' '}
                <strong className="text-foreground">
                  as the initiator (organizer)
                </strong>
                . When the initiator is the connected account, delegated
                permissions are used. When the initiator is a{' '}
                <em>different user in your tenant</em>, application permissions
                are required.
              </p>

              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                          Permission Type
                        </th>

                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                          Required Microsoft Graph Permissions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b align-top">
                        <td className="px-3 py-3 font-medium text-foreground dark:text-foreground">
                          Delegated
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {delegatedPermissions.map(permission => (
                              <span
                                key={permission}
                                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                      <tr className="align-top">
                        <td className="px-3 py-3 font-medium text-foreground dark:text-foreground">
                          Application
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {applicationPermissions.map(permission => (
                              <span
                                key={permission}
                                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admin consent */}
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 dark:border-red-900/30 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  After adding all permissions, click{' '}
                  <strong>Grant admin consent</strong> for your organization.
                  <span className="block mt-1 font-normal text-xs text-red-700/80 dark:text-red-400/80">
                    Without this, users will see &quot;Need admin approval&quot;
                    error.
                  </span>
                </p>
              </div>
            </section>

            <Separator />

            {/* ───── Step 3: Teams Application Access Policy ───── */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Step 3 &mdash; Teams Application Access Policy
              </h4>
              <p className="text-sm text-muted-foreground">
                Even after granting all permissions in Azure, Microsoft
                Teams requires an{' '}
                <strong className="text-foreground">
                  Application Access Policy
                </strong>{' '}
                so the app can create and manage online meetings on behalf
                of users. A Teams admin must run these commands.
              </p>

              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  PowerShell commands (run as Teams admin)
                </h5>
                <ol className="list-decimal list-inside space-y-3 text-xs text-amber-900 dark:text-amber-200">
                  <li>
                    Install the Microsoft Teams module:
                    <CopyBlock>Install-Module -Name MicrosoftTeams -Force -AllowClobber</CopyBlock>
                  </li>
                  <li>
                    Connect to Microsoft Teams:
                    <CopyBlock>Connect-MicrosoftTeams</CopyBlock>
                    <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                      If you get an execution policy error, run this
                      first:
                    </p>
                    <CopyBlock>Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser</CopyBlock>
                  </li>
                  <li>
                    Create the Application Access Policy for HireTrack
                    (replace the Application (Client) ID with your Application (Client) ID):
                    <CopyBlock>{`New-CsApplicationAccessPolicy -Identity "HireTrack-Teams-Policy" -AppIds "<Application (Client) ID>" -Description "Allow HireTrack App to manage online meetings for users."`}</CopyBlock>
                  </li>
                  <li>
                    Apply the policy to the entire organization:
                    <CopyBlock>{`Grant-CsApplicationAccessPolicy -PolicyName "HireTrack-Teams-Policy" -Global`}</CopyBlock>
                  </li>
                </ol>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Without this policy, you will see{' '}
                  <strong>
                    403 &quot;No application access policy found for this
                    app&quot;
                  </strong>{' '}
                  when scheduling Teams meetings or creating Outlook
                  events via initiatorEmail.
                </p>
              </div>
            </section>

            <Separator />

            {/* ───── Step 4: Connect & Test ───── */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CalendarCheck className="h-3.5 w-3.5" />
                Step 4 &mdash; Connect & Verify
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                <li>
                  Enter{' '}
                  <strong className="text-foreground">Tenant ID</strong>,{' '}
                  <strong className="text-foreground">Client ID</strong>, and{' '}
                  <strong className="text-foreground">Client Secret Value</strong>{' '}
                  below and click{' '}
                  <strong className="text-foreground">Save Credentials</strong>
                </li>
                <li>
                  Click{' '}
                  <strong className="text-foreground">
                    Connect Microsoft Calendar
                  </strong>{' '}
                  to authorize the connected account (delegated permissions)
                </li>
                <li>
                  Click{' '}
                  <strong className="text-foreground">Test Connection</strong>{' '}
                  to verify everything works
                </li>
                <li>
                  Schedule a test meeting with the initiator set to the
                  connected account, then try with a{' '}
                  <em>different</em> team member to confirm application
                  permissions
                </li>
              </ol>
            </section>

            <Separator />

            {/* ───── Troubleshooting ───── */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Troubleshooting
              </h4>
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                <ul className="space-y-2 text-sm text-red-800/90 dark:text-red-300/90">
                  <li>
                    <strong>&quot;Need admin approval&quot;</strong> &mdash;
                    Ensure admin consent is granted in Azure &rarr; API
                    permissions &rarr; Grant admin consent. Wait a few minutes,
                    then disconnect & reconnect.
                  </li>
                  <li>
                    <strong>403 on schedule/update/cancel</strong> &mdash; If
                    using application permissions, verify Exchange Application
                    Access Policy (Step 3) allows your app for the
                    initiator&apos;s mailbox.
                  </li>
                  <li>
                    <strong>404 User not found</strong> &mdash; The
                    initiatorEmail must belong to a user in your Azure AD tenant.
                    ensure{' '}
                    <InlineCode>User.Read.All</InlineCode> is granted.
                  </li>
                  <li>
                    <strong>Meeting scheduled but no Outlook invite</strong>{' '}
                    &mdash; Verify{' '}
                    <InlineCode>Calendars.ReadWrite.All</InlineCode> (application)
                    is granted and Exchange policy allows the app for that
                    mailbox.
                  </li>
                  <li>
                    <strong>Update/cancel not reflecting</strong> &mdash; Ensure
                    the same <InlineCode>initiatorEmail</InlineCode> used during
                    scheduling is passed during update/cancel so the correct
                    mailbox is targeted.
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
