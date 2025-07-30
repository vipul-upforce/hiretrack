"use client";

import {
  DragDropContext,
  Droppable,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Settings2, BarChart3 } from "lucide-react";
import { CustomFieldsContext } from "@/Custom_Fields/Context";
import CustomFieldDialog from "@/Custom_Fields/Components/Common/CustomFieldDialog";
import Stepper from "@/Custom_Fields/Components/Stepper";
import { useContext, useCallback } from "react";
import { JobAnalyticsModal } from "../../jobs-board/components/JobAnalyticsModal";
// import CandidatesPage from "./CandidatesPage";

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
  const {
    ref: scrollRef,
    setIsDndDragging,
    isDragging,
  } = useDragToScroll<HTMLDivElement>();

  // Initialize useSSE hook with hardcoded role "admin" and jobId
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
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

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
    const token = Cookies.get("token");
    if (token) {
      verifyAndDecryptJWTToken(token).then((decryptedResponse) => {
        console.log("User fetch result:", decryptedResponse);
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

  // Combine candidates from useFetchCandidatesQuery and useSSE
  useEffect(() => {
    if (candidatesFromQuery && lanes) {
      const mergedCandidates = [...candidatesFromQuery];
      // debugger;
      // console.log(
      //   "🙌🙌🙌🙌 ",
      //   mergedCandidates.find((c) => c._id === selectedCandidate?._id)?.history
      // );
      sseCandidates.forEach((sseCandidate) => {
        const index = mergedCandidates.findIndex(
          (c) => c._id === sseCandidate._id
        );
        if (index >= 0) {
          mergedCandidates[index] = sseCandidate;
        } else {
          if (showArchived || !sseCandidate.isDeleted) {
            mergedCandidates.push(sseCandidate);
          }
        }
      });

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

      // Use filtered candidates if available, otherwise use merged candidates
      const candidatesToUse =
        filteredCandidates.length > 0 ? filteredCandidates : mergedCandidates;

      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);
        const candidates = candidatesToUse.filter(
          (candidate) =>
            candidate.status === lane &&
            (showArchived ? candidate.isDeleted : !candidate.isDeleted)
        );
        // if (updateSelectedCandodate) {
        //   handleCandidateUpdate(updateSelectedCandodate);
        // }
        return {
          id: lane as CandidateStatus,
          title: column?.title || lane,
          candidates: candidates,
        } as CandidateColumn;
      });

      setColumns(updatedColumns);
    }
  }, [
    candidatesFromQuery,
    sseCandidates,
    lanes,
    updatedLanes,
    showArchived,
    filteredCandidates,
  ]);

  // Update initialLaneToEdit when laneToEdit is set
  useEffect(() => {
    if (laneToEdit && initialLaneToEdit === null) {
      setInitialLaneToEdit(laneToEdit);
    }
  }, [laneToEdit]);

  // Reset initialLaneToEdit when the edit dialog is closed
  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen]);

  // Fallback UI to ensure div renders
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

          <div className="flex-1 overflow-hidden px-4 pb-2">
            <DragDropContext
              onDragStart={() => setIsDndDragging(true)}
              onDragEnd={(result: any) => {
                // console.log(
                //   "onDragEnd triggered, scrollRef.current:",
                //   scrollRef.current
                // );
                setIsDndDragging(false);
                onDragEnd(result);
              }}
            >
              <Droppable droppableId="lanes" direction="horizontal" type="lane">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={mergeRefs([provided.innerRef, scrollRef])}
                    className="h-full flex gap-0.5 overflow-x-auto"
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
      {/* Header section with breadcrumbs and action buttons */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Breadcrumb
            jobTitle={job?.title}
            links={[{ title: "Jobs", href: "/dashboard/jobs-board" }]}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCustomFieldsOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Personalized form fields
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAnalyticsOpen(true)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
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

      {/* Quick Select and Filter Section */}
      <QuickSelectAndFilter
        currentJobId={id}
        candidates={candidatesFromQuery || []}
        onFilterChange={setFilteredCandidates}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      {/* <CandidatesPage /> */}
      <div className="flex-1 overflow-hidden px-4 pb-2 pt-2">
        <DragDropContext
          onDragStart={() => setIsDndDragging(true)}
          onDragEnd={(result: any) => {
            // console.log(
            //   "onDragEnd triggered, scrollRef.current:",
            //   scrollRef.current
            // );
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
                {columns.map((column, index) => {
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
                    />
                  );
                })}
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
      
      {/* Custom Fields Dialog */}
      <CandidateCustomFieldsDialog 
        isOpen={isCustomFieldsOpen} 
        onClose={() => setIsCustomFieldsOpen(false)} 
      />

      {/* Job Analytics Modal */}
      {job && user && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          job={job}
          organizationId={user.organizationId}
        />
      )}
    </div>
  );
}

// Dialog component that auto-selects candidate form
function CandidateCustomFieldsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const context = useContext(CustomFieldsContext);
  const { setStepName, customFields, stepName, selectedFormId, selecteFormIdTarget } = context;
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  console.log('CandidateCustomFieldsDialog context:', {
    customFieldsKeys: Object.keys(customFields || {}),
    customFieldsCount: Object.keys(customFields || {}).length,
    stepName,
    selectedFormId,
    hasContext: !!context,
    isOpen,
    hasAutoSelected
  });

  // Auto-select candidate form when dialog opens
  useEffect(() => {
    if (isOpen && !hasAutoSelected && customFields && Object.keys(customFields).length > 0) {
      console.log('Attempting to auto-select candidate form...');
      
      // Find the "candidate" form ID
      const candidateFormEntry = Object.entries(customFields).find(
        ([_, form]) => {
          console.log('Checking form:', form.formName, 'normalized:', form.formName.toLowerCase());
          return form.formName.toLowerCase() === 'candidate';
        }
      );
      
      if (candidateFormEntry) {
        const [formId] = candidateFormEntry;
        console.log('Found candidate form, selecting:', formId);
        selecteFormIdTarget(formId);
        setStepName("formCustomFieldList");
        setHasAutoSelected(true);
      } else {
        console.log('No candidate form found, staying on FormList');
        setStepName("FormList");
        setHasAutoSelected(true);
      }
    }
  }, [isOpen, hasAutoSelected, customFields, selecteFormIdTarget, setStepName]);

  const handleClose = useCallback(() => {
    console.log('CandidateCustomFieldsDialog closing, resetting to FormList');
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
