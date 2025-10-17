"use client";
import { useEffect, useState } from "react";

interface MetadataOptions {
  title?: string;
  favicon?: string;
  preloadFavicon?: boolean;
  skipInitialTitleUpdate?: boolean;
}

/**
 * A custom hook to manage document metadata (title, favicon) with anti-flickering strategies
 */
export const useDocumentMetadata = ({
  title,
  favicon,
  preloadFavicon = true,
  skipInitialTitleUpdate = false,
}: MetadataOptions) => {
  const [isFaviconLoaded, setIsFaviconLoaded] = useState(false);
  const [initialRender, setInitialRender] = useState(true);

  // Handle title updates
  useEffect(() => {
    if (!title) return;

    // Skip the first update if requested (useful when waiting for data)
    if (initialRender && skipInitialTitleUpdate) {
      setInitialRender(false);
      return;
    }

    // Batch title updates with other DOM changes for smoothness
    const timeoutId = setTimeout(() => {
      document.title = title;
      console.log("title>>>>>>>>>>>> ", title);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [title, initialRender, skipInitialTitleUpdate]);

  // Handle favicon updates
  useEffect(() => {
    if (!favicon) return;

    // Function to update the favicon in the DOM
    const updateFavicon = (faviconUrl: string) => {
      // Get or create the favicon link element
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        link.type = "image/x-icon";
        document.head.appendChild(link);
      }

      // Only update if different
      if (link.href !== faviconUrl) {
        link.href = faviconUrl;
      }

      // Also update apple-touch-icon for iOS devices
      let touchIcon = document.querySelector(
        "link[rel~='apple-touch-icon']"
      ) as HTMLLinkElement;
      if (!touchIcon) {
        touchIcon = document.createElement("link");
        touchIcon.rel = "apple-touch-icon";
        document.head.appendChild(touchIcon);
      }

      if (touchIcon.href !== faviconUrl) {
        touchIcon.href = faviconUrl;
      }

      setIsFaviconLoaded(true);
    };

    if (preloadFavicon) {
      // Preload strategy to avoid flickering
      const img = new Image();
      img.onload = () => updateFavicon(favicon);
      img.onerror = () => {
        console.error("Failed to load favicon:", favicon);
        // You could set a default favicon here
      };
      img.src = favicon;
    } else {
      // Direct update without preloading
      updateFavicon(favicon);
    }
  }, [favicon, preloadFavicon]);

  return { isFaviconLoaded };
};

export default useDocumentMetadata;
