import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ListTree, TableIcon } from 'lucide-react';
import { User } from '@/lib/features/users/usersApi';

interface HistoryTimelineHeaderProps {
  showLogTable: boolean;
  user: User | null;
  onToggle: () => void;
}

/**
 * Header component for history timeline with toggle button
 */
export function HistoryTimelineHeader({
  showLogTable,
  user,
  onToggle,
}: HistoryTimelineHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Label className="flex items-center gap-2 text-lg font-semibold">
        {showLogTable && user?.role !== 'interviewer'
          ? 'Candidate Update Logs'
          : 'Candidate History'}
      </Label>

      {user?.role !== 'interviewer' && (
        <Button variant="outline" size="sm" onClick={onToggle}>
          {showLogTable ? (
            <>
              <ListTree className="mr-2 h-4 w-4" />
              Show Activities
            </>
          ) : (
            <>
              <TableIcon className="mr-2 h-4 w-4" />
              Show Logs
            </>
          )}
        </Button>
      )}
    </div>
  );
}

