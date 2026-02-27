'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BookOpen, ExternalLink, KeyRound } from 'lucide-react';

interface SetupInstructionsProps {
  captchaType: 'v2' | 'v3';
  captchaVariant: 'checkbox' | 'invisible';
  isConfigured: boolean;
}

export function SetupInstructions({
  captchaType,
  captchaVariant,
  isConfigured,
}: SetupInstructionsProps) {
  const [accordionValue, setAccordionValue] = useState(
    isConfigured ? '' : 'setup',
  );

  useEffect(() => {
    setAccordionValue(isConfigured ? '' : 'setup');
  }, [isConfigured]);

  const subtitle = useMemo(() => {
    if (captchaType === 'v3') {
      return 'Google reCAPTCHA v3 setup';
    }
    return captchaVariant === 'invisible'
      ? 'Google reCAPTCHA v2 (Invisible) setup'
      : 'Google reCAPTCHA v2 (Checkbox) setup';
  }, [captchaType, captchaVariant]);

  return (
    <Accordion
      type="single"
      collapsible
      value={accordionValue}
      onValueChange={setAccordionValue}
      className="rounded-lg border bg-card shadow-sm"
    >
      <AccordionItem value="setup" className="border-0 px-4">
        <AccordionTrigger className="py-5 hover:no-underline [&[data-state=open]]:pb-2">
          <div className="flex w-full items-center gap-3 text-left">
            <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Setup Instructions</h3>
              <p className="mt-0.5 text-sm font-normal text-foreground">
                {subtitle}
              </p>
            </div>
            <div className="ml-auto mr-2 flex shrink-0 items-center">
              <Badge variant="secondary">{captchaType.toUpperCase()}</Badge>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-5 pt-0">
          <div className="space-y-6 pl-12">
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-3.5 w-3.5" />
                Google reCAPTCHA Console
              </h4>
              <ol className="list-inside list-decimal space-y-2.5 text-sm text-foreground">
                <li>
                  Open{' '}
                  <a
                    href="https://www.google.com/recaptcha/admin/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    reCAPTCHA Admin Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Create/Register a new site</li>
                {captchaType === 'v2' ? (
                  <li>
                    Select <strong>reCAPTCHA v2</strong> and choose{' '}
                    <strong>
                      {captchaVariant === 'invisible'
                        ? 'Invisible reCAPTCHA badge'
                        : '"I am not a robot" checkbox'}
                    </strong>
                  </li>
                ) : (
                  <li>
                    Select <strong>reCAPTCHA v3</strong> and configure score
                    based validation for your actions.
                  </li>
                )}
                <li>
                  Add all required domains (production, staging, localhost)
                </li>
                <li>Submit and copy Site Key + Secret Key</li>
                <li>Paste keys here, enable CAPTCHA, then save</li>
              </ol>
            </section>

            <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
              <h4 className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Critical Requirements
              </h4>
              <ul className="ml-5 mt-2 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                <li>
                  Use keys for the same version you selected (
                  {captchaType.toUpperCase()}).
                </li>
                <li>Domain mismatch causes token verification failure.</li>
              </ul>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
