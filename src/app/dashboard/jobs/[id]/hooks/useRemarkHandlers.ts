/* eslint-disable max-lines */
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateRemarkMutation,
} from '@/lib/features/candidate/candidateApi';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { User } from '@/lib/features/users/usersApi';
import { usePathname } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import logger from '@/lib/logger';

export const useRemarkHandlers = (
  localCandidate: Candidate | null,
  user: User | null,
  refetch: () => void,
  refetchAssignment?: () => void,
  onUpdate?: (candidate: Candidate) => void,
  refetchCandidates?: () => void,
) => {
  const pathname = usePathname();
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [updateCandidateRemark] = useUpdateCandidateRemarkMutation();
  const [newRemark, setNewRemark] = useState('');

  const [newFollowUp, setNewFollowUp] = useState(
    localCandidate?.followUp?.note && localCandidate?.followUp?.note.length > 1
      ? localCandidate?.followUp?.note
      : '',
  );
  const [newFollowUpDate, setNewFollowUpDate] = useState<Dayjs | null>(
    localCandidate?.followUp?.date &&
      (localCandidate?.followUp?.date as string).length > 1
      ? dayjs(localCandidate?.followUp?.date)
      : null,
  );
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null,
  );
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [isRemarkSubmitting, setIsRemarkSubmitting] = useState(false);
  const [isFollowUpSubmitting, setIsFollowUpSubmitting] = useState(false);
  const [MADFollowup, setMADFollowup] = useState<string | null>(null);
  useEffect(() => {
    if (user?.role === 'interviewer') {
      setIsSubRemarkPrivate(false);
    }
  }, [user]);

  // Update follow-up state when candidate data changes
  useEffect(() => {
    if (
      localCandidate?.followUp?.note &&
      localCandidate?.followUp?.note.length > 1
    ) {
      setNewFollowUp(localCandidate.followUp.note);
    } else {
      handleAddFollowUp;
      setNewFollowUp('');
    }

    if (
      localCandidate?.followUp?.date &&
      (localCandidate?.followUp?.date as string).length > 1
    ) {
      setNewFollowUpDate(dayjs(localCandidate.followUp.date));
    } else {
      setNewFollowUpDate(null);
    }
  }, [localCandidate?.followUp?.note, localCandidate?.followUp?.date]);

  const handleRemarkUpdate = async (
    id: string,
    description: string,
    isPrivate?: boolean,
  ) => {
    try {
      await updateCandidateRemark({
        id,
        isPrivate,
        description,
        rating: remarkRatingHistory,
      }).unwrap();

      if (pathname === '/dashboard' && !pathname?.startsWith('/candidate')) {
        refetchAssignment?.();
      }
      if (
        pathname !== '/dashboard' &&
        pathname !== '/dashboard/calendar' &&
        !pathname?.startsWith('/candidate')
      ) {
        await refetch();
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

  const handleAddRemark = async (selectedMentionUserIds?: string[]) => {
    if (!newRemark.trim() || !user?.id) {
      toast({
        title: 'Error',
        description: 'Please add remarks',
        variant: 'destructive',
      });
      return;
    }

    setIsRemarkSubmitting(true);
    try {
      const newRemarkObj = {
        description: String(newRemark).trim(),
        date: new Date().toISOString(),
        rating: remarkRating ? Number(remarkRating) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      const newRemarkHistoryObj = {
        isPrivate: isSubRemarkPrivate,
        description: String(newRemark).trim(),
        date: new Date().toISOString(),
        rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
        selectedMentionUserIds: selectedMentionUserIds || [], // Store selected mention user IDs
      };
      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        remark: newRemarkHistoryObj,
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user!.id,
        title: null,
        note: {
          description: '',
          date: '',
          rating: 0,
          userId: null,
        },
        attachments: [],
      };
      const updateData = {
        _id: localCandidate?._id,
        name: localCandidate?.name,
        jobId: localCandidate?.jobId,
        remarks: [...(localCandidate?.remarks || []), newRemarkObj],
      };

      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());

      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result && pathname !== '/dashboard/calendar') {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdate(result);
      }
      if (onUpdate && localCandidate) {
        await onUpdate(localCandidate);
      }

      if (pathname === '/dashboard/search') {
        await refetchCandidates?.();
        await refetch();
      }
      if (
        pathname !== '/dashboard' &&
        !pathname?.endsWith('calendar') &&
        !pathname?.startsWith('/candidate')
      ) {
        await refetch();
      }
      if (pathname === '/dashboard' && !pathname?.startsWith('/candidate')) {
        await refetchAssignment?.();
      }
      setNewRemark('');
      setRemarkRating(null);
      setRemarkRatingHistory(null);

      toast({
        title: 'Success',
        description: 'Remark added successfully',
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsRemarkSubmitting(false);
    }
  };
  const handleRemoveFollowUp = async () => {
    setIsFollowUpSubmitting(true);
    try {
      const newFollowUpObj = {
        note: null,
        date: null,
        userId: {
          _id: user?.id,
          name: user?.name,
          email: user?.email,
        },
      };

      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user!.id,
        title: 'Followup Removed',
        note: {
          description: '',
          date: '',
          rating: 0,
          userId: null,
        },
        attachments: [],
      };
      const updateData = {
        _id: localCandidate?._id,
        name: localCandidate?.name,
        followUp: newFollowUpObj,
      };

      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result && pathname !== '/dashboard/calendar') {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdate(result);
      }
      if (onUpdate && localCandidate) {
        await onUpdate(localCandidate);
      }
      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());
      if (pathname === '/dashboard/search') {
        // debugger;
        await refetchCandidates?.();
        await refetch();
      }
      if (
        pathname !== '/dashboard' &&
        !pathname?.endsWith('calendar') &&
        !pathname?.startsWith('/candidate')
      ) {
        await refetch();
      }
      if (pathname === '/dashboard' && !pathname?.startsWith('/candidate')) {
        await refetchAssignment?.();
        await refetch();
      }
      setNewFollowUp('');
      setNewFollowUpDate(null);

      toast({
        title: 'Success',
        description: 'Followup removed successfully',
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsFollowUpSubmitting(false);
    }
  };
  const handleAddFollowUp = async () => {
    if (!newFollowUp.trim() && !newFollowUpDate?.toISOString()) {
      toast({
        title: 'Error',
        description: 'Please provide either a follow-up note or a date.',
        variant: 'destructive',
      });
      return;
    }
    // debugger;
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Please add the follow-up note.',
        variant: 'destructive',
      });
      return;
    }
    setIsFollowUpSubmitting(true);
    try {
      const followUpSeparator = '|||||\n'; // Matches regex separator

      const combinedNote = MADFollowup
        ? `${newFollowUp.trim()}${followUpSeparator}${MADFollowup}`
        : newFollowUp.trim();

      const newFollowUpObj = {
        // note: String(newFollowUp).trim(),
        note: combinedNote,
        date: newFollowUpDate?.toISOString() || '',
        // rating: remarkRating ? Number(remarkRating) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      setMADFollowup(null);

      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user!.id,
        title: 'Followup Created',
        note: {
          description: newFollowUp,
          date: newFollowUpDate?.toISOString() || '',
          rating: 0,
          userId: null,
        },
        attachments: [],
      };
      const updateData = {
        _id: localCandidate?._id,
        name: localCandidate?.name,
        followUp: newFollowUpObj,
      };

      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result && pathname !== '/dashboard/calendar') {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdate(result);
      }
      if (onUpdate && localCandidate) {
        await onUpdate(localCandidate);
      }
      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());
      if (pathname === '/dashboard/search') {
        // debugger;
        await refetchCandidates?.();
        await refetch();
      }
      if (
        pathname !== '/dashboard' &&
        !pathname?.endsWith('calendar') &&
        !pathname?.startsWith('/candidate')
      ) {
        await refetch();
      }
      if (pathname === '/dashboard' && !pathname?.startsWith('/candidate')) {
        await refetchAssignment?.();
        await refetch();
      }
      setNewFollowUp('');
      setNewFollowUpDate(null);

      toast({
        title: 'Success',
        description: 'Followup created successfully',
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsFollowUpSubmitting(false);
    }
  };

  return {
    newRemark,
    setNewRemark,
    remarkRating,
    setRemarkRating,
    remarkRatingHistory,
    setRemarkRatingHistory,
    isSubRemarkPrivate,
    setIsSubRemarkPrivate,
    handleRemarkUpdate,
    isRemarkSubmitting,
    handleAddRemark,
    handleAddFollowUp,
    setNewFollowUp,
    setNewFollowUpDate,
    newFollowUp,
    newFollowUpDate,
    MADFollowup,
    setMADFollowup,
    handleRemoveFollowUp,
    isFollowUpSubmitting,
  };
};
