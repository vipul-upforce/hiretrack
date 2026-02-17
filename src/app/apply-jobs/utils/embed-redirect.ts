'use client';

import { useEffect, useState } from 'react';

/**
 * Extracts the origin (protocol + host) from a URL string.
 * Returns null if the URL is invalid or empty.
 */
export function getOriginFromUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Normalizes origin for comparison (lowercase, no trailing slash).
 * URL.origin is already normalized; this handles edge cases.
 */
function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/+$/, '');
}

/**
 * Returns true if we're in a cross-origin iframe (parent domain !== embed domain).
 * Used to decide whether to redirect to embed URL when opening job detail.
 *
 * @param isIframe - Whether the page is loaded inside an iframe
 * @returns true if parent (referrer) and embed (current) domains differ
 */
export function isCrossOriginEmbed(isIframe: boolean): boolean {
  if (typeof window === 'undefined' || !isIframe) return false;

  const { referrer } = document;
  const parentOrigin = getOriginFromUrl(referrer);

  // No referrer = direct load, privacy mode, or same-origin with no referrer policy
  if (!parentOrigin) return false;

  const { origin: embedOrigin } = window.location;
  return normalizeOrigin(parentOrigin) !== normalizeOrigin(embedOrigin);
}

/**
 * Builds the full embed URL with jobId, preserving existing query params.
 * Only call from client-side (uses window.location).
 */
export function buildEmbedUrlWithJobId(jobId: string): string {
  if (typeof window === 'undefined') return '';

  const { origin, search } = window.location;
  const params = new URLSearchParams(search);
  params.set('jobId', jobId);
  return `${origin}/apply-jobs?${params.toString()}`;
}

/**
 * Memoized hook: returns whether we should redirect to embed URL on job click.
 * Computed once on mount (referrer/origin don't change during session).
 */
export function useShouldRedirectToEmbedOnJobClick(
  isIframe: boolean,
): boolean {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    setShouldRedirect(isCrossOriginEmbed(isIframe));
  }, [isIframe]);

  return shouldRedirect;
}
