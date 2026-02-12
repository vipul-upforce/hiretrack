/* eslint-disable react/no-array-index-key */

'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { EntryContentProps } from '../types';
import { EntryRating } from './EntryRating';

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

function getMeetingLabel(line: string, url: string): string | null {
  const haystack = `${line} ${url}`.toLowerCase();

  if (haystack.includes('meet.google.com') || haystack.includes('google meet')) {
    return 'Google Meet link';
  }
  if (haystack.includes('zoom.us') || haystack.includes('zoom')) {
    return 'Zoom Meet link';
  }
  if (
    haystack.includes('teams.microsoft.com') ||
    haystack.includes('teams.live.com') ||
    haystack.includes('microsoft teams')
  ) {
    return 'Microsoft Teams link';
  }

  return null;
}

function LinkWithCopy({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Silent fail to keep history rendering resilient.
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-700"
      >
        {label}
      </a>
      <button
        type="button"
        onClick={copyToClipboard}
        className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200/60 dark:hover:bg-gray-700/60"
        aria-label="Copy meeting link"
        title="Copy meeting link"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

function RenderFormattedDescription({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, index) => {
        const match = line.match(URL_REGEX);
        if (!match) {
          return (
            <span key={`line-${index}`} className="block">
              {line}
            </span>
          );
        }

        const url = match[0];
        const label = getMeetingLabel(line, url);

        if (label) {
          return (
            <span key={`line-${index}`} className="block">
              <LinkWithCopy href={url} label={label} />
            </span>
          );
        }

        const [prefix, suffix] = line.split(url);
        return (
          <span key={`line-${index}`} className="block">
            {prefix}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-700"
            >
              {url}
            </a>
            {suffix}
          </span>
        );
      })}
    </>
  );
}

/**
 * Component to display entry content (description and rating)
 */
export function EntryContent({ interview }: EntryContentProps) {
  const noteDescription =
    interview.note && typeof interview.note.description === 'string'
      ? interview.note.description
      : null;

  const remarkDescription = interview.remark?.description || null;

  const noteRating =
    interview?.note &&
      Object.keys(interview.note).length > 0 &&
      interview?.note?.rating !== 0
      ? interview?.note?.rating
      : undefined;

  const remarkRating =
    interview.remark?.rating && interview.remark.rating !== 0
      ? interview.remark.rating
      : undefined;

  const combinedDescription = [noteDescription, remarkDescription]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="mb-4 flex w-[full] flex-row items-start justify-between text-wrap break-all text-base font-normal text-gray-500 dark:text-gray-400">
      <p
        className="max-w-[90%] whitespace-pre-wrap pb-0 text-sm"
        style={{ wordWrap: 'break-word' }}
      >
        <RenderFormattedDescription text={combinedDescription} />
      </p>

      <EntryRating rating={noteRating} />
      <EntryRating rating={remarkRating} />
    </div>
  );
}









