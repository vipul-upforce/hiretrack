"use client";

import {
  DragDropContext,
  Droppable,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { useState, useEffect, useMemo, useCallback } from "react";
import { CreateCandidateDialog } from "./components/Dialogs/create-candidate-dialog";
import { CreateLaneDialog } from "./components/Dialogs/create-lane-dialog";
import { CandidateDetailsDialog } from "./components/Dialogs/candidate-details-dialog";
import { initialCandidateColumns } from "./data/initial-data";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from "@/lib/features/job/jobApi";
import { useFetchCandidatesQuery } from "@/lib/features/candidate/candidateApi";
import { Candidate, CandidateColumn, CandidateStatus } from "@/types/candidate";
import LoaderSkeleton from "./components/Lanes/loader-skeleton";
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from "@/lib/features/lane/laneApi";
import { useGetJobLaneConfigQuery } from "@/lib/features/checklist/checklistApi";
import { Breadcrumb } from "./components/Utils/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import { KanbanColumn } from "./components/Lanes/KanbanColumn";
import { useKanbanBoard } from "./hooks/useKanbanBoard";
import { useDragToScroll } from "./hooks/useDragToScroll";
import { useCandidate } from "./hooks/useCandidate";
import ConfirmationDialog from "./components/Dialogs/ConfirmationDialog";
import NoDataFound from "@/app/not-found";
import EditLaneDialog from "./components/Lanes/edit-lane-dialog";
import { useSSE } from "@/hooks/useSSE";
import { mergeRefs } from "react-merge-refs";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickSelectAndFilter } from "./components/QuickSelectAndFilter";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  BarChart3,
  MoreHorizontal,
  Plus,
  Edit,
  Mail,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { JobAnalyticsModal } from "../../jobs-board/components/JobAnalyticsModal";
import { JobEmailNotificationSettingsDialog } from "@/components/dialogs/JobEmailNotificationSettingsDialog";
import ChecklistRemarksDialog from "./components/Dialogs/checklist-remarks-dialog";
import { LaneChecklistConfigDialog } from "./components/Dialogs/lane-checklist-config-dialog";
import { useSelector } from "react-redux";
import { MigrationDialog } from "./components/Dialogs/MigrationDialog";
import JobSpecificCustomFieldFormWrapper from "./components/customFields/JobSpecificCustomFIeldFormWrapper";
import CandidateCustomFieldsDialog from "./components/customFields/candidateCustomFieldsDialog";
import { GlobalRemarksDialog } from "./components/Dialogs/global-remarks-dialog";

interface FilterState {
  search: string;
  logicalOperator: "AND" | "OR";
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
}

