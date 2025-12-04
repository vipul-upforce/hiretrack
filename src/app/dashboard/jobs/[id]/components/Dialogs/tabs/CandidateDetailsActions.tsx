/**
 * Action Buttons Component for Candidate Details Dialog Footer
 * Displays action buttons based on user role and context
 */

import { Button } from '@/components/ui/button';
import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';

interface CandidateDetailsActionsProps {
  candidate: Candidate;
  user: User | null;
  fromFilter: boolean;
  hideEditButton: boolean;
  hideCloseButtons: boolean;
  onAssign: () => void;
  onUnassign: () => void;
  onAddFollowUp: () => void;
  onEdit: () => void;
  onClose: () => void;
  onAssignJob: () => void;
}

/**
 * Main Actions Component
 */
export function CandidateDetailsActions({
  candidate,
  user,
  fromFilter,
  hideEditButton,
  hideCloseButtons,
  onAssign,
  onUnassign,
  onAddFollowUp,
  onEdit,
  onClose,
  onAssignJob,
}: CandidateDetailsActionsProps) {
  if (fromFilter) {
    return (
      <div>
        <Button variant="primary" onClick={onAssignJob}>
          {!candidate.jobId ? 'Assign Job' : 'Switch Job'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between w-full">
      {user?.role !== 'candidate' && (
        <div className="flex gap-2">
          <Button
            className={user?.role === 'interviewer' ? 'hidden' : ''}
            variant="primary"
            onClick={onAssign}
          >
            Assign To
          </Button>
          <Button onClick={onUnassign} disabled={!candidate.assignment} variant="outline">
            Mark As Done
          </Button>

          {user?.role !== 'interviewer' && (
            <Button onClick={onAddFollowUp} variant="outline">
              {candidate?.followUp?.note || candidate?.followUp?.date
                ? 'Edit Follow Up'
                : 'Add A Follow Up'}
            </Button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {!hideEditButton && user?.role !== 'interviewer' && (
          <Button
            disabled={
              user?.role === 'candidate' && user.email !== candidate?.email
            }
            variant="secondary"
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
        {!hideCloseButtons && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
