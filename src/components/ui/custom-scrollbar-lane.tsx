"use client";

import React, { useEffect, useRef, useState, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
  scrollerRef?: React.Ref<HTMLElement>; // Add this for Virtuoso
}

// Use forwardRef to allow passing the ref from Virtuoso
const CustomScrollbarLane = forwardRef<HTMLDivElement, CustomScrollbarProps>(
  ({ children, className, style, isDragging, scrollerRef }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showScrollbar, setShowScrollbar] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollHeight, setScrollHeight] = useState(0);
    const [clientHeight, setClientHeight] = useState(0);

    // Merge the forwarded ref with the internal containerRef
    const setRefs = (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current =
          element;
      }

      // Also forward to scrollerRef for Virtuoso
      if (scrollerRef) {
        if (typeof scrollerRef === "function") {
          scrollerRef(element);
        } else if (scrollerRef && "current" in scrollerRef) {
          (scrollerRef as React.MutableRefObject<HTMLElement | null>).current =
            element;
        }
      }
    };

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateScrollInfo = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        setScrollTop(scrollTop);
        setScrollHeight(scrollHeight);
        setClientHeight(clientHeight);
        setShowScrollbar(scrollHeight > clientHeight);
      };

      updateScrollInfo();

      const observer = new ResizeObserver(updateScrollInfo);
      observer.observe(container);

      container.addEventListener("scroll", updateScrollInfo);

      return () => {
        observer.disconnect();
        container.removeEventListener("scroll", updateScrollInfo);
      };
    }, []);

    const handleScrollbarClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const scrollbarHeight = rect.height;
      const scrollRatio = clickY / scrollbarHeight;
      const newScrollTop = scrollRatio * (scrollHeight - clientHeight);

      container.scrollTop = newScrollTop;
    };

    const scrollbarHeight =
      clientHeight > 0 ? (clientHeight / scrollHeight) * clientHeight : 0;
    const scrollbarTop =
      scrollHeight > clientHeight
        ? (scrollTop / (scrollHeight - clientHeight)) *
          (clientHeight - scrollbarHeight)
        : 0;

    // Clone children and pass scrollerRef if it's a Virtuoso component
    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && scrollerRef) {
        // Check if this is a Virtuoso component by checking for scrollerRef prop
        if (
          "scrollerRef" in (child.props as object) ||
          child.type?.toString().includes("Virtuoso")
        ) {
          return React.cloneElement(child as any, { scrollerRef: setRefs });
        }
      }
      return child;
    });

    return (
      <div className={cn("relative", className)} style={style}>
        <div
          ref={setRefs}
          className={cn(
            "h-full scrollbar-hide",
            isDragging ? "overflow-hidden" : "overflow-y-scroll"
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            maxHeight: "100%",
          }}
        >
          {childrenWithProps || children}
        </div>

        {showScrollbar && (
          <div className="absolute -right-2 top-0 bottom-0 w-1.5">
            <div
              className="absolute right-0 w-1 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50 cursor-pointer dark:bg-muted-foreground/20 dark:hover:bg-muted-foreground/40"
              style={{
                height: `${scrollbarHeight}px`,
                top: `${scrollbarTop}px`,
              }}
              onClick={handleScrollbarClick}
            />
          </div>
        )}
      </div>
    );
  }
);

CustomScrollbarLane.displayName = "CustomScrollbarLane";

// CSS for hiding scrollbar
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

// Inject styles if not already present
if (typeof document !== "undefined") {
  const styleId = "custom-scrollbar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = scrollbarHideStyles;
    document.head.appendChild(style);
  }
}

export default CustomScrollbarLane;
