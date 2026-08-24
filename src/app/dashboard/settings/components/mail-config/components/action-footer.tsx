import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFormikContext } from 'formik';
import { SMTPFormValues } from '../types';

interface ActionFooterProps {
  onClose: () => void;
  isUpdating: boolean;
  isConnectionSuccessful: boolean;
}

export function ActionFooter({
  onClose,
  isUpdating,
  isConnectionSuccessful,
}: ActionFooterProps) {
  const { isSubmitting } = useFormikContext<SMTPFormValues>();

  return (
    <div className="sticky bottom-0 z-20 mt-auto flex justify-end gap-2 border-t border-border/10 bg-background px-6 py-4">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting || isUpdating}
      >
        Cancel
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || isUpdating || !isConnectionSuccessful}
                title={
                  !isConnectionSuccessful
                    ? 'Test the connection before saving.'
                    : ''
                }
              >
                {isSubmitting || isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Test Connection To Make It Enable</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
