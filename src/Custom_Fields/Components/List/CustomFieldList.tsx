import React, { useCallback, useContext, useState } from "react";
import { CustomFieldsContext } from "../../Context";
import { CustomField } from "../../Types/CustomField";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash, GripVertical } from "lucide-react";
import CustomFieldForm from "../Form/CustomFieldForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

function CustomFieldList() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField>();
  const [orderedFields, setOrderedFields] = useState<CustomField[]>([]);

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
      zIndex: 9999,
      outline: "none",
    };
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
  } = useContext(CustomFieldsContext);

  React.useEffect(() => {
    if (selectedFormId?.fields) {
      const filteredFields = selectedFormId.fields.filter(
        (field) => !field.candidateId && !field.jobId
      );
      setOrderedFields(filteredFields);
    } else {
      setOrderedFields([]);
    }
  }, [selectedFormId?.fields]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    if (selectedFormId) {
      const allFields = selectedFormId.fields;
      const otherFields = allFields.filter(
        (field) => field.candidateId || field.jobId
      );
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

  return (
    <div className="relative w-full">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="custom-fields">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="w-full space-y-2 mt-2"
              style={{
                minHeight: "100px",
                position: "relative",
              }}
            >
              {orderedFields.length === 0 ? (
                <div className="w-full text-center justify-center border-none py-10 text-gray-500">
                  No Global Meta fields
                </div>
              ) : (
                orderedFields.map((field, index) => (
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
                              setIsEditMode(true);
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

                      if (
                        snapshot.isDragging &&
                        typeof window !== "undefined"
                      ) {
                        return createPortal(child, document.body);
                      }

                      return child;
                    }}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <CustomFieldForm
        isOpen={isOpen}
        isEditMode={isEditMode}
        handleClose={() => {
          handleClose();
          setIsEditMode(false);
        }}
        initialValue={selectedField}
        existingFields={selectedFormId?.fields}
      />
    </div>
  );
}

export default React.memo(CustomFieldList);

interface CustomFieldItemProps {
  field: CustomField;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
  handleEditCustomField: () => void;
  handleDeleteCustomField: () => void;
}

export const CustomFieldItem = React.memo(
  ({
    field,
    dragHandleProps,
    isDragging,
    handleEditCustomField,
    handleDeleteCustomField,
  }: CustomFieldItemProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    return (
      <>
        <div className="w-full">
          <Card
            className={`
              w-full transition-all duration-75
              ${
                isDragging
                  ? "shadow-lg ring-2 ring-primary ring-offset-2"
                  : "hover:shadow"
              }
            `}
          >
            <CardHeader className="p-4">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <div
                    {...dragHandleProps}
                    className="rounded-md p-1.5 hover:bg-muted cursor-grab active:cursor-grabbing touch-none select-none"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="capitalize">
                    {field.label.split(" |||||(")[0]}
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  {field.jobId ? (
                    <Badge variant="secondary" className="rounded-full">
                      Job Specific
                    </Badge>
                  ) : null}
                  {field.candidateId ? (
                    <Badge variant="secondary" className="rounded-full">
                      Candidate Specific
                    </Badge>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCustomField()}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="capitalize px-4">
              <div className="flex gap-2 flex-wrap">
                {field.type && <Badge>{field.type}</Badge>}
                {field.persistance && <Badge>{field.persistance}</Badge>}
                {field.required && (
                  <Badge>{field.required ? "Required" : "Optional"}</Badge>
                )}
                {field?.private && <Badge>Hidden from Candidate</Badge>}
                {field?.privateInt && <Badge>Hidden from Interviewer</Badge>}
                {field.defaultValue && <Badge>{field.defaultValue}</Badge>}
                {field.options && <Badge>{field.options.length}</Badge>}
                {field.showOnCard && <Badge>Showing on Card</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent aria-describedby="delete-field-description">
            <DialogHeader>
              <DialogTitle>Delete Meta Field</DialogTitle>
              <DialogDescription id="delete-field-description">
                Are you sure you want to delete the field &quot;
                {field.label.split(" |||||(")[0]}
                &quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteCustomField();
                  setShowDeleteDialog(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

CustomFieldItem.displayName = "CustomFieldItem";
