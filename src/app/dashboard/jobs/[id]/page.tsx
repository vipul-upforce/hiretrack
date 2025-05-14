"use client";

import {
  DragDropContext,
  Droppable,
  DropResult,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { CreateCandidateDialog } from "./components/create-candidate-dialog";
import { CreateLaneDialog } from "./components/create-lane-dialog";
import { CandidateDetailsDialog } from "./components/candidate-details-dialog";
import { initialCandidateColumns } from "./data/initial-data";
import { useParams } from "next/navigation";
import { useFetchJobByIdQuery } from "@/lib/features/job/jobApi";
import {
  useUpdateCandidateMutation,
  useFetchCandidatesQuery,
  useDeleteCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { toast } from "@/hooks/use-toast";
import { Candidate, CandidateColumn, CandidateStatus } from "@/types/candidate";
import LoaderSkeleton from "./components/loader-skeleton";
import {
  useGetLanesQuery,
  useUpdateLanesMutation,
} from "@/lib/features/lane/laneApi";
import { useDeleteLaneMutation } from "@/lib/features/lane/laneApi";
import { User } from "@/lib/features/users/usersApi";
import Cookies from "js-cookie";
import { Breadcrumb } from "./components/breadcrumb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  // useSendMailMutation,
  useSendStatusMailMutation,
} from "@/lib/features/org/orgApi";
import { sentStatusMailHandler } from "@/lib/utils";
import { KanbanColumn } from "./components/KanbanColumn";
import withAuthGuard from "@/components/withAuthGuard";

function JobProgressPage() {
  const id = useParams()?.id as string;

  // const [sendEmail] = useSendMailMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
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
  const [deleteCandidate] = useDeleteCandidateMutation();

  const { data: job, isLoading: isJobLoading } = useFetchJobByIdQuery(
    id as string
  );
  const {
    data: candidates,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(id as string);
  const [updateCandidate] = useUpdateCandidateMutation();
  const { data: lanes, isLoading: isLanesLoading } = useGetLanesQuery(
    user?.id || undefined,
    {
      skip: !user?.id,
    }
  );
  const [updateLanes] = useUpdateLanesMutation();
  const [deleteLane] = useDeleteLaneMutation();
  // Add these new state variables
  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);

  // Get user from cookies when component mounts
  useEffect(() => {
    (async () => {
      const user = Cookies.get("token");
      if (user) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Update columns when candidates data changes
  useEffect(() => {
    if (candidates && lanes) {
      const lanesArray = [...lanes.lanes];

      // Ensure all lanes exist in initialCandidateColumns
      lanesArray.forEach((lane) => {
        if (!initialCandidateColumns.find((item) => item.id === lane)) {
          initialCandidateColumns.push({
            id: lane as CandidateStatus,
            title: lane,
            candidates: [],
          });
        }
      });

      // Create ordered columns with type safety
      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);
        return {
          id: lane as CandidateStatus,
          title: column?.title || lane,
          candidates: candidates.filter(
            (candidate) =>
              candidate.status === lane &&
              (showArchived ? candidate.isDeleted : !candidate.isDeleted)
          ),
        } as CandidateColumn;
      });

      setColumns(updatedColumns);
    }
  }, [candidates, lanes, showArchived]);

  // console.log(columns)

  const updateLanesOrder = async (newColumns: CandidateColumn[]) => {
    const lansArray = newColumns.map((column) => column.id);
    try {
      await updateLanes({
        userId: user?.id || "",
        lanes: lansArray, // Send the new order to the API
      }).unwrap();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, type, draggableId } = result;

    if (!destination) {
      return;
    }

    // Handle lane reordering
    if (type === "lane") {
      const newColumns = [...columns];
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);
      setColumns(newColumns);
      updateLanesOrder(newColumns);
      return;
    }

    if (source.droppableId !== destination.droppableId) {
      setOpenRemarksFor(draggableId);
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find(
      (col) => col.id === destination.droppableId
    );

    if (!sourceColumn || !destColumn) return;

    // Create copies of the columns array and the candidate arrays
    const newColumns = [...columns];
    const sourceColumnIndex = columns.findIndex(
      (col) => col.id === source.droppableId
    );
    const destColumnIndex = columns.findIndex(
      (col) => col.id === destination.droppableId
    );

    const newSourceCandidates = [...sourceColumn.candidates];
    const newDestCandidates =
      source.droppableId === destination.droppableId
        ? newSourceCandidates
        : [...destColumn.candidates];

    const [removed] = newSourceCandidates.splice(source.index, 1);

    // Add the candidate to the destination list
    if (source.droppableId !== destination.droppableId) {
      newDestCandidates.splice(destination.index, 0, {
        ...removed,
        status: destination.droppableId,
      });
    } else {
      newDestCandidates.splice(destination.index, 0, removed);
    }

    newColumns[sourceColumnIndex] = {
      ...sourceColumn,
      candidates: newSourceCandidates,
    };

    if (sourceColumnIndex !== destColumnIndex) {
      newColumns[destColumnIndex] = {
        ...destColumn,
        candidates: newDestCandidates,
      };
    }

    setColumns(newColumns);

    if (source.droppableId !== destination.droppableId) {
      try {
        const updatedCandidate = await updateCandidate({
          _id: draggableId,
          status: destination.droppableId,
        }).unwrap();
        // debugger;
        // sentAssignmentMail(updatedCandidate, sendEmail);
        sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: source.droppableId,
          },
          sendStatusMail
        );
        // debugger;
      } catch {
        setColumns([...columns]);
        toast({
          title: "Error",
          description: "Failed to update candidate status",
          variant: "destructive",
        });
      }
      await refetch();
    }
  };

  // Add onUpdate handler to handle candidate updates
  const handleCandidateUpdate = (updatedCandidate: Candidate) => {
    const newColumns = columns.map((column) => ({
      ...column,
      candidates: column.candidates.map((candidate) =>
        candidate._id === updatedCandidate._id ? updatedCandidate : candidate
      ),
    }));
    setColumns(newColumns);
  };

  const handleAddLane = (title: string) => {
    const newLaneId = title.toLowerCase().replace(/\s+/g, "-");
    const isDuplicate = columns.some((column) => column.id === newLaneId);
    if (isDuplicate) {
      toast({
        title: "Error",
        description: `Lane with title "${title}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    const newLane: CandidateColumn = {
      id: newLaneId as CandidateStatus,
      title,
      candidates: [],
    };
    updateLanesOrder([...columns, newLane]);
    setColumns([...columns, newLane]);
  };

  const handleFileDrop = async (file: File) => {
    setIsDialogOpen(true);
    if (file.type === "application/pdf") {
      setDroppedFileData(file);
    }
  };

  const handleDeleteLane = () => {
    setIsConfirmLaneDeleteOpen(true);
  };
  const handleConfirmDeleteLane = async (laneId: string) => {
    if (!user?.id) return;

    try {
      await deleteLane({
        organizationId: user.organizationId,
        laneId,
      }).unwrap();
      toast({
        title: "Lane deleted",
        description: "Lane deleted successfully",
        variant: "default",
      });
      const newColumns = columns.filter((col) => col.id !== laneId);
      setColumns(newColumns);
      // await refetch();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "data" in err) {
        const errorMessage =
          (err.data as { error: string }).error || "Failed to delete the lane";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const errorMessage = "An unknown error occurred";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    setIsConfirmLaneDeleteOpen(false);
    await refetch();
  };

  const handleDeleteClick = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;

    try {
      if (selectedCandidate) {
        await deleteCandidate(selectedCandidate._id).unwrap();
      }

      setSelectedCandidate(null);
      toast({
        title: "Success",
        description: `Candidate ${selectedCandidate?.isDeleted ? "Unarchived" : "Archived"} successfully`,
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
          description: "Failed to update candidate status",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setCandidateToDelete(null);
    }
  };

  if (isJobLoading || isCandidatesLoading || isLanesLoading) {
    return <LoaderSkeleton />;
  }

  return (
    <div className="space-y-6 overflow-x-hidden" style={{ width: "100%" }}>
      <Breadcrumb
        jobTitle={job?.title}
        links={[{ title: "Jobs", href: "/dashboard/jobs-board" }]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Candidates for {job?.title}</CardTitle>
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

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lanes" direction="horizontal" type="lane">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-flow-col flex flex-row justify-start overflow-x-scroll pb-4"
            >
              {columns.map((column, index) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  index={index}
                  isFileOver={isFileOver}
                  setIsFileOver={setIsFileOver}
                  handleFileDrop={handleFileDrop}
                  handleDeleteLane={handleDeleteLane}
                  setLaneToDelete={setLaneToDelete}
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

      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleCandidateUpdate}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCandidate?.isDeleted
                ? "This will unarchive this candidate. They will be visible in the regular view."
                : "This will archive this candidate. They will be hidden from the regular view."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={
                !selectedCandidate?.isDeleted
                  ? "bg-destructive hover:bg-destructive/90"
                  : "text-blue-500 bg-blue hover:bg-blue hover:text-blue-500/90"
              }
            >
              {selectedCandidate?.isDeleted ? "Unarchive" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isConfirmLaneDeleteOpen}
        onOpenChange={setIsConfirmLaneDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This ill remove the lane from all the jobs in this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                laneToDelete && handleConfirmDeleteLane(laneToDelete)
              }
              className={
                !selectedCandidate?.isDeleted
                  ? "bg-destructive hover:bg-destructive/90"
                  : "text-blue-500 bg-blue hover:bg-blue hover:text-blue-500/90"
              }
            >
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default withAuthGuard(JobProgressPage, {
  requiredRoles: ["admin", "hr"],
  fallbackPath: "/dashboard",
  checkAllowance: false,
  allowAuthenticated: true,
});
