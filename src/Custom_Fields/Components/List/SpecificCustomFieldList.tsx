"use client";

import React, { useCallback, useContext, useState } from "react";
import { CustomFieldsContext } from "../../Context";
import type { CustomField } from "../../Types/CustomField";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DroppableProvided,
  type DraggableProvided,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomFieldItem } from "./CustomFieldList";
import { AddSpecificCustomFieldForm } from "../AddSpecificCustomFieldForm";
import CustomFieldForm from "../Form/CustomFieldForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";

function SpecificCustomFieldList({
  jobId,
  candidateId,
}: {
  jobId?: string;
  candidateId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField>();
  const [orderedFields, setOrderedFields] = useState<CustomField[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [duplicationAlert, setDuplicationAlert] = useState<boolean>(false);
  const [duplicationMessage, setDuplicationMessage] = useState<string>("");
  const handleAddField = () => {
    setFormOpen(true);
  };

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const {
    selectedFormId,
    handleDeleteCustomField,
    setCustomFields,
    customFields,
    handleAddCustomField,
  } = useContext(CustomFieldsContext);

  // Initialize orderedFields when selectedFormId changes
  React.useEffect(() => {
    if (selectedFormId?.fields) {
      const filteredFIelds = selectedFormId.fields.filter(
        (field) =>
          (field.candidateId && field.candidateId === candidateId) ||
          (field.jobId && field.jobId === jobId)
      );
      setOrderedFields(filteredFIelds);
    }
  }, [selectedFormId?.fields]);

  // const onDragEnd = (result: DropResult) => {
  //   if (!result.destination) return;

  //   const items = Array.from(orderedFields);
  //   const [reorderedItem] = items.splice(result.source.index, 1);
  //   items.splice(result.destination.index, 0, reorderedItem);

  //   if (selectedFormId) {
  //     const allFields = selectedFormId.fields;
  //     const otherFields = allFields.filter(
  //       (field) =>
  //         (field.candidateId && field.candidateId === candidateId) ||
  //         (field.jobId && field.jobId === jobId)
  //     );
  //     const reorderedFields = [...items, ...otherFields];

  //     const orderedItems = {
  //       ...customFields,
  //       [selectedFormId.formId]: {
  //         ...selectedFormId,
  //         fields: reorderedFields,
  //       },
  //     };
  //     setCustomFields(orderedItems);
  //   }
  //   setOrderedFields(items);
  // };
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    if (selectedFormId) {
      const allFields = selectedFormId.fields;
      const matchingFields = allFields.filter(
        (field) =>
          (candidateId && field.candidateId === candidateId) ||
          (jobId && field.jobId === jobId)
      );
      const otherFields = allFields.filter(
        (field) =>
          !(
            (candidateId && field.candidateId === candidateId) ||
            (jobId && field.jobId === jobId)
          )
      );
      if (
        JSON.stringify(matchingFields.map((f) => f.id)) !==
        JSON.stringify(orderedFields.map((f) => f.id))
      ) {
        console.warn(
          "orderedFields does not match the expected fields for candidateId/jobId",
          { matchingFields, orderedFields }
        );
        return;
      }
      // Combine reordered fields with other fields
      const reorderedFields = [...items, ...otherFields];

      const orderedItems = {
        ...customFields,
        [selectedFormId.formId]: {
          ...selectedFormId,
          fields: reorderedFields,
        },
      };
      setCustomFields(orderedItems);
    }
    setOrderedFields(items);
  };

  const handleSave = (newField: CustomField) => {
    if (
      selectedFormId?.fields.some(
        (field) =>
          field.label === newField.label && !field.jobId && !field.candidateId
      )
    ) {
      setDuplicationMessage(
        `field already exists with this label, in the global meta fields.`
      );
      setDuplicationAlert(true);

      return;
    }
    if (
      selectedFormId?.fields.some(
        (field) =>
          field.label === newField.label &&
          ((field.jobId && field.jobId === jobId) ||
            (field.candidateId && field.candidateId === candidateId))
      )
    ) {
      // const count = selectedFormId?.fields.filter(
      //   (field) => field.label === newField.label
      // ).length;
      // newField.label += ` (${String(count + 1)})`;
      setDuplicationMessage(
        `field already exists with this label in current ${selectedFormId.formName}.`
      );
      setDuplicationAlert(true);
      return;
    }

    handleAddCustomField(newField, selectedFormId?.formId || "");
    setIsOpen(false);
  };

  // Custom function to handle draggable styling
  const getDraggableStyle = (isDragging: boolean, draggableStyle: any) => {
    if (!isDragging) {
      return draggableStyle;
    }

    return {
      ...draggableStyle,
      position: "fixed" as const,
      top: draggableStyle?.top,
      left: draggableStyle?.left,
      //   width: "50%",
      zIndex: 9999,
      outline: "none",
      border: "none",
    };
  };

  if (formOpen) {
    return (
      <AddSpecificCustomFieldForm
        handleClose={() => setFormOpen(false)}
        onSave={handleSave}
        jobId={jobId}
        candidateId={candidateId}
      />
    );
  }

  //   const filteredFields = orderedFields.filter(
  //     (field) => field.jobId === jobId && field.candidateId === candidateId
  //   );

  return (
    <div className="relative w-full">
      <div className="mb-4 flex justify-end">
        <Button onClick={handleAddField}>
          <Plus className="w-4 h-4 mr-2" />
          Add More Meta Fields
        </Button>
      </div>

      {duplicationAlert && (
        <AlertDialog open={duplicationAlert} onOpenChange={setDuplicationAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplication Alert</AlertDialogTitle>
              <AlertDialogDescription>
                <>
                  This action was not completed because a {duplicationMessage}
                </>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => setDuplicationAlert(false)}
                className={
                  "text-blue-500 bg-blue hover:bg-blue hover:text-blue-500/90"
                }
              >
                {"Okay"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="custom-fields">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="w-full space-y-2"
              style={{
                minHeight: "100px",
                position: "relative",
              }}
            >
              {orderedFields.map((field, index) => {
                if (
                  field.jobId !== jobId ||
                  field.candidateId !== candidateId
                ) {
                  return null;
                }

                return (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(
                      provided: DraggableProvided,
                      snapshot: DraggableStateSnapshot
                    ) => {
                      const child = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="w-full"
                          style={getDraggableStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                        >
                          <CustomFieldItem
                            field={field}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                            handleEditCustomField={() => {
                              setSelectedField(field);
                              handleOpen();
                            }}
                            handleDeleteCustomField={() => {
                              if (selectedFormId?.formId) {
                                handleDeleteCustomField(
                                  field.id,
                                  selectedFormId.formId
                                );
                              }
                            }}
                          />
                        </div>
                      );

                      // Use portal for dragging elements to avoid clipping and render directly on the document.body
                      if (
                        snapshot.isDragging &&
                        typeof window !== "undefined"
                      ) {
                        return createPortal(child, document.body);
                      }

                      return child;
                    }}
                  </Draggable>
                );
              })}

              {orderedFields.length === 0 && (
                <div className="w-full flex items-center justify-center py-8 text-muted-foreground">
                  No Meta fields
                </div>
              )}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <CustomFieldForm
        isOpen={isOpen}
        handleClose={handleClose}
        initialValue={selectedField}
      />
    </div>
  );
}

export default React.memo(SpecificCustomFieldList);
