"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { DragDropContext } from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { CreateJobDialog } from "./components/create-job-dialog";
import { JobDetailsDialog } from "./components/job-details-dialog";
import { initialColumns } from "./data/initial-data";
import { Job } from "@/types/job";
import {
  useCreateJobMutation,
  useFetchJobsQuery,
  useUpdateJobStatusMutation,
  useDeleteJobMutation,
} from "@/lib/features/job/jobApi";
import { toast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import LoaderSkeleton from "./components/loader-skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
// import withAuthGuard from "@/components/withAuthGuard";
// import { NextPage } from "next";
import KanbanColumn from "./components/kanban-column";
interface User {
  role: string;
  organizationId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  jobs: Job[];
}

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [user, setUser] = useState<User | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [createJob] = useCreateJobMutation();
  const {
    data: jobs,
    error,
    isLoading,
    refetch,
  } = useFetchJobsQuery(undefined, {
    skip: !user,
  });
  // const router = useRouter();
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      refetch(); // Refetch jobs when user changes
    }
  }, [user, refetch]);
  useEffect(() => {
    if (selectedJob && duplicate) {
      handleJobCreated({ ...selectedJob, status: "draft", isPublished: false });
      setDuplicate(false);
    }
  }, [selectedJob, duplicate]);

  useEffect(() => {
    if (jobs) {
      const initialColumnsWithJobs = initialColumns.map((column) => ({
        ...column,
        jobs: jobs.filter(
          (job) =>
            job.status === column.id &&
            (showArchived ? job.isDeleted : !job.isDeleted)
        ),
      }));
      setColumns(initialColumnsWithJobs);
    }
  }, [jobs, showArchived]);

  const handleJobCreated = async (newJob: Omit<Job, "id">) => {
    setIsCreatingJob(true);
    const job: Job = {
      ...newJob,
      _id: Math.random().toString(36).substr(2, 9),
      organizationId: user!.organizationId,
      candidateCount: 0,
    };

    try {
      toast({
        title: "Uploading Documents",
        description: "It can take while if its big file",
      });
      const res = (await createJob(job).unwrap()) as unknown;

      if (res) {
        await refetch(); // Wait for refetch to complete
        toast({
          title: "Success",
          description: "Job created successfully",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to create job",
      });
    } finally {
      setIsCreatingJob(false);
    }
  };

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find(
      (col) => col.id === destination.droppableId
    );

    if (!sourceColumn || !destColumn) return;

    // Update local state first
    const newColumns = [...columns];
    const sourceJobs = [...sourceColumn.jobs];

    const destJobs =
      source.droppableId === destination.droppableId
        ? sourceJobs
        : [...destColumn.jobs];

    const [removed] = sourceJobs.splice(source.index, 1);
    const updatedJob = {
      ...removed,
      status: destination.droppableId,
    };

    destJobs.splice(destination.index, 0, updatedJob);

    newColumns.forEach((col) => {
      if (col.id === source.droppableId) {
        col.jobs = sourceJobs;
      }
      if (col.id === destination.droppableId) {
        col.jobs = destJobs;
      }
    });

    setColumns(newColumns);

    if (showArchived) {
      return;
    }
    // Then update the database
    try {
      await updateJobStatus({
        id: draggableId,
        status: destination.droppableId,
        openJobCardsOrder:
          newColumns
            .find((col) => col.id === "open")
            ?.jobs.map((job) => job._id) || [],
      }).unwrap();
    } catch {
      // Revert the local state if the API call fails
      const revertColumns = [...columns];
      setColumns(revertColumns);

      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const handleJobUpdate = (updatedJob: Job) => {
    const newColumns = columns.map((column) => ({
      ...column,
      jobs: column.jobs.map((job) =>
        job._id === updatedJob._id
          ? { ...updatedJob, candidateCount: updatedJob.candidateCount || 0 }
          : job
      ),
    }));

    setColumns(newColumns);
  };

  const handleDeleteClick = (jobId: string) => {
    setJobToDelete(jobId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    try {
      await deleteJob(jobToDelete).unwrap();

      setSelectedJob(null);
      toast({
        title: "Success",
        description: `Job Action Applied successfully.`,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete job position",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  if (isLoading) return <LoaderSkeleton />;

  if (error) return <div>Error loading jobs</div>;

  return (
    <div className="w-full max-w-full space-y-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Job Positions</CardTitle>
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showArchived"
                checked={showArchived}
                onCheckedChange={(checked) =>
                  setShowArchived(checked as boolean)
                }
              />
              <label
                htmlFor="showArchived"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show Archived
              </label>
            </div>
            <CreateJobDialog
              onJobCreated={handleJobCreated}
              userRole={user?.role}
            />
          </div>
        </CardHeader>
      </Card>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              isCreatingJob={isCreatingJob}
              setSelectedJob={setSelectedJob}
              setIsDetailsOpen={setIsDetailsOpen}
              handleDeleteClick={handleDeleteClick}
              setDuplicate={setDuplicate}
            />
          ))}
        </div>
      </DragDropContext>

      <JobDetailsDialog
        job={selectedJob}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        userRole={user?.role}
        onJobUpdate={handleJobUpdate}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the job position and make it active again for
              candidates to view and apply. You can archive it again later if
              needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={
                !selectedJob?.isDeleted
                  ? "bg-destructive hover:bg-destructive/90"
                  : "text-blue-500 bg-blue hover:bg-blue hover:text-blue-500/90"
              }
            >
              {selectedJob?.isDeleted ? "Unarchive" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// export default withAuthGuard(KanbanPage, {
//   requiredRoles: ["admin", "hr"],
//   fallbackPath: "/dashboard",
//   checkAllowance: false,
//   allowAuthenticated: true,
// });