export default function JobProgressPage() {
  const id = useParams()?.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const candidateIdParam = searchParams.get("candidateId");

  const [columns, setColumns] = useState<CandidateColumn[]>(
    initialCandidateColumns
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // const [user, setUser] = useState<User | null>(null);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null
  );
  const [isConfirmLaneDeleteOpen, setIsConfirmLaneDeleteOpen] = useState(false);
  const [laneToEdit, setLaneToEdit] = useState<string | null>(null);
  const [initialLaneToEdit, setInitialLaneToEdit] = useState<string | null>(
    null
  );
  const [isChecklistConfigOpen, setIsChecklistConfigOpen] = useState(false);
  const [checklistConfigLane, setChecklistConfigLane] = useState<{
    laneId: string;
    laneName: string;
    initialTab?: "incoming" | "outgoing";
  } | null>(null);

  // Handler for configuring checklist
  const handleConfigureChecklist = useCallback(
    (
      laneId: string,
      laneName: string,
      initialTab?: "incoming" | "outgoing"
    ) => {
      setChecklistConfigLane({ laneId, laneName, initialTab });
      setIsChecklistConfigOpen(true);
    },
    []
  );

  const [filterConditions, setFilterConditions] = useState<FilterState | null>(
    null
  );
  const { user } = useSelector((state: any) => state.auth || {});

  const {
    ref: scrollRef,
    setIsDndDragging,
    isDragging,
  } = useDragToScroll<HTMLDivElement>();

  const { candidates: sseCandidates, lanes: updatedLanes } = useSSE(
    user?.role || "",
    setSelectedCandidate,
    selectedCandidate,
    id
  );

  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useFetchJobByIdQuery(id as string);

  const [promptForStatusChangeReason, setPromptForStatusChangeReason] =
    useState(job?.promptForStatusChangeReason || false);
  const {
    data: candidatesFromQuery,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(id as string);
  const [updateJob, { isLoading }] = useUpdateJobMutation();
  // NEW: Use job-specific lanes with fallback to user lanes
  const {
    data: jobLanes,
    isLoading: isJobLanesLoading,
    error: jobLanesError,
  } = useGetJobLanesQuery(id as string, { skip: !id });
  const { data: userLanes, isLoading: isUserLanesLoading } = useGetLanesQuery(
    { userId: user?.id, jobId: id as string },
    { skip: !user?.id || !id }
  );

  // Use job-specific lanes if available, fallback to user lanes
  const lanes = jobLanes || userLanes;
  const isLanesLoading = isJobLanesLoading || isUserLanesLoading;

  // Fetch job lane configuration for checklist indicators
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(id as string, {
    skip: !id,
  });

  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLaneEditOpen, setIsLaneEditOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isPromptConfirmOpen, setIsPromptConfirmOpen] = useState(false);
  const [pendingPromptValue, setPendingPromptValue] = useState(false);

  const {
    handleAddLane,
    handleDeleteLane,
    handleEditLaneClick,
    handleEditLane,
    handleConfirmDeleteLane,
    handleMigrateAndDeleteLane,
    migrationLanes,
    isMigrationDialogOpen,
    setIsMigrationDialogOpen,
    laneToDelete,
    setLaneToDelete,
  } = useKanbanBoard({
    columns,
    setColumns,
    user,
    jobId: id, // NEW: Pass jobId for job-specific operations
    setIsConfirmLaneDeleteOpen,
    setIsLaneEditOpen,
    refetch,
  });

  const {
    onDragEnd,
    handleFileDrop,
    handleCandidateUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
  } = useCandidate({
    columns,
    setColumns,
    user,
    setOpenRemarksFor,
    setIsDialogOpen,
    setDroppedFileData,
    setCandidateToDelete,
    setIsDeleteDialogOpen,
    setSelectedCandidate,
    selectedCandidate,
    refetch,
    candidateToDelete,
    jobLaneConfig,
    job,
    // promptForStatusChangeReason,
  });

  // Merge candidatesFromQuery and sseCandidates
  const mergedCandidates = useMemo(() => {
    const candidateMap = new Map<string, Candidate>(
      candidatesFromQuery?.map((c) => [c._id, c]) || []
    );

    // Update or add candidates from SSE
    sseCandidates.forEach((sseCandidate) => {
      candidateMap.set(sseCandidate._id, sseCandidate);
    });

    return Array.from(candidateMap.values());
  }, [candidatesFromQuery, sseCandidates]);

  // useEffect(() => {
  //   console.log("Loading states:", {
  //     isJobLoading,
  //     isCandidatesLoading,
  //     isLanesLoading,
  //     jobError,
  //   });
  //   console.log("Data:", { job, candidatesFromQuery, lanes });
  //   console.log("scrollRef.current:", scrollRef.current);
  // }, [
  //   isJobLoading,
  //   isCandidatesLoading,
  //   isLanesLoading,
  //   jobError,
  //   job,
  //   candidatesFromQuery,
  //   lanes,
  //   scrollRef,
  // ]);

 

  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Handle candidateId URL parameter to auto-open candidate dialog
  useEffect(() => {
    if (candidateIdParam && candidatesFromQuery && !selectedCandidate) {
      const candidate = candidatesFromQuery.find(
        (c) => c._id === candidateIdParam
      );
      if (candidate) {
        setSelectedCandidate(candidate);
        setIsDetailsOpen(true);
      }
    }
  }, [candidateIdParam, candidatesFromQuery, selectedCandidate]);

  // Handle candidate details dialog close - clean up URL parameter
  const handleCandidateDialogClose = (open: boolean) => {
    setIsDetailsOpen(open);
    if (!open && candidateIdParam) {
      // Remove candidateId parameter from URL when dialog is closed
      const params = new URLSearchParams(searchParams.toString());
      params.delete("candidateId");
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/dashboard/jobs/${id}${newUrl}`, { scroll: false });
    }
  };

  // Combine candidates from useFetchCandidatesQuery and useSSE
  useEffect(() => {
    if (candidatesFromQuery && lanes) {
      let currentCandidates = [...mergedCandidates];

      // Apply filter conditions if they exist
      if (filterConditions) {
        currentCandidates = currentCandidates.filter((candidate) => {
          // Apply text search
          if (filterConditions.search) {
            const searchLower = filterConditions.search.toLowerCase();
            const matchesSearch =
              candidate.name.toLowerCase().includes(searchLower) ||
              candidate.skills.some((skill) =>
                skill.toLowerCase().includes(searchLower)
              ) ||
              candidate.experience.toString().includes(searchLower) ||
              (candidate.assignment?.interviewerId as any)?.name
                ?.toLowerCase()
                .includes(searchLower) ||
              candidate.location.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
          }

          // Apply other filters
          const activeFilters = [
            {
              key: "topCandidates",
              filter: (candidate: Candidate) =>
                candidate.scores?.overall && candidate.scores.overall >= 7,
            },
            {
              key: "appliedThisWeek",
              filter: (candidate: Candidate) => {
                if (!candidate.tracking?.createdAt) return false;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return new Date(candidate.tracking.createdAt) >= oneWeekAgo;
              },
            },
            {
              key: "appliedToday",
              filter: (candidate: Candidate) => {
                if (!candidate.tracking?.createdAt) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return (
                  new Date(candidate.tracking.createdAt) >= today &&
                  new Date(candidate.tracking.createdAt) < tomorrow
                );
              },
            },
            {
              key: "appliedIn15Days",
              filter: (candidate: Candidate) => {
                if (!candidate.tracking?.createdAt) return false;
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                return new Date(candidate.tracking.createdAt) >= fifteenDaysAgo;
              },
            },
            {
              key: "toFollowUp",
              filter: (candidate: Candidate) =>
                candidate.followUp && candidate.followUp.note,
            },
            {
              key: "assigned",
              filter: (candidate: Candidate) => candidate.assignment,
            },
            {
              key: "notAssigned",
              filter: (candidate: Candidate) => !candidate.assignment,
            },
            {
              key: "withRemarks",
              filter: (candidate: Candidate) =>
                candidate.remarks && candidate.remarks.length > 0,
            },
            {
              key: "withoutRemarks",
              filter: (candidate: Candidate) =>
                !candidate.remarks || candidate.remarks.length === 0,
            },
          ].filter(
            (filter) =>
              filterConditions[filter.key as keyof FilterState] === true
          );

          if (activeFilters.length > 0) {
            if (filterConditions.logicalOperator === "AND") {
              return activeFilters.every(({ filter }) => filter(candidate));
            } else {
              return activeFilters.some(({ filter }) => filter(candidate));
            }
          }

          return true;
        });
      }
      // Apply archived filter
      currentCandidates = currentCandidates.filter(
        (candidate) => showArchived || !candidate.isDeleted
      );

      // Handle different lane data structures
      let lanesArray;
      if (updatedLanes) {
        lanesArray = updatedLanes;
      } else if (jobLanes?.lanes) {
        lanesArray = [...jobLanes.lanes];
      } else if (userLanes?.lanes) {
        lanesArray = [...userLanes.lanes];
      } else {
        lanesArray = [
          "applied",
          "screening",
          "shortlisted",
          "processing",
          "accepted",
          "rejected",
        ];
      }

      lanesArray.forEach((lane) => {
        if (!initialCandidateColumns.find((item) => item.id === lane)) {
          initialCandidateColumns.push({
            id: lane as CandidateStatus,
            title: lane,
            candidates: [],
          });
        }
      });

      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);
        const candidates = currentCandidates.filter(
          (candidate) =>
            candidate.status === lane &&
            (showArchived ? candidate.isDeleted : !candidate.isDeleted)
        );

        return {
          id: lane as CandidateStatus,
          title: column?.title || lane,
          candidates: candidates,
        } as CandidateColumn;
      });

      setColumns(updatedColumns);
    }
  }, [mergedCandidates, lanes, updatedLanes, showArchived, filterConditions]);

  useEffect(() => {
    if (laneToEdit && initialLaneToEdit === null) {
      setInitialLaneToEdit(laneToEdit);
    }
  }, [laneToEdit]);

  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen]);



  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Fallback UI
  if (isJobLoading || isCandidatesLoading || isLanesLoading || !lanes) {
    return <LoaderSkeleton />;
  }

  if (jobError) {
    return <NoDataFound name={"Job"} />;
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ width: "100%" }}
    >
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Breadcrumb
            jobTitle={job?.title}
            links={[{ title: "Jobs", href: "/dashboard/jobs-board" }]}
          />

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[270px] mt-2" align="end">
                <div className="space-y-2 pt-4 pb-2 px-1">
                  {user?.role === "admin" && (
                    <div className="flex items-center  mx-4 gap-2 mb-2 mt-1">
                      <Checkbox
                        id="promptForStatusChangeReason"
                        checked={job.promptForStatusChangeReason}
                        disabled={isLoading}
                        onCheckedChange={(checked: boolean) => {
                          setPendingPromptValue(checked);
                          setIsPromptConfirmOpen(true);
                        }}
                      />
                      <label
                        htmlFor="promptForStatusChangeReason"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Prompt for status change reason
                      </label>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setIsCustomFieldsOpen(true)}
                    className="w-full justify-start gap-2"
                  >
                    <Settings2 className="h-4 w-4" />
                    Personalized form fields
                  </Button>
                  {user?.role === "admin" && (
                    <Button
                      variant="ghost"
                      onClick={() => setIsAnalyticsOpen(true)}
                      className="w-full justify-start gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setIsEmailSettingsOpen(true)}
                    className="w-full justify-start gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email Settings
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <CreateLaneDialog onAddLane={handleAddLane} />
            <CreateCandidateDialog
              jobId={id as string}
              isOpen={isDialogOpen}
              setIsOpen={setIsDialogOpen}
              resumeFile={droppedFileData}
            />
          </div>
        </div>
      </div>

      <QuickSelectAndFilter
        currentJobId={id}
        candidates={mergedCandidates}
        onFilterChange={setFilterConditions}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      {/* <CandidatesPage /> */}
      <div className="flex-1 overflow-hidden px-4 pb-2 pt-2">
        <DragDropContext
          onBeforeDragStart={() => {
            // Add a class to the body before drag starts to apply CSS fixes
            document.body.classList.add("dnd-dragging");
          }}
          onDragStart={(start) => {
            setIsDndDragging(true);
          }}
          onDragUpdate={(update) => {
            // No prevalidation needed - using client-side validation
          }}
          onDragEnd={(result: any) => {
            // Remove the class when drag ends
            document.body.classList.remove("dnd-dragging");
            setIsDndDragging(false);
            onDragEnd(result);
          }}
        >
          <Droppable droppableId="lanes" direction="horizontal" type="lane">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={mergeRefs([provided.innerRef, scrollRef])}
                className="h-full flex gap-1 overflow-x-auto"
              >
                {useMemo(
                  () =>
                    columns.map((column, index) => {
                      // Find the lane configuration for this column
                      const laneConfig = jobLaneConfig?.laneConfigs?.find(
                        (config) => config.laneId === column.id
                      );

                      return (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          index={index}
                          isDragging={isDragging}
                          isFileOver={isFileOver}
                          setIsFileOver={setIsFileOver}
                          handleFileDrop={handleFileDrop}
                          handleDeleteLane={handleDeleteLane}
                          handleEditLane={handleEditLaneClick}
                          setLaneToDelete={setLaneToDelete}
                          setLaneToEdit={setLaneToEdit}
                          refetch={refetch}
                          selectedCandidate={selectedCandidate}
                          setSelectedCandidate={setSelectedCandidate}
                          isDetailsOpen={isDetailsOpen}
                          setIsDetailsOpen={setIsDetailsOpen}
                          openRemarksFor={openRemarksFor}
                          setOpenRemarksFor={setOpenRemarksFor}
                          handleDeleteClick={handleDeleteClick}
                          onConfigureChecklist={handleConfigureChecklist}
                          pendingMoves={pendingMoves}
                          laneConfig={laneConfig}
                        />
                      );
                    }),
                  [
                    columns,
                    jobLaneConfig,
                    isDragging,
                    isFileOver,
                    setIsFileOver,
                    handleFileDrop,
                    handleDeleteLane,
                    handleEditLaneClick,
                    setLaneToDelete,
                    setLaneToEdit,
                    refetch,
                    selectedCandidate,
                    setSelectedCandidate,
                    isDetailsOpen,
                    setIsDetailsOpen,
                    openRemarksFor,
                    setOpenRemarksFor,
                    handleDeleteClick,
                    handleConfigureChecklist,
                    pendingMoves,
                  ]
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={handleCandidateDialogClose}
        onUpdate={handleCandidateUpdate}
      />

      <EditLaneDialog
        isEditLaneDialogOpen={isLaneEditOpen}
        setIsEditLaneDialogOpen={setIsLaneEditOpen}
        editingLane={laneToEdit ? laneToEdit : ""}
        prevLane={initialLaneToEdit || ""}
        setEditingLane={setLaneToEdit}
        handleLaneUpdate={handleEditLane}
        isLoading={false}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        title="Are you sure?"
        message={
          selectedCandidate?.isDeleted
            ? "This will unarchive this candidate. They will be visible in the regular view."
            : "This will archive this candidate. They will be hidden from the regular view."
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
        buttonName={selectedCandidate?.isDeleted ? "Unarchive" : "Archive"}
      />
      <ConfirmationDialog
        isOpen={isConfirmLaneDeleteOpen}
        setIsOpen={setIsConfirmLaneDeleteOpen}
        title="Are you sure?"
        message="This will remove the lane from this job only. Other jobs will not be affected."
        onConfirm={() => laneToDelete && handleConfirmDeleteLane(laneToDelete)}
        onCancel={() => setIsConfirmLaneDeleteOpen(false)}
      />

      <MigrationDialog
        isOpen={isMigrationDialogOpen}
        lanes={migrationLanes}
        onClose={() => setIsMigrationDialogOpen(false)}
        onMigrate={handleMigrateAndDeleteLane}
        laneToDelete={laneToDelete}
      />

      <ConfirmationDialog
        isOpen={isPromptConfirmOpen}
        setIsOpen={setIsPromptConfirmOpen}
        title="Confirm Setting Change"
        message={`Are you sure you want to ${pendingPromptValue ? "enable" : "disable"} prompting for status change reasons?`}
        onConfirm={async () => {
          setPromptForStatusChangeReason(pendingPromptValue);
          try {
            await updateJob({
              ...job,
              promptForStatusChangeReason: pendingPromptValue,
            });
          } catch (error) {
            console.error("Failed to update job:", error);
            setPromptForStatusChangeReason(!pendingPromptValue);
          }
          setIsPromptConfirmOpen(false);
        }}
        onCancel={() => setIsPromptConfirmOpen(false)}
        buttonName="Confirm"
      />

      {/* Custom Fields Dialog */}
      <CandidateCustomFieldsDialog
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
        jobId={id}
      />

      {/* Job Analytics Modal */}
      {job && user && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          job={job}
          organizationId={user?.organizationId || ""}
        />
      )}

      {/* Job Email Notification Settings Dialog */}
      {job && (
        <JobEmailNotificationSettingsDialog
          isOpen={isEmailSettingsOpen}
          onOpenChange={setIsEmailSettingsOpen}
          jobId={job._id}
          jobTitle={job.title}
        />
      )}

      {/* Checklist and Remarks Dialog */}
      {openRemarksFor &&
        (() => {
          const candidate = columns
            .flatMap((col) => col.candidates)
            .find((c) => {
              if (c._id === openRemarksFor) return true;
              if (openRemarksFor.startsWith("{")) {
                try {
                  const parsed = JSON.parse(openRemarksFor);
                  return parsed.candidateId === c._id;
                } catch (e) {
                  console.error(
                    "Failed to parse openRemarksFor JSON:",
                    openRemarksFor,
                    e
                  );
                  return false;
                }
              }
              return false;
            });

          if (!candidate) {
            console.error(
              "Candidate not found for openRemarksFor:",
              openRemarksFor
            );
            return null;
          }

          const checklistInfo = openRemarksFor.startsWith("{")
            ? openRemarksFor
            : undefined;

          if (!checklistInfo) {
            return null;
          }

          return (
            <ChecklistRemarksDialog
              candidate={candidate}
              isOpen={!!openRemarksFor}
              onOpenChange={(open) => !open && setOpenRemarksFor(null)}
              setOpenRemarksFor={setOpenRemarksFor}
              refetch={refetch}
              checklistInfo={checklistInfo}
              onChecklistSuccess={(candidateId) => {
                completePendingMove(candidateId);
              }}
              onChecklistCancel={cancelPendingMove}
            />
          );
        })()}

      {/* Lane Checklist Configuration Dialog */}
      {checklistConfigLane && (
        <LaneChecklistConfigDialog
          isOpen={isChecklistConfigOpen}
          onOpenChange={setIsChecklistConfigOpen}
          jobId={id}
          laneId={checklistConfigLane.laneId}
          laneName={checklistConfigLane.laneName}
          initialTab={checklistConfigLane.initialTab}
        />
      )}

      {/* Global Remarks Dialog - Stays mounted even when cards are virtualized */}
      <GlobalRemarksDialog
        openRemarksFor={openRemarksFor}
        setOpenRemarksFor={setOpenRemarksFor}
        candidates={mergedCandidates}
        refetch={refetch}
      />
    </div>
  );
}
