import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { Candidate } from '@/types/candidate';
import { usePathname } from 'next/navigation';

export default async function handleRemarkUpdate(
  id: string,
  description: string,
  setIsEditRemarkDialogOpen: (x: boolean) => void,
  remarkRatingHistory: number | null,
  refetchAssignment: () => void,
  refetch: () => void,
  onUpdate: (x: Candidate) => void,
  localCandidate: Candidate,
  isPrivate?: boolean,
) {
  setIsEditRemarkDialogOpen(false);
  const pathname = usePathname();
  try {
    const response = await fetch('/api/candidates/history', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        isPrivate,
        description,
        rating: remarkRatingHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update remark');
    }

    await response.json();

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
