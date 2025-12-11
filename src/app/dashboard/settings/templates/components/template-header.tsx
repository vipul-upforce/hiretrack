import React from 'react';
import Link from 'next/link';
import { Home, ChevronRight, Save } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TemplateHeaderProps {
  onSave: () => void;
  saving: boolean;
}

export function TemplateHeader({ onSave, saving }: TemplateHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
          {/* Title and Breadcrumbs */}
          <div className="flex flex-col gap-2">
            <nav className="flex items-center text-sm font-medium text-muted-foreground">
              <Link
                href="/dashboard"
                className="flex items-center transition-colors hover:text-foreground"
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="mx-2 h-4 w-4" />
              <Link
                href="/dashboard/settings"
                className="transition-colors hover:text-foreground"
              >
                Settings
              </Link>
              <ChevronRight className="mx-2 h-4 w-4" />
              <span className="font-semibold text-foreground">
                Email Templates
              </span>
            </nav>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving} variant="primary">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
