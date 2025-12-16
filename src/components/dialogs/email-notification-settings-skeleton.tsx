'use client";';

import React from 'react';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';

function EmailNotificationSettingsSkeleton() {
  return (
    <div>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </div>

        <Separator />

        <div className="space-y-3">
          {Array.from({ length: 12 }).map((_) => (
            <div className="flex items-center justify-between">
              <div className="h-4 w-52 animate-pulse rounded bg-muted" />
              <div className="h-6 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-background px-6 py-4">
        <Button variant="outline" disabled>
          Reset
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" disabled>
            Cancel
          </Button>
          <Button variant="primary" disabled>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmailNotificationSettingsSkeleton;
