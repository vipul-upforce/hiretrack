'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the viewport is desktop size (≥1025px)
 * Uses matchMedia for better performance than resize listeners
 * @returns boolean - true if viewport width >= 1025px
 */

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;

    // Use matchMedia for better performance
    const mediaQuery = window.matchMedia('(min-width: 1025px)');

    // Set initial value
    setIsDesktop(mediaQuery.matches);

    // Create event listener
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    // Modern browsers support addEventListener on MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      // eslint-disable-next-line consistent-return
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    // eslint-disable-next-line consistent-return
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isDesktop;
}
