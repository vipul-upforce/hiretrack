'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> & {
    delayDuration?: number;
    skipDelayDuration?: number;
  }
> = ({ delayDuration = 0, skipDelayDuration = 0, ...props }) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  />
);
TooltipProvider.displayName = TooltipPrimitive.Provider.displayName;

const Tooltip: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> & {
    delayDuration?: number;
  }
> = ({ delayDuration = 0, ...props }) => (
  <TooltipPrimitive.Root
    delayDuration={delayDuration}
    {...props}
  />
);
Tooltip.displayName = TooltipPrimitive.Root.displayName;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-lg bg-gray-900/95 dark:bg-black/95 backdrop-blur-sm px-3 py-2 text-xs text-white dark:text-gray-100 shadow-lg border border-gray-700/50 dark:border-gray-600/50',
        // Subtle entrance animations
        'animate-in fade-in-0 zoom-in-98 duration-150 ease-out',
        // Exit animations
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 data-[state=closed]:duration-100',
        // Slide animations based on side
        'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
        'data-[state=closed]:data-[side=bottom]:slide-out-to-top-1 data-[state=closed]:data-[side=left]:slide-out-to-right-1 data-[state=closed]:data-[side=right]:slide-out-to-left-1 data-[state=closed]:data-[side=top]:slide-out-to-bottom-1',
        // Transform origin
        'origin-[--radix-tooltip-content-transform-origin]',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Convenient wrapper for common tooltip usage
const QuickTooltip = React.forwardRef<
  HTMLDivElement,
  {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    contentClassName?: string;
  }
>(({
  content, children, side = 'top', className, contentClassName, ...props
}, ref) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side={side} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));
QuickTooltip.displayName = 'QuickTooltip';

export {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, QuickTooltip,
};
