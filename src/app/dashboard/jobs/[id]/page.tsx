"use client";

import {
  DragDropContext,
  Droppable,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { CreateCandidateDialog } from "./components/Dialogs/create-candidate-dialog";
import { CreateLaneDialog } from "./components/Dialogs/create-lane-dialog";
import { CandidateDetailsDialog } from "./components/Dialogs/candidate-details-dialog";
import { initialCandidateColumns } from "./data/initial-data";
import { useParams } from "next/navigation";
import { useFetchJobByIdQuery } from "@/lib/features/job/jobApi";
import { useFetchCandidatesQuery } from "@/lib/features/candidate/candidateApi";
import { Candidate, CandidateColumn, CandidateStatus } from "@/types/candidate";
import LoaderSkeleton from "./components/Lanes/loader-skeleton";
import { useGetLanesQuery } from "@/lib/features/lane/laneApi";
import { User } from "@/lib/features/users/usersApi";
import Cookies from "js-cookie";
import { Breadcrumb } from "./components/Utils/breadcrumb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
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
  const [columns, setColumns] = useState<CandidateColumn[]>(
    initialCandidateColumns
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null
  );
  const [isConfirmLaneDeleteOpen, setIsConfirmLaneDeleteOpen] = useState(false);
  const [laneToDelete, setLaneToDelete] = useState<string | null>(null);
  const [laneToEdit, setLaneToEdit] = useState<string | null>(null);
  const [initialLaneToEdit, setInitialLaneToEdit] = useState<string | null>(
    null
  );
  const [filterConditions, setFilterConditions] = useState<FilterState | null>(
    null
  );

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
  const {
    data: candidatesFromQuery,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(id as string);
  const { data: lanes, isLoading: isLanesLoading } = useGetLanesQuery(
    user?.id || undefined,
    { skip: !user?.id }
  );
  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLaneEditOpen, setIsLaneEditOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);

  const {
    handleAddLane,
    handleDeleteLane,
    handleEditLaneClick,
    handleEditLane,
    handleConfirmDeleteLane,
  } = useKanbanBoard({
    columns,
    setColumns,
    user,
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

      // Update columns
      const lanesArray = updatedLanes || [...lanes.lanes];
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
        const candidates = mergedCandidates.filter(
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
    const token = Cookies.get("token");
    if (token) {
      verifyAndDecryptJWTToken(token).then((decryptedResponse) => {
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Fallback UI
  if (isJobLoading || isCandidatesLoading || isLanesLoading || !lanes) {
    return (
      <>
        <div
          className="h-screen flex flex-col overflow-hidden"
          style={{ width: "100%" }}
        >
          <div className="flex-shrink-0 p-4 pb-2">
            <Skeleton className="w-56 h-[16px] rounded-lg" />
            <Card className="mt-2">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="font-semibold text-lg">
                  <Skeleton className="w-40 h-[16px] rounded-lg" />
                </div>
                <div className="flex items-center space-x-4">
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
                  <div className="flex space-x-2">
                    <CreateLaneDialog onAddLane={handleAddLane} />
                    <CreateCandidateDialog
                      jobId={id as string}
                      isOpen={isDialogOpen}
                      setIsOpen={setIsDialogOpen}
                      resumeFile={droppedFileData}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
          <div className="flex-1 overflow-hidden px-4 pb-4">
            <DragDropContext
              onDragStart={() => setIsDndDragging(true)}
              onDragEnd={(result: any) => {
                setIsDndDragging(false);
                onDragEnd(result);
              }}
            >
              <Droppable droppableId="lanes" direction="horizontal" type="lane">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={mergeRefs([provided.innerRef, scrollRef])}
                    className="h-full flex gap-3 overflow-x-auto"
                  >
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
        <LoaderSkeleton />
      </>
    );
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

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <DragDropContext
          onDragStart={() => setIsDndDragging(true)}
          onDragEnd={(result: any) => {
            setIsDndDragging(false);
            onDragEnd(result);
          }}
        >
          <Droppable droppableId="lanes" direction="horizontal" type="lane">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={mergeRefs([provided.innerRef, scrollRef])}
                className="h-full flex gap-3 overflow-x-auto"
              >
                {columns.map((column, index) => (
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
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
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
        message="This will remove the lane from all the jobs in this organization"
        onConfirm={() => laneToDelete && handleConfirmDeleteLane(laneToDelete)}
        onCancel={() => setIsConfirmLaneDeleteOpen(false)}
      />
    </div>
  );
}
