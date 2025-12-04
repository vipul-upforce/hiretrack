'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="py-4 flex flex-row justify-between items-start mb-8">
      <div>
        <h1 className="lg:text-3xl sm:text-2xl text-xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Open Positions
          {' '}
          {orgName ? `for ${orgName}` : ''}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Discover amazing opportunities and take your career to the next level
        </p>
      </div>

      {userLoggedIn && (
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/50 backdrop-blur-sm',
            'justify-start',
          )}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      )}
    </div>
  );
}
