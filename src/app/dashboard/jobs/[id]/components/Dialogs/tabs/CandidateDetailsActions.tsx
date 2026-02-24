/**
 * Action Buttons Component for Candidate Details Dialog Footer
 * Displays action buttons based on user role and context
 */

import { Button } from '@/components/ui/button';
import { Candidate } from '@/types/candidate';
import { useAuth } from '@/app/hooks/useAuth';

interface CandidateDetailsActionsProps {
  candidate: Candidate;
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
  const { userRole, email } = useAuth();
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
    <div className="flex w-full justify-between">
      {userRole !== 'candidate' && (
        <div className="flex gap-2">
          <Button
            className={userRole === 'interviewer' ? 'hidden' : ''}
            variant="primary"
            onClick={onAssign}
          >
            Assign To
          </Button>
          <Button
            onClick={onUnassign}
            disabled={!candidate.assignment}
            variant="outline"
          >
            Mark As Done
          </Button>

          {userRole !== 'interviewer' && (
            <Button onClick={onAddFollowUp} variant="outline">
              {candidate?.followUp?.note || candidate?.followUp?.date
                ? 'Edit Follow Up'
                : 'Add A Follow Up'}
            </Button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {!hideEditButton && userRole !== 'interviewer' && (
          <Button
            disabled={userRole === 'candidate' && email !== candidate?.email}
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
