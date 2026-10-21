'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  maxCount?: number;
  showZero?: boolean;
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
}

export function NotificationBadge({
  count,
  className,
  maxCount = 99,
  showZero = false,
  variant = 'destructive',
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Badge
      variant={variant}
      className={cn(
        'absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1.5 py-0 text-xs font-semibold',
        'flex items-center justify-center rounded-full border-2 border-background',
        'animate-in fade-in-0 zoom-in-75 duration-200',
        className,
      )}
    >
      {displayCount}
    </Badge>
  );
}
