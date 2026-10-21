'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderSectionProps {
  orgName: string;
  userLoggedIn: boolean;
  onLogout: () => void;
}

export function HeaderSection({
  orgName,
  userLoggedIn,
  onLogout,
}: HeaderSectionProps) {
  return (
    <div className="mb-8 flex flex-row items-start justify-between py-4">
      <div>
        <h1 className="mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-xl font-bold text-transparent dark:from-white dark:to-gray-300 sm:text-2xl lg:text-3xl">
          Open Positions {orgName ? `for ${orgName}` : ''}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Discover amazing opportunities and take your career to the next level
        </p>
      </div>

      <div className="flex flex-row gap-5">
        {userLoggedIn && (
          <Button
            variant="ghost"
            className={cn(
              'flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm text-red-500 backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-600 dark:border-red-800/50 dark:hover:bg-red-900/20',
              'justify-start',
            )}
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        )}

        <ThemeToggle className="w-9 rounded-full" />
      </div>
    </div>
  );
}
