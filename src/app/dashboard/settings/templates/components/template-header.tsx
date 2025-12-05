import React from 'react';
import Link from 'next/link';
import { Home, ChevronRight, Save } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TemplateHeaderProps {
  onSave: () => void;
  saving: boolean;
}

export const TemplateHeader: React.FC<TemplateHeaderProps> = ({
  onSave,
  saving,
}) => (
  <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
        {/* Title and Breadcrumbs */}
        <div className="flex flex-col gap-2">
          <nav className="flex items-center text-sm text-muted-foreground font-medium">
            <Link
              href="/dashboard"
              className="flex items-center hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link
              href="/dashboard/settings"
              className="hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-foreground font-semibold">
              Email Templates
            </span>
          </nav>
        </div>

        {/* Right Section - Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={saving} variant="primary">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  </div>
);
