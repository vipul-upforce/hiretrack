/**
 * Responsive Dialog Test Component
 *
 * This component demonstrates responsive dialog behavior across different screen sizes.
 * Use this to test how dialogs adapt to mobile, tablet, and desktop viewports.
 */

import React, { useState } from 'react';
import { Button } from './button';
import { BaseDialog } from './base-dialog';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

export function ResponsiveDialogTest() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const sampleContent = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter your name..." />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Enter your email..." />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" placeholder="Enter your message..." rows={4} />
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">Long Content Test</h4>
        <p className="text-sm text-muted-foreground">
          This is a longer piece of content to test how dialogs handle scrolling
          and overflow on different screen sizes. Lorem ipsum dolor sit amet,
          consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua.
        </p>
        <p className="text-sm text-muted-foreground">
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
        <p className="text-sm text-muted-foreground">
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde
          omnis iste natus error sit voluptatem accusantium doloremque
          laudantium.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-8">
      <h2 className="mb-6 text-2xl font-bold">Responsive Dialog Tests</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {/* Different dialog sizes */}
        <Button onClick={() => setActiveDialog('xs')}>XS Dialog (320px)</Button>
        <Button onClick={() => setActiveDialog('sm')}>SM Dialog (400px)</Button>
        <Button onClick={() => setActiveDialog('md')}>MD Dialog (500px)</Button>
        <Button onClick={() => setActiveDialog('lg')}>LG Dialog (700px)</Button>
        <Button onClick={() => setActiveDialog('xl')}>XL Dialog (900px)</Button>
        <Button onClick={() => setActiveDialog('2xl')}>
          2XL Dialog (1200px)
        </Button>
      </div>

      <div className="mt-8 rounded-lg bg-muted p-4">
        <h3 className="mb-2 font-semibold">Responsive Behavior Notes:</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            •<strong>Mobile (≤640px):</strong> All dialogs use 90vw width with
            proper margins
          </li>
          <li>
            •<strong>Tablet (641px-1024px):</strong> XL/2XL dialogs limited to
            85vw
          </li>
          <li>
            •
            <strong>
              Desktop ({'>'}
              1024px):
            </strong>{' '}
            Dialogs use their defined max-widths
          </li>
          <li>
            •<strong>Height:</strong> All dialogs respect 90vh max-height with
            scrollable content
          </li>
          <li>
            •<strong>Buttons:</strong> Stack vertically on mobile, horizontal on
            desktop
          </li>
        </ul>
      </div>

      {/* Dialog Instances */}
      {['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((size) => (
        <BaseDialog
          key={size}
          isOpen={activeDialog === size}
          onClose={() => setActiveDialog(null)}
          title={`${size.toUpperCase()} Responsive Dialog`}
          description={`Testing ${size} dialog size across different screen sizes`}
          size={size as 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'}
          primaryAction={{
            label: 'Save Changes',
            onClick: () => setActiveDialog(null),
            variant: 'success',
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setActiveDialog(null),
          }}
        >
          {sampleContent}
        </BaseDialog>
      ))}
    </div>
  );
}
