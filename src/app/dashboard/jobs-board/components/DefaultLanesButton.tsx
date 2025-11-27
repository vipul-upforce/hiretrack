"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Plus,
  X,
  Edit2,
  GripVertical,
  AlertCircle,
  Save,
  Settings,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
import {
  useGetDefaultLanesQuery,
  useUpdateDefaultLanesMutation,
  useAddDefaultLaneMutation,
  useDeleteDefaultLaneMutation,
} from "@/lib/features/lane/laneApi";

interface DefaultLanesButtonProps {
  userRole?: string;
}

interface LaneRestrictions {
  nonEditable: string[];
  nonDeletable: string[];
}

const DefaultLanesButton: React.FC<DefaultLanesButtonProps> = ({
  userRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultLanes, setDefaultLanes] = useState<string[]>([]);
  const [laneRestrictions, setLaneRestrictions] = useState<LaneRestrictions>({
    nonEditable: ["applied", "accepted", "rejected"],
    nonDeletable: ["applied", "accepted", "rejected"],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  // RTK query hooks and states
  const { data, isLoading, isError, error } =
    useGetDefaultLanesQuery(undefined);
  const [updateDefaultLanes, { isLoading: isSaving }] =
    useUpdateDefaultLanesMutation();
  const [addDefaultLane] = useAddDefaultLaneMutation();
  const [deleteDefaultLane] = useDeleteDefaultLaneMutation();

  // Editing state
  const [editingLane, setEditingLane] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newLaneName, setNewLaneName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    lane: string;
    show: boolean;
  }>({ lane: "", show: false });

  // Check if user has permission to manage default lanes
  const canManage = userRole === "admin" || userRole === "hr";

  // Set up portal container
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortalContainer(document.body);
    }
  }, []);

  useEffect(() => {
    if (data) {
      setDefaultLanes(data.defaultLanes || []);
      setLaneRestrictions(
        data.laneRestrictions || {
          nonEditable: ["applied", "accepted", "rejected"],
          nonDeletable: ["applied", "accepted", "rejected"],
        }
      );
    }
  }, [data]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newLanes = Array.from(defaultLanes);
    const [reorderedItem] = newLanes.splice(result.source.index, 1);
    newLanes.splice(result.destination.index, 0, reorderedItem);

    setDefaultLanes(newLanes);
  };

  const startEdit = (lane: string) => {
    if (laneRestrictions.nonEditable.includes(lane)) {
      toast({
        title: "Cannot Edit",
        description: `The "${lane}" lane cannot be edited as it's a system requirement.`,
        variant: "destructive",
      });
      return;
    }
    setEditingLane(lane);
    setEditValue(lane);
  };

  const saveEdit = () => {
    if (!editValue.trim()) {
      toast({
        title: "Invalid Name",
        description: "Lane name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (
      editValue.trim() !== editingLane &&
      defaultLanes.includes(editValue.trim())
    ) {
      toast({
        title: "Duplicate Name",
        description: "A lane with this name already exists",
        variant: "destructive",
      });
      return;
    }

    const newLanes = defaultLanes.map((lane) =>
      lane === editingLane ? editValue.trim() : lane
    );
    setDefaultLanes(newLanes);
    setEditingLane(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingLane(null);
    setEditValue("");
  };

  const confirmDelete = (lane: string) => {
    if (laneRestrictions.nonDeletable.includes(lane)) {
      toast({
        title: "Cannot Delete",
        description: `The "${lane}" lane cannot be deleted as it's a system requirement.`,
        variant: "destructive",
      });
      return;
    }
    setDeleteConfirm({ lane, show: true });
  };

  const saveDefaultLanes = async () => {
    try {
      setSaving(true);
      await updateDefaultLanes(defaultLanes).unwrap();
      toast({
        title: "Success",
        description: "Default lanes updated successfully",
      });
      setIsOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          typeof err === "object" &&
          err !== null &&
          "data" in err &&
          typeof (err as any).data?.message === "string"
            ? (err as any).data.message
            : "Failed to save default lanes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Replace add and delete functions similarly ---
  const addNewLane = async () => {
    try {
      await addDefaultLane(newLaneName.trim()).unwrap();
      setNewLaneName("");
      toast({ title: "Success", description: "Lane added successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description:
          typeof err === "object" &&
          err !== null &&
          "data" in err &&
          typeof (err as any).data?.message === "string"
            ? (err as any).data.message
            : "Failed to add lane",
        variant: "destructive",
      });
    }
  };

  const deleteLane = async () => {
    try {
      await deleteDefaultLane(deleteConfirm.lane).unwrap();
      toast({ title: "Success", description: "Lane removed successfully" });
      setDeleteConfirm({ lane: "", show: false });
    } catch (err) {
      toast({
        title: "Error",
        description:
          typeof err === "object" &&
          err !== null &&
          "data" in err &&
          typeof (err as any).data?.message === "string"
            ? (err as any).data.message
            : "Failed to delete lane",
        variant: "destructive",
      });
    }
  };

  const isRestricted = (lane: string, type: "edit" | "delete") => {
    return type === "edit"
      ? laneRestrictions.nonEditable.includes(lane)
      : laneRestrictions.nonDeletable.includes(lane);
  };

  if (!canManage) {
    return null; // Don't show button if user doesn't have permission
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Settings />
        Default Lanes
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-4xl max-h-[95vh] overflow-y-auto overflow-x-visible"
          onEscapeKeyDown={(e) => {
            // Prevent dialog from closing if we're editing
            if (editingLane || showAddForm) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Default Lanes
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Configure the default workflow lanes that will be applied to new
              jobs. You can reorder, rename, and add lanes, but some system
              lanes cannot be modified.
            </p>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <TooltipProvider delayDuration={0}>
              <div className="space-y-4 h-[500px] overflow-y-auto">
                {/* Lanes List */}
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="default-lanes">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`space-y-2 px-2 ${
                          snapshot.isDraggingOver
                            ? "bg-muted/20 rounded-lg p-2 max-h-[300px] overflow-y-scroll"
                            : `${showAddForm  ? "max-h-[282px]" : "max-h-[305px]"} overflow-y-scroll`
                        }`}
                      >
                        {defaultLanes.map((lane, index) => (
                          <Draggable
                            key={lane}
                            draggableId={lane}
                            index={index}
                          >
                            {(provided, snapshot) => {
                              const draggingComponent = (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    ...(snapshot.isDragging && {
                                      position: "fixed",
                                      zIndex: 9999,
                                      pointerEvents: "none",
                                      transform:
                                        provided.draggableProps.style
                                          ?.transform || "none",
                                    }),
                                  }}
                                >
                                  <div
                                    className={`bg-card border rounded-none transition-all ${
                                      snapshot.isDragging
                                        ? "shadow-2xl bg-white dark:bg-black border-2 border-primary opacity-95 scale-105"
                                        : "shadow-sm hover:shadow-md"
                                    }`}
                                    style={{
                                      ...(snapshot.isDragging && {
                                        width: "320px",
                                        minWidth: "320px",
                                      }),
                                    }}
                                  >
                                    <div className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1">
                                          {editingLane === lane ? (
                                            <div className="flex items-center gap-2">
                                              <Input
                                                value={editValue}
                                                onChange={(e) =>
                                                  setEditValue(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    saveEdit();
                                                  }
                                                  if (e.key === "Escape") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    cancelEdit();
                                                  }
                                                }}
                                                className="h-8"
                                                autoFocus
                                              />
                                              <Button
                                                size="sm"
                                                onClick={saveEdit}
                                                className="h-8 w-8 p-0"
                                                variant="primary"
                                              >
                                                <Save className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={cancelEdit}
                                                className="h-8 w-8 p-0"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`capitalize font-medium text-foreground select-none ${
                                                  !isRestricted(lane, "edit")
                                                    ? "cursor-pointer"
                                                    : "cursor-default"
                                                }`}
                                                onDoubleClick={() =>
                                                  !isRestricted(lane, "edit") &&
                                                  startEdit(lane)
                                                }
                                                title={
                                                  !isRestricted(lane, "edit")
                                                    ? "Double-click to edit"
                                                    : undefined
                                                }
                                              >
                                                {lane}
                                              </span>
                                              {isRestricted(lane, "edit") && (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <AlertCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>
                                                      This column is required
                                                      and cannot be modified
                                                    </p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {!isRestricted(lane, "edit") && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => startEdit(lane)}
                                              className="h-8 w-8 p-0"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                          {!isRestricted(lane, "delete") && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                confirmDelete(lane)
                                              }
                                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );

                              // Use portal for dragging items to ensure visibility
                              if (snapshot.isDragging && portalContainer) {
                                return createPortal(
                                  draggingComponent,
                                  portalContainer
                                );
                              }

                              return draggingComponent;
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {/* Add New Lane */}
                {showAddForm ? (
                  <div className="bg-card border rounded-none">
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="newLane" className="sr-only">
                          New Lane Name
                        </Label>
                        <Input
                          id="newLane"
                          placeholder="Enter lane name"
                          value={newLaneName}
                          onChange={(e) => setNewLaneName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addNewLane();
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowAddForm(false);
                              setNewLaneName("");
                            }
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button onClick={addNewLane} size="sm" variant="primary">
                          Add
                          <Plus className="h-4 w-4"  />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddForm(false);
                            setNewLaneName("");
                          }}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex justify-center items-center">
                    <Button
                      variant="primary"
                      onClick={() => setShowAddForm(true)}
                      className="w-[96%] border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Lane
                    </Button>
                  </div>
                )}

                {/* Info */}
                <div className="bg-muted/50 p-3 rounded-none">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="space-y-1 text-xs">
                        <li>
                          These default lanes will be applied to all new jobs
                        </li>
                        <li>
                          System lanes (Applied, Accepted, Rejected) cannot be
                          modified
                        </li>
                        <li>
                          Existing jobs will continue using their current lanes
                        </li>
                        <li>
                          Individual jobs can override these defaults if needed
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={saveDefaultLanes}
              disabled={saving || loading}
              variant="primary"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.show}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, show: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lane</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deleteConfirm.lane}" lane?
              This will remove it from the default lanes for new jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteLane}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DefaultLanesButton;
