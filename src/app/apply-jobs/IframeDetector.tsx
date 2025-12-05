'use client';

import { useEffect, useState } from 'react';

export function useIsIframe() {
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // Check if the page is loaded in an iframe
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      // If there's an error (cross-origin), we're likely in an iframe
      setIsIframe(true);
    }
  }, []);

  return isIframe;
}

export function IframeWrapper({ children }: { children: React.ReactNode }) {
  const isIframe = useIsIframe();

  return (
    <div className={isIframe ? 'iframe-embedded' : ''}>
      {children}
    </div>
  );
}
