import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { Candidate } from '@/types/candidate';
import { UpdateRemarkRequest } from '@/lib/features/candidate/candidateApi';

/**
 * Custom hook to handle the update of a candidate's remark.
 *
 * @param pathname Current pathname, e.g. from usePathname().
 * @returns The handler function to perform the update.
 */
export function useHandleRemarkUpdate(pathname: string | null) {
  /**
   * Updates the candidate remark and manages related UI/data updates.
   *
   * @param id Candidate or job id
   * @param description Remark description
   * @param setIsEditRemarkDialogOpen Setter for closing the dialog
   * @param remarkRatingHistory Latest remark/rating
   * @param refetchAssignment Callback to refetch assignments (if required)
   * @param refetch Generic refetch callback
   * @param onUpdate Callback to run after update
   * @param localCandidate Current candidate object
   * @param updateRemark API function to update the remark
   * @param isPrivate Whether the remark is private
   */
  return async function handleRemarkUpdate(
    id: string,
    description: string,
    setIsEditRemarkDialogOpen: (x: boolean) => void,
    remarkRatingHistory: number | null,
    refetchAssignment: () => void,
    refetch: () => void,
    onUpdate: (x: Candidate) => void,
    localCandidate: Candidate,
    updateRemark: (data: UpdateRemarkRequest) => {
      unwrap: () => Promise<void>;
    },
    isPrivate?: boolean,
  ): Promise<void> {
    setIsEditRemarkDialogOpen(false);

    try {
      await updateRemark({
        id,
        isPrivate,
        description,
        rating: remarkRatingHistory,
      }).unwrap();

      if (pathname === '/dashboard') {
        refetchAssignment?.();
      }
      if (pathname !== '/dashboard' && pathname !== '/dashboard/calendar') {
        refetch();
      }

      if (onUpdate && localCandidate) {
        onUpdate(localCandidate);
      }

      toast({
        title: 'Success',
        description: 'Remark status updated successfully',
      });
    } catch (e) {
      logger.error('Failed to update remark:', e);
      toast({
        title: 'Error',
        description: 'Failed to update remark. Please try again.',
        variant: 'destructive',
      });
    }
  };
}
