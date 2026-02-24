'use client';

import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookOpen, ExternalLink, KeyRound, AlertTriangle } from 'lucide-react';

interface SetupInstructionsProps {
  provider: string;
}

export function SetupInstructions({ provider }: SetupInstructionsProps) {
  const [accordionValue, setAccordionValue] = useState('');

  useEffect(() => {
    setAccordionValue('');
  }, [provider]);

  const isSmtp = provider === 'smtp';
  const isResend = provider === 'resend';
  const isBrevo = provider === 'brevo';

  let subtitle = 'Select a provider to view setup steps';
  if (isSmtp) {
    subtitle = 'SMTP credentials and sender setup';
  } else if (isResend) {
    subtitle = 'Resend API key and sender setup';
  } else if (isBrevo) {
    subtitle = 'Brevo API key and sender setup';
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={accordionValue}
      onValueChange={setAccordionValue}
      className="rounded-lg border bg-card shadow-sm"
    >
      <AccordionItem value="setup" className="border-0 px-4">
        <AccordionTrigger className="py-4 hover:no-underline">
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Setup Instructions</h3>
              <p className="mt-0.5 text-sm font-normal text-foreground">{subtitle}</p>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pt-0 pb-4">
          <div className="space-y-6 sm:pl-12">
            {!provider && (
              <section className="space-y-3 text-sm text-foreground">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="h-3.5 w-3.5" />
                  Start Here
                </h4>
                <ol className="list-inside list-decimal space-y-2.5">
                  <li>Select a mail provider from the dropdown above.</li>
                  <li>Enter all required keys/IDs for the selected provider.</li>
                  <li>Click Test Connection.</li>
                  <li>Save only after a successful connection test.</li>
                </ol>
              </section>
            )}

            {isSmtp && (
              <>
                <section className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-3.5 w-3.5" />
                    SMTP Provider Configuration
                  </h4>
                  <ol className="list-inside list-decimal space-y-2.5 text-sm text-foreground">
                    <li>Choose your SMTP service (Google, Microsoft 365, Zoho, SES, etc.).</li>
                    <li>Get SMTP Host and Port from your provider docs.</li>
                    <li>Create SMTP credentials (or app password).</li>
                    <li>Fill SMTP Host, Port, User, Password, and Displayed Sender Email.</li>
                    <li>Click Test Connection, then Save.</li>
                  </ol>
                </section>

                <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Critical Requirements
                  </h4>
                  <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                    <li>SMTP authentication must be enabled.</li>
                    <li>Use app password when normal password is blocked.</li>
                    <li>Sender email must be allowed/verified by provider.</li>
                  </ul>
                </section>

                <section className="text-sm text-foreground">
                  <p className="font-medium">Helpful Docs</p>
                  <ul className="mt-2 ml-5 list-disc space-y-1">
                    <li>
                      <a
                        href="https://support.google.com/accounts/answer/185833"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Google: App passwords
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Microsoft 365: SMTP client submission
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  </ul>
                </section>
              </>
            )}

            {isResend && (
              <>
                <section className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-3.5 w-3.5" />
                    Resend Configuration
                  </h4>
                  <ol className="list-inside list-decimal space-y-2.5 text-sm text-foreground">
                    <li>
                      Open{' '}
                      <a
                        href="https://resend.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Resend API Keys
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      .
                    </li>
                    <li>Create and copy API key.</li>
                    <li>Verify sender/domain in Resend.</li>
                    <li>Fill API Key, From, and Reply To.</li>
                    <li>Click Test Connection, then Save.</li>
                  </ol>
                </section>

                <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Critical Requirements
                  </h4>
                  <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                    <li>Use active API key with send permissions.</li>
                    <li>From email must be verified in Resend.</li>
                  </ul>
                </section>

                <section className="text-sm text-foreground">
                  <p className="font-medium">Official Docs</p>
                  <ul className="mt-2 ml-5 list-disc space-y-1">
                    <li>
                      <a
                        href="https://resend.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Resend documentation
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  </ul>
                </section>
              </>
            )}

            {isBrevo && (
              <>
                <section className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-3.5 w-3.5" />
                    Brevo Configuration
                  </h4>
                  <ol className="list-inside list-decimal space-y-2.5 text-sm text-foreground">
                    <li>
                      Open{' '}
                      <a
                        href="https://app.brevo.com/settings/keys/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Brevo API Keys
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      .
                    </li>
                    <li>Create and copy API key.</li>
                    <li>Verify sender/domain in Brevo.</li>
                    <li>Fill API Key, From, and Reply To.</li>
                    <li>Click Test Connection, then Save.</li>
                  </ol>
                </section>

                <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Critical Requirements
                  </h4>
                  <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                    <li>Use active API key with email sending access.</li>
                    <li>From email must be configured as sender in Brevo.</li>
                  </ul>
                </section>

                <section className="text-sm text-foreground">
                  <p className="font-medium">Official Docs</p>
                  <ul className="mt-2 ml-5 list-disc space-y-1">
                    <li>
                      <a
                        href="https://developers.brevo.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Brevo developer docs
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  </ul>
                </section>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
