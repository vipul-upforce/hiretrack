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
  storageType: string;
}

export function SetupInstructions({ storageType }: SetupInstructionsProps) {
  const [accordionValue, setAccordionValue] = useState('');

  useEffect(() => {
    setAccordionValue('');
  }, [storageType]);

  const isCloudinary = storageType === 'cloudinary';
  const subtitle = isCloudinary
    ? 'Cloudinary storage credentials'
    : 'AWS S3 storage credentials';
  const configTitle = isCloudinary
    ? 'Cloudinary Console Configuration'
    : 'AWS Console Configuration';

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
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-3.5 w-3.5" />
                {configTitle}
              </h4>

              {isCloudinary && (
                <ol className="list-inside list-decimal space-y-2.5 text-sm text-foreground">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.cloudinary.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Cloudinary Console
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    .
                  </li>
                  <li>Create a Cloudinary account or select your product environment.</li>
                  <li>Click on Home and open the Dashboard section.</li>
                  <li>In the product Environment click on <b>Go to API Keys</b>.</li>
                  <li>
                    Copy credentials:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>Cloud name to Cloud Name field</li>
                      <li>API Key to Cloudinary API Key field</li>
                      <li>API Secret to Cloudinary API Secret field</li>
                    </ul>
                  </li>
                  <li>
                    <b>Enable PDF Delivery</b>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>Click <b>Settings (⚙️ icon)</b> in the top right.</li>
                      <li>Select the <b>Security</b> tab.</li>
                      <li>Scroll down to <b>PDF and ZIP files delivery</b>.</li>
                      <li>Check <b>Allow delivery of PDF and ZIP files</b>.</li>
                      <li>Scroll to bottom and click <b>Save</b>.</li>
                    </ul>
                  </li>
                  <li>Click Test Credentials and then Save.</li>
                </ol>
              )}

              {!isCloudinary && (
                <ol className="list-inside list-decimal space-y-2.5 text-sm text-foreground">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.aws.amazon.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      AWS Console
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    .
                  </li>
                  <li>Create/select an S3 bucket and note region and bucket name.</li>
                  <li>Create an IAM user with programmatic access.</li>
                  <li>
                    Grant bucket permissions:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>s3:ListBucket</li>
                      <li>s3:GetObject</li>
                      <li>s3:PutObject</li>
                      <li>s3:DeleteObject</li>
                    </ul>
                  </li>
                  <li>Create an Access Key and copy ID + Secret.</li>
                  <li>Fill AWS Region, Access Key ID, Secret Access Key, and Bucket Name.</li>
                  <li>Click Test Credentials and then Save.</li>
                </ol>
              )}
            </section>

            <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
              <h4 className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Critical Requirements
              </h4>
              {isCloudinary && (
                <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                  <li>Use credentials from the same Cloudinary environment.</li>
                  <li>Use API Secret, not the full CLOUDINARY_URL.</li>
                  <li><b>Must enable &quot;PDF and ZIP files delivery&quot;</b> in Security settings.</li>
                  <li>Run Test Credentials before saving.</li>
                </ul>
              )}

              {!isCloudinary && (
                <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                  <li>Region must exactly match the bucket region.</li>
                  <li>IAM user must have S3 permissions on target bucket.</li>
                  <li>Run Test Credentials before saving.</li>
                </ul>
              )}
            </section>

            <section className="text-sm text-foreground">
              <p className="font-medium">Official Docs</p>
              <ul className="mt-2 ml-5 list-disc space-y-1">
                {isCloudinary && (
                  <li>
                    <a
                      href="https://cloudinary.com/documentation/finding_your_credentials_tutorial"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Cloudinary: Find your credentials
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                )}

                {!isCloudinary && (
                  <>
                    <li>
                      <a
                        href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        AWS S3: Create bucket
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        AWS IAM: Access keys
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}