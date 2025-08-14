"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SCROLL_AREA_WIDTH = 60; // The width of the edge area that triggers scrolling (in pixels)
const SCROLL_SPEED = 15; // The amount to scroll on each frame

export function useAutoScroll(scrollContainerRef: React.RefObject<HTMLElement>) {
  const [isDragging, setIsDragging] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !scrollContainerRef.current) {
        return;
      }

      const { clientX } = event;
      const { left, right, width } =
        scrollContainerRef.current.getBoundingClientRect();

      if (clientX < left + SCROLL_AREA_WIDTH) {
        // Mouse is in the left scroll zone
        if (scrollIntervalRef.current === null) {
          scrollIntervalRef.current = window.setInterval(() => {
            scrollContainerRef.current!.scrollLeft -= SCROLL_SPEED;
          }, 16); // ~60fps
        }
      } else if (clientX > right - SCROLL_AREA_WIDTH) {
        // Mouse is in the right scroll zone
        if (scrollIntervalRef.current === null) {
          scrollIntervalRef.current = window.setInterval(() => {
            scrollContainerRef.current!.scrollLeft += SCROLL_SPEED;
          }, 16);
        }
      } else {
        // Mouse is in the neutral zone
        if (scrollIntervalRef.current !== null) {
          window.clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      }
    },
    [isDragging, scrollContainerRef]
  );

  const stopScrolling = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopScrolling); // Failsafe for when drag ends outside the window
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopScrolling);
      stopScrolling();
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopScrolling);
      stopScrolling();
    };
  }, [isDragging, handleMouseMove, stopScrolling]);

  return { setIsDragging };
}
