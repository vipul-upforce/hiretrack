/**
 * Create Candidate Dialog Header Component
 * Displays dialog header with maximize/minimize button
 */

import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Maximize, Minimize } from 'lucide-react';

interface CreateCandidateDialogHeaderProps {
  userRole: string | undefined;
  jobTitle?: string;
  isLargeViewport: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

export function CreateCandidateDialogHeader({
  userRole,
  jobTitle,
  isLargeViewport,
  isMaximized,
  onToggleMaximize,
}: CreateCandidateDialogHeaderProps) {
  return (
    <>
      {/* Maximize/Minimize Button - Always visible */}
      {isLargeViewport && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute z-[100] h-7 w-7 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          style={{ top: 'calc(1rem - 5px)', right: 'calc(3.5rem - 20px)' }}
          onClick={onToggleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          type="button"
        >
          {isMaximized ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      )}
      <DialogHeader className="flex-shrink-0 px-6 py-4 border-b text-left">
        <DialogTitle className="text-left text-xl font-bold text-gray-900 dark:text-white">
          {userRole === 'candidate' || userRole === ''
            ? 'Add Application'
            : 'Add New Candidate'}
        </DialogTitle>
        {jobTitle && (
          <p className="text-left text-sm text-gray-600 dark:text-gray-400 mt-1">
            Applying for:
            {' '}
            {jobTitle}
          </p>
        )}
      </DialogHeader>
    </>
  );
}
