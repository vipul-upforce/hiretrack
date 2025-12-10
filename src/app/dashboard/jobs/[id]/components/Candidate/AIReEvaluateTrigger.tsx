import { Button } from '@/components/ui/button';
import { Candidate } from '@/types/candidate';
import { RefreshCwIcon } from 'lucide-react';
import { Label } from 'recharts';

export function AIReEvaluateTrigger({
  labelClass,
  role,
  onReEvaluate,
  isReEvaluating,
  isEvaluatingFor,
  localCandidate,
}: {
  labelClass: string;
  role: string;
  onReEvaluate: () => void;
  isReEvaluating: boolean;
  isEvaluatingFor: string;
  localCandidate: Candidate;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <Label className={labelClass}>AI Evaluation</Label>
            {role !== 'candidate' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onReEvaluate();
                }}
                disabled={
                  isReEvaluating && isEvaluatingFor === localCandidate?._id
                }
                className={
                  isReEvaluating && isEvaluatingFor === localCandidate?._id
                    ? 'animate-spin text-gray-400 dark:text-gray-500'
                    : 'hover:text-gray-600 dark:hover:text-gray-300 transition duration-300 text-gray-500 dark:text-gray-400'
                }
              >
                <RefreshCwIcon size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
