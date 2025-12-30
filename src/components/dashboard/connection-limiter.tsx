'use client';

import React from 'react';
import { ShieldAlert, AlertCircle, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionLimitAlertProps {
  activeTabCount: number;
  isConnected: boolean;
}

export function ConnectionLimitAlert({
  activeTabCount,
  isConnected,
}: ConnectionLimitAlertProps) {
  const MAX_LIMIT = 5;
  const isConnectionBlocked = activeTabCount > MAX_LIMIT && isConnected;

  // Warning triggers when close to limit (e.g., 4 or 5 tabs)
  const isConnectionWarning =
    activeTabCount >= MAX_LIMIT - 1 &&
    activeTabCount <= MAX_LIMIT &&
    isConnected;

  // Helper to visualize the tabs
  const renderTabVisualizer = (smallMode = false) => {
    const total = Math.min(activeTabCount, 10);
    const items = [];

    for (let i = 0; i < total; i += 1) {
      const isOverLimit = i >= MAX_LIMIT;
      items.push(
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-500',
            smallMode ? 'h-4 w-1' : 'h-8 w-2 md:w-3',
            isOverLimit
              ? 'animate-pulse bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
              : 'bg-emerald-500/80',
          )}
        />,
      );
    }
    return items;
  };

  if (!isConnectionBlocked && !isConnectionWarning) return null;

  return (
    <>
      {isConnectionBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-md duration-300 animate-in fade-in">
          {/* Ambient Background Glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-background/80 p-0 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-zinc-900/80">
            <div className="h-2 w-full bg-gradient-to-r from-orange-400 via-red-500 to-orange-400" />

            <div className="flex flex-col items-center p-8 text-center sm:p-10">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/20 duration-1000" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                  <ShieldAlert className="h-10 w-10 text-orange-600 dark:text-orange-500" />
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                Connection Limit Exceeded
              </h2>
              <p className="mx-auto mb-8 max-w-xs text-base text-muted-foreground">
                To prevent performance degradation, we limit active sessions to{' '}
                {MAX_LIMIT}.
              </p>

              <div className="mb-6 w-full rounded-xl border border-border/50 bg-muted/50 p-5">
                <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Current Usage</span>
                  <span className="font-bold text-red-500">
                    {activeTabCount} / {MAX_LIMIT}
                  </span>
                </div>
                <div className="flex h-10 items-center justify-center space-x-2">
                  {renderTabVisualizer()}
                </div>
              </div>

              <p className="text-sm font-medium text-foreground">
                Please close{' '}
                <span className="font-bold text-red-500">
                  {activeTabCount - MAX_LIMIT}
                </span>{' '}
                tab(s).
              </p>
            </div>
          </div>
        </div>
      )}

      {isConnectionWarning && (
        <div className="group fixed bottom-6 right-6 z-[99] flex items-center">
          <div className="absolute bottom-1 right-16 mb-0 w-72 origin-bottom-right scale-90 opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100">
            <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-background/95 p-4 shadow-2xl backdrop-blur-xl dark:bg-zinc-900/95">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-500">
                  <XOctagon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-semibold leading-none">
                    High Usage Detected
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    You have <strong>{activeTabCount}</strong> tabs open. The
                    limit is {MAX_LIMIT}.
                  </p>
                </div>
              </div>

              {/* Mini Visualizer inside tooltip */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 p-2">
                <div className="flex space-x-1">
                  {renderTabVisualizer(true)}
                </div>
                <span className="text-[10px] font-medium text-amber-600">
                  {MAX_LIMIT - activeTabCount} left
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_4px_20px_rgba(249,115,22,0.5)] ring-2 ring-white/20 transition-all duration-300 hover:scale-110 hover:shadow-[0_4px_30px_rgba(249,115,22,0.7)]">
            {/* Ping animation behind the solid button */}
            <span className="absolute -inset-1 animate-ping rounded-full bg-orange-500 opacity-40 duration-1000" />

            <AlertCircle className="relative h-7 w-7 text-white drop-shadow-md" />

            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-orange-600 shadow-md ring-2 ring-background">
              {activeTabCount}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
