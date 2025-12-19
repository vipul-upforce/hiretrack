import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { Candidate } from '@/types/candidate';
import { usePathname } from 'next/navigation';
import { UpdateRemarkRequest } from '@/lib/features/candidate/candidateApi';

export default async function handleRemarkUpdate(
  id: string,
  description: string,
  setIsEditRemarkDialogOpen: (x: boolean) => void,
  remarkRatingHistory: number | null,
  refetchAssignment: () => void,
  refetch: () => void,
  onUpdate: (x: Candidate) => void,
  localCandidate: Candidate,
  updateRemark: (data: UpdateRemarkRequest) => { unwrap: () => Promise<void> },
  isPrivate?: boolean,
) {
  setIsEditRemarkDialogOpen(false);
  const pathname = usePathname();

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
}
