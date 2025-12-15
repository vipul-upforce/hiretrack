'use client';

import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { toast } from '@/hooks/use-toast';
import useRoles from '@/hooks/useRoles';
import {
  useParams, usePathname, useRouter, redirect,
} from 'next/navigation';
import { useEffect } from 'react';
import { useFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';

export default function CandidateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const role = useRoles();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const {
    data: candidate,
    isLoading,
    isError,
    error,
  } = useFetchCandidateByIdQuery(id!, {
    skip: !id,
  });

  // Handle unauthorized redirect or job redirect
  useEffect(() => {
    if (!candidate || !id) return;

    // If user is admin or hr → redirect to the job details view with candidateId
    if (candidate.jobId && (role === 'admin' || role === 'hr')) {
      router.replace(
        `/dashboard/jobs/${candidate.jobId._id}?candidateId=${id}`,
      );
    }
  }, [candidate, role, id, router]);

  // Error / Unauthorized handling
  useEffect(() => {
    if (isError) {
      const status = (error as any)?.status;
      if (status === 401) {
        router.push(`/auth/login?redirect=${pathname}`);
        return;
      }

      toast({
        title: 'Error',
        description: 'Failed to load the candidate.',
        variant: 'destructive',
      });
    }
  }, [isError, error, pathname, router]);

  if (isLoading) return <div>Loading candidate details...</div>;
  if (!candidate) return <div>Candidate not found.</div>;

  return (
    <div className="w-screen h-[100dvh]">
      <CandidateDetailsDialog
        candidate={candidate}
        isOpen
        onOpenChange={() => {
          redirect(`/dashboard/jobs/${candidate?.jobId?._id}`);
        }}
        onUpdate={() => {
          window.location.reload();
        }}
        hideCloseButtons
      />
    </div>
  );
}
