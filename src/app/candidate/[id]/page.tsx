'use client';

import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import useRoles from '@/hooks/useRoles';
import { useFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import {
  AlertCircle,
  ArrowLeft,
  FileQuestion,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useParams, usePathname, useRouter, redirect } from 'next/navigation';
import { useEffect } from 'react';

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

  // Handle Admin/HR Redirect
  useEffect(() => {
    if (!candidate || !id) return;

    // If user is admin or hr → redirect to the job details view with candidateId
    if (candidate.jobId && (role === 'admin' || role === 'hr')) {
      router.replace(
        `/dashboard/jobs/${candidate.jobId._id}?candidateId=${id}`,
      );
    }
  }, [candidate, role, id, router]);

  // Handle 401 Unauthorized (Redirect to Login)
  useEffect(() => {
    if (isError && error) {
      const status = (error as FetchBaseQueryError)?.status;
      if (status === 401) {
        window.location.href = `/auth/login?redirect=${pathname}`;
      }
    }
  }, [isError, error, pathname]);


  // Loading State
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading candidate details...
          </p>
        </div>
      </div>
    );
  }

  // Error State Handling
  if (isError) {
    const fetchError = error as FetchBaseQueryError;
    const status = fetchError?.status;
    const errorData = fetchError?.data as { error?: string; message?: string };
    const errorMessage =
      errorData?.error || errorData?.message || 'An unexpected error occurred.';

    // Don't render error UI if we are redirecting for 401
    if (status === 401) return null;

    // 403 Forbidden (Candidate viewing other candidate's profile)
    if (status === 403) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md border-destructive/20 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">
                Access Denied
              </CardTitle>
              <CardDescription className="pt-2 text-base text-foreground">
                {errorMessage}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // 404 Not Found
    if (status === 404) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md shadow-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileQuestion className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Candidate Not Found</CardTitle>
              <CardDescription>
                The candidate profile you are looking for does not exist or has
                been deleted.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center pb-6">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Generic Error (500 or unknown)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50 shadow-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription className="pt-2">{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-4 pb-6">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="h-[100dvh] w-screen">
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
