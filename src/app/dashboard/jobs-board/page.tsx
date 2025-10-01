"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { DragDropContext } from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useContext, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { CustomFieldsContext } from "@/Custom_Fields/Context";
import CustomFieldDialog from "@/Custom_Fields/Components/Common/CustomFieldDialog";
import Stepper from "@/Custom_Fields/Components/Stepper";
import DefaultLanesButton from "./components/DefaultLanesButton";
import { useSelector } from "react-redux";
import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import { JobEmailNotificationSettingsDialog } from "@/components/dialogs/JobEmailNotificationSettingsDialog";
interface User {
  role: string;
  organizationId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  jobs: Job[];
}

// Dialog component that auto-selects job position form
function JobCustomFieldsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const context = useContext(CustomFieldsContext);
  const {
    setStepName,
    customFields,
    stepName,
    selectedFormId,
    selecteFormIdTarget,
  } = context;
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  // Auto-select job position form when dialog opens
  useEffect(() => {
    if (
      isOpen &&
      !hasAutoSelected &&
      customFields &&
      Object.keys(customFields).length > 0
    ) {
      console.log("Attempting to auto-select job position form...");

      // Find the "job position" form ID
      const jobPositionFormEntry = Object.entries(customFields).find(
        ([_, form]) => {
          console.log(
            "Checking form:",
            form.formName,
            "normalized:",
            form.formName.toLowerCase()
          );
          return form.formName.toLowerCase() === "job position";
        }
      );

      if (jobPositionFormEntry) {
        const [formId] = jobPositionFormEntry;
        console.log("Found job position form, selecting:", formId);
        selecteFormIdTarget(formId);
        setStepName("formCustomFieldList");
        setHasAutoSelected(true);
      } else {
        console.log("No job position form found, staying on FormList");
        setStepName("FormList");
        setHasAutoSelected(true);
      }
    }
  }, [isOpen, hasAutoSelected, customFields, selecteFormIdTarget, setStepName]);

  const handleClose = useCallback(() => {
    console.log("JobCustomFieldsDialog closing, resetting to FormList");
    setStepName("FormList");
    setHasAutoSelected(false);
    onClose();
  }, [setStepName, onClose]);

  // Reset auto-selection flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasAutoSelected(false);
    }
  }, [isOpen]);

  return (
    <CustomFieldDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Personalized form fields"
    >
      <Stepper />
    </CustomFieldDialog>
  );
}

function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  // const [user, setUser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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
  const { data: users } = useGetUsersQuery();
  // const router = useRouter();
  const [updateJobStatus] = useUpdateJobStatusMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [selectedJobForEmailSettings, setSelectedJobForEmailSettings] =
    useState<Job | null>(null);
  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setUser(decryptedResponse.user);
  //       }
  //     }
  //   })();
  // }, []);

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

  const handleEmailSettingsClick = (job: Job) => {
    setSelectedJobForEmailSettings(job);
    setIsEmailSettingsOpen(true);
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
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title */}
            <CardTitle className="line-clamp-2 md:mr-2 text-xl font-bold">
              Job Positions
            </CardTitle>

            {/* Right Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              {/* Show Archived */}
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <DefaultLanesButton userRole={user?.role} />
                <Button
                  variant="outline"
                  onClick={() => setIsCustomFieldsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Personalized form fields
                </Button>
                <CreateJobDialog
                  onJobCreated={handleJobCreated}
                  userRole={user?.role}
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* <CandidatesPage /> */}
      <div className="flex-1 overflow-hidden px-4 pb-4 mt-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
            <div className="h-full flex gap-1  min-w-full">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  isCreatingJob={isCreatingJob}
                  setSelectedJob={setSelectedJob}
                  setIsDetailsOpen={setIsDetailsOpen}
                  setIsEditMode={setIsEditMode}
                  handleDeleteClick={handleDeleteClick}
                  setDuplicate={setDuplicate}
                  onEmailSettingsClick={handleEmailSettingsClick}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>

      <JobDetailsDialog
        job={selectedJob}
        isOpen={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setIsEditMode(false);
          }
        }}
        userRole={user?.role}
        onJobUpdate={handleJobUpdate}
        isEditMode={isEditMode}
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

      {/* Custom Fields Dialog */}
      <JobCustomFieldsDialog
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
      />

      {/* Job Email Notification Settings Dialog */}
      {selectedJobForEmailSettings && (
        <JobEmailNotificationSettingsDialog
          isOpen={isEmailSettingsOpen}
          onOpenChange={setIsEmailSettingsOpen}
          jobId={selectedJobForEmailSettings._id}
          jobTitle={selectedJobForEmailSettings.title}
        />
      )}
    </div>
  );
}

export default KanbanPage;

// export default withAuthGuard(KanbanPage, {
//   requiredRoles: ["admin", "hr"],
//   fallbackPath: "/dashboard",
//   checkAllowance: false,
//   allowAuthenticated: true,
// });
