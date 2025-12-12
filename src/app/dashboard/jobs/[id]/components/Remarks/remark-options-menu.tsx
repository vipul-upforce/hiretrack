'use client';

import { MoreVertical, Edit, Eye, EyeOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import useRoles from '@/hooks/useRoles';
import { useState } from 'react';

interface RemarkOptionsMenuProps {
  type: 'remark' | 'note';
  remarkId: string;
  isPrivate?: boolean;
  onTogglePrivacy?: (id: string, isPrivate: boolean) => Promise<void>;
  onEdit: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function RemarkOptionsMenu({
  type,
  remarkId,
  isPrivate,
  onTogglePrivacy,
  onEdit,
  isOpen,
  setIsOpen,
}: RemarkOptionsMenuProps) {
  const [isLocalPrivate, setIsLocalPrivate] = useState(isPrivate); // state for
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrivacyToggle = async (checked: boolean) => {
    setIsLoading(true);
    const previousState = isLocalPrivate; // Keep the previous state to revert in case of failure
    setIsLocalPrivate(checked); // Optimistically update the UI

    try {
      await onTogglePrivacy?.(remarkId, checked);
      setIsLoading(false);
      setError(null);
    } catch {
      setIsLoading(false);
      setError('Failed to update privacy!');
      setIsLocalPrivate(previousState); // Revert to the previous state on failure
    }
  };

  const role = useRoles();

  const handleEdit = () => onEdit(remarkId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`rounded-full p-1.5 opacity-0 transition duration-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 group-hover:opacity-100 dark:hover:bg-gray-800 ${
          isOpen ? 'opacity-100' : ''
        }`}
      >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Open options</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* ✅ Show privacy toggle only for remarks */}
        {type === 'remark' && role !== 'interviewer' && (
          <>
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center space-x-2">
                {isLocalPrivate ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
                <Label htmlFor="privacy-toggle" className="text-sm">
                  {isLocalPrivate ? 'Private' : 'Public'}
                </Label>
              </div>
              <Switch
                id="privacy-toggle"
                checked={isLocalPrivate}
                disabled={isLoading}
                onCheckedChange={handlePrivacyToggle}
                className="border-1 h-4 w-8 border border-solid drop-shadow-lg"
              />
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <div
          className="flex cursor-pointer items-center justify-between px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={handleEdit}
        >
          Edit
          <Edit className="mr-2 h-4 w-4" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
