import React, { forwardRef } from "react";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";

interface VirtuosoScrollerProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  tabIndex?: number;
  "data-testid"?: string;
  "data-virtuoso-scroller"?: boolean;
}

const VirtuosoScroller = forwardRef<HTMLDivElement, VirtuosoScrollerProps>(
  ({ children, style, className, ...props }, ref) => {
    return (
      <CustomScrollbar
        ref={ref}
        style={style}
        className={className}
        isDragging={false}
      >
        <div {...props}>{children}</div>
      </CustomScrollbar>
    );
  }
);

VirtuosoScroller.displayName = "VirtuosoScroller";

export { VirtuosoScroller };
