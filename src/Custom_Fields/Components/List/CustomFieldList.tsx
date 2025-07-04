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

function CustomFieldList() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField>();
  const [orderedFields, setOrderedFields] = useState<CustomField[]>([]);

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

  // Initialize orderedFields when selectedFormId changes
  React.useEffect(() => {
    if (selectedFormId?.fields) {
      setOrderedFields(selectedFormId.fields);
    }
  }, [selectedFormId?.fields]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // debugger
    if (selectedFormId) {
      const orderedItems = {
        ...customFields,
        [selectedFormId.formId]: {
          ...selectedFormId,
          fields: items,
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
              className="w-full"
            >
              {orderedFields.map((field, index) => (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(
                    provided: DraggableProvided,
                    snapshot: DraggableStateSnapshot
                  ) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="mb-2 w-full"
                      style={{
                        ...provided.draggableProps.style,
                        left: 0,
                        right: 0,
                        width: "100%",
                      }}
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
                  )}
                </Draggable>
              ))}
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

export default React.memo(CustomFieldList);

interface CustomFieldItemProps {
  field: CustomField;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
  handleEditCustomField: () => void;
  handleDeleteCustomField: () => void;
}

const CustomFieldItem = React.memo(
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
                  <CardTitle className="capitalize">{field.label}</CardTitle>
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
              <div className="flex gap-2">
                {field.type && <Badge>{field.type}</Badge>}
                {field.persistance && <Badge>{field.persistance}</Badge>}
                {field.required && (
                  <Badge>{field.required ? "Required" : "Optional"}</Badge>
                )}
                <Badge>{field?.private ? "Private" : "Public"}</Badge>
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
                Are you sure you want to delete the field &quot;{field.label}
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
