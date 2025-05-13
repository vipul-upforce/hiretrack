"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArchiveRestore, Info, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import LoaderSkeleton from "./components/loader-skeleton";
import { Button } from "@/components/ui/button";
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
// import AddCustomFieldButton from "@/Custom_Fields/Components/AddCustomFieldButton";
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
  const router = useRouter();
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

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

    // Then update the database
    try {
      await updateJobStatus({
        id: draggableId,
        status: destination.droppableId,
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
            <div key={column.id} className="space-y-4 min-h-[50vh] h-full ">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    {column.title}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({column.jobs.length})
                    </span>
                    <span
                      className="ml-2 cursor-pointer"
                      onClick={() => alert("Job info")}
                    >
                      <i className="fas fa-info-circle" aria-hidden="true"></i>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <Droppable droppableId={column.id}>
                    {(provided: any) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3 min-h-full"
                      >
                        {isCreatingJob && column.id === "draft" && (
                          <div className="animate-pulse bg-muted/50 border rounded-lg p-3 shadow-sm">
                            <div className="h-5 w-2/3 bg-muted rounded mb-2"></div>
                            <div className="h-4 w-1/3 bg-muted rounded"></div>
                          </div>
                        )}

                        {column.jobs.map((job, index) => (
                          <Draggable
                            key={job._id}
                            draggableId={job._id}
                            index={index}
                          >
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-card flex justify-between border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => {
                                  router.push(`/dashboard/jobs/${job._id}`);
                                }}
                              >
                                <div className="text-wrap break-words w-[90%]">
                                  <h3 className="font-medium">{job.title}</h3>
                                  {/* <p className="text-sm text-muted-foreground">
                                    {job.company}
                                  </p> */}
                                  <p className="text-sm text-muted-foreground">
                                    {job.candidateCount} Candidates
                                  </p>
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedJob(job);
                                      setIsDetailsOpen(true);
                                    }}
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                  {!job.isDeleted ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive/90"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(job._id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-blue-500 hover:text-blue-500/90"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(job._id);
                                        setSelectedJob(job);
                                      }}
                                    >
                                      <ArchiveRestore className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
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
