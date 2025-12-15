'use client";';

import React from 'react';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';

function EmailNotificationSettingsSkeleton() {
  return (
    <div>
      <div className="px-6 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        </div>

        <Separator />

        <div className="space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 w-52 rounded bg-muted animate-pulse" />
              <div className="h-6 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center border-t bg-background px-6 py-4 sticky bottom-0 z-10 gap-4">
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
