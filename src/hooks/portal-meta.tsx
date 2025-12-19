import { useState, useEffect } from 'react';

export function useLocation() {
  const [location, setLocation] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    if (typeof window === 'undefined') return;

    // Listen for popstate events
    window.addEventListener('popstate', handleLocationChange);

    // Create a mutation observer to detect changes to the URL
    const observer = new MutationObserver(() => {
      const currentLocation = {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      };

      if (
        currentLocation.pathname !== location.pathname ||
        currentLocation.search !== location.search ||
        currentLocation.hash !== location.hash
      ) {
        handleLocationChange();
      }
    });

    // Observe the document for changes
    observer.observe(document, { subtree: true, childList: true });

    window.removeEventListener('popstate', handleLocationChange);
    observer.disconnect();
  }, [location]);
}
