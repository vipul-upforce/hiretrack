import { Dot, EyeOffIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EntryMetadataProps } from '../types';

/**
 * Component to display entry metadata (timestamp and private indicator)
 */
export function EntryMetadata({
  timeDate,
  timeTime,
  isPrivate,
}: EntryMetadataProps) {
  return (
    <div className="flex flex-row items-center gap-2">
      <time className="group mb-1 flex flex-row items-center text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
        {timeDate} <Dot /> {timeTime}
      </time>

      {isPrivate && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <EyeOffIcon className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900/95 dark:bg-black/95">
              <p className="text-xs">Private remark</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}






